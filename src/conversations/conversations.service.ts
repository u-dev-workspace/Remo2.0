import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ConversationsService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly events: EventEmitter2,
    ) {}

    /**
     * Создать/получить диалог между клиентом проекта и подрядчиком (по userId подрядчика).
     * projectId — ID проекта
     * contractorUserId — ID пользователя-подрядчика (из JWT)
     */
    async contact(projectId: string, contractorUserId: string) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, clientId: true },
        });
        if (!project) throw new NotFoundException('PROJECT_NOT_FOUND');

        // Находим Contractor по userId (он уникален)
        const contractor = await this.prisma.contractor.findUnique({
            where: { userId: contractorUserId },
            select: { id: true },
        });
        if (!contractor) throw new NotFoundException('CONTRACTOR_NOT_FOUND');

        const conversation = await this.prisma.conversation.upsert({
            where: {
                projectId_clientId_contractorId: {
                    projectId: project.id,
                    clientId: project.clientId,
                    contractorId: contractor.id,
                },
            },
            update: {},
            create: {
                projectId: project.id,
                clientId: project.clientId,
                contractorId: contractor.id,
            },
        });

        return conversation;
    }

    async findById(conversationId: string) {
        return this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
    }

    /** Удобно для проверок участия: возвращаем clientId и contractor.userId */
    async findByIdWithParticipants(conversationId: string) {
        return this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: {
                id: true,
                clientId: true,
                contractor: { select: { userId: true } },
            },
        });
    }

    async listMessages(conversationId: string, page = 1, limit = 30) {
        const conv = await this.findById(conversationId);
        if (!conv) throw new NotFoundException('CONVERSATION_NOT_FOUND');

        const skip = (page - 1) * limit;

        return this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            skip,
            take: limit,
            include: {
                sender: {
                    select: { id: true, email: true, name: true, avatarUrl: true }, // <- без displayName
                },
            },
        });
    }

    async sendMessage(conversationId: string, senderUserId: string, text: string) {
        const conv = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: {
                id: true,
                clientId: true,
                contractor: { select: { userId: true } }, // <- нужно userId подрядчика
            },
        });
        if (!conv) throw new NotFoundException('CONVERSATION_NOT_FOUND');

        const isParticipant =
          senderUserId === conv.clientId || senderUserId === conv.contractor.userId;

        if (!isParticipant) throw new ForbiddenException('ACCESS_DENIED');

        const message = await this.prisma.message.create({
            data: { conversationId, senderId: senderUserId, text },
            include: {
                sender: {
                    select: { id: true, email: true, name: true, avatarUrl: true }, // <- без displayName
                },
            },
        });

        // Событие для сокетов
        this.events.emit('conversation.message.created', {
            conversationId,
            message,
        });
        console.log('[EMIT] conversation.message.created', conversationId);


        return message;
    }
}
