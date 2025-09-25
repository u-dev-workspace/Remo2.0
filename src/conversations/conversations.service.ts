import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
    constructor(private prisma: PrismaService) {}

    // contractor нажимает "Связаться": создаём или возвращаем диалог
    async contact(projectId:string, contractorId:string) {
        const project = await this.prisma.project.findUnique({ where:{ id: projectId } });
        if (!project) throw new Error('PROJECT_NOT_FOUND');
        const clientId = project.clientId;

        return this.prisma.conversation.upsert({
            where: { projectId_clientId_contractorId: { projectId, clientId, contractorId } },
            update: {},
            create: { projectId, clientId, contractorId },
        });
    }

    listByProject(projectId:string, userId:string) {
        return this.prisma.conversation.findMany({
            where: { projectId, OR: [{clientId: userId},{contractorId: userId}] },
            orderBy: { id: 'desc' }
        });
    }

    async sendMessage(conversationId:string, senderId:string, text:string) {
        const conv = await this.prisma.conversation.findUnique({ where:{ id: conversationId }});
        if (!conv || (conv.clientId !== senderId && conv.contractorId !== senderId)) throw new Error('ACCESS_DENIED');
        const msg = await this.prisma.message.create({
            data: { conversationId, senderId, text }
        });
        return msg;
    }

    listMessages(conversationId:string, page=1, limit=30) {
        return this.prisma.message.findMany({
            where: { conversationId }, orderBy: { createdAt: 'asc' },
            skip: (page-1)*limit, take: limit
        });
    }
}
