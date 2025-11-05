import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Conversation, Message, Prisma } from '@prisma/client';

import now = jest.now;
import { NotificationsService } from '../notifications/notifications.service';
type ListConversationsParams = {
    role?: 'client' | 'contractor';
    take?: number;
    cursor?: string; // conversationId
};
@Injectable()
export class ConversationsService {

    constructor(
      private readonly prisma: PrismaService,
      private readonly events: EventEmitter2,
      private readonly notifications: NotificationsService,
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

        await this.notifications.createInfo(conversation.clientId, {title: "Новый исполнитель", data: {chatId: conversation.id},
            message: 'Вашим проектом заинтересовался новый исполнитель'})

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

    async startConversation(
      projectId: string,
      contractorId: string,
      clientUserId: string,
      text?: string,
    ): Promise<{ conversation: Conversation; firstMessage: Message | null }> {
        // 1) проект принадлежит клиенту
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            select: { id: true, clientId: true },
        });
        if (!project) throw new NotFoundException('Project not found');
        if (project.clientId !== clientUserId) throw new ForbiddenException('You are not the owner of this project');

        // 2) существует ли подрядчик
        const contractor = await this.prisma.contractor.findUnique({
            where: { id: contractorId },
            select: { id: true },
        });
        if (!contractor) throw new NotFoundException('Contractor not found');

        // 3) upsert беседы по уникальному триплету
        const conversation = await this.prisma.conversation.upsert({
            where: {
                projectId_clientId_contractorId: { projectId, clientId: clientUserId, contractorId },
            },
            update: {},
            create: { projectId, clientId: clientUserId, contractorId },
        });

        this.events.emit('conversation.created', {
            conversationId: conversation.id, projectId, clientId: clientUserId, contractorId,
        });

        // 4) опциональное первое сообщение
        let message: Message | null = null;
        if (text && text.trim().length) {

            message = await this.prisma.message.create({
                data: { conversationId: conversation.id, senderId: clientUserId, text: text.trim() },
            });
            this.events.emit('conversation.message.created', { conversationId: conversation.id, message });
        }

        return { conversation, firstMessage: message };
    }

    async listMyConversations(userId: string, params: ListConversationsParams) {
        const take = Math.min(Math.max(Number(params.take) || 20, 1), 100);

        const where: Prisma.ConversationWhereInput =
          params.role === 'client'
            ? { clientId: userId }
            : params.role === 'contractor'
              ? { contractor: { userId } }
              : { OR: [{ clientId: userId }, { contractor: { userId } }] };

        type Row = Prisma.ConversationGetPayload<{
            select: {
                id: true;
                projectId: true;
                clientId: true;
                contractorId: true;
                project: { select: { id: true; title: true; coverAttachmentId: true } };
                client: { select: { id: true; name: true; avatarUrl: true } };
                contractor: {
                    select: {
                        id: true;
                        user: { select: { id: true; name: true; avatarUrl: true } };
                    };
                };
                messages: {
                    select: {
                        id: true;
                        createdAt: true;
                        senderId: true;
                        text: true;
                        attachmentUrl: true;
                        readAt: true;
                    };
                };
            };
        }>;

        const rows: Row[] = await this.prisma.conversation.findMany({
            where,
            take,
            // тут ИСПОЛЬЗУЕМ реальное поле модели, например createdAt
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                projectId: true,
                clientId: true,
                updatedAt: true,
                contractorId: true,
                project: { select: { id: true, title: true, coverAttachmentId: true } },
                client: { select: { id: true, name: true, avatarUrl: true } },
                contractor: {
                    select: {
                        id: true,
                        user: { select: { id: true, name: true, avatarUrl: true } },
                    },
                },
                messages: {
                    select: {
                        id: true,
                        createdAt: true,
                        senderId: true,
                        text: true,
                        attachmentUrl: true,
                        readAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1, // берём только последний месседж
                },
            },
        });

        const convIds = rows.map((c) => c.id);
        if (!convIds.length) return [];

        // один запрос, который считает непрочитанные по всем диалогам сразу
        const unreadGrouped = await this.prisma.message.groupBy({
            by: ['conversationId'],
            where: {
                conversationId: { in: convIds },
                readAt: null,
                senderId: { not: userId },
            },
            _count: { _all: true },
        });

        const unreadMap = new Map<string, number>(
          unreadGrouped.map((row) => [row.conversationId, row._count._all]),
        );

        // мапим в результат, добавляя unread
        const conversationsWithUnread = rows.map((conv) => ({
            ...conv,
            unread: unreadMap.get(conv.id) ?? 0,
        }));

        return conversationsWithUnread;
    }

    async readMessage(messageId: string){


        return  await this.prisma.message.update({
            where: {
                id: messageId,
            },
            data:{
                readAt: new Date(),
            }
        })
    }

    async updateChat(chatId: string){

        return  await this.prisma.conversation.update({
            where: {
                id: chatId,
            },
            data:{
                updatedAt: new Date(),
            }
        })
    }

    async getLastChats(userId: string) {
        return await this.prisma.conversation.findMany({
            where: {
                clientId: userId,
            },
            take: 2,
            orderBy: {
                updatedAt: 'desc', // последние обновленные
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1, // только последнее сообщение
                },
                project: {
                    select: {
                        id: true,
                        title: true,
                        coverAttachment: true,
                    },
                },
                contractor: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
                client: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
        });
    }


    async listMessagesTimeline(
      conversationId: string,
      userId: string,
      take = 50,
      cursor?: string,
    ) {
        // 0) Проверка доступа
        const conv = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { id: true, clientId: true, contractor: { select: { userId: true } } },
        });
        if (!conv) throw new NotFoundException('Conversation not found');
        if (conv.clientId !== userId && conv.contractor.userId !== userId) {
            throw new ForbiddenException('Not allowed for this conversation');
        }

        const _take = Math.min(Math.max(Number(take) || 50, 1), 100);

        // 1) Если курсор передали — проверим, что это валидный message.id в этом разговоре
        let cursorClause: any = undefined;
        if (cursor) {
            const cursorMsg = await this.prisma.message.findFirst({
                where: { id: cursor, conversationId },
                select: { id: true },
            });
            if (cursorMsg) {
                cursorClause = { cursor: { id: cursor }, skip: 1 };
            }
            // если курсор не найден/не из этой беседы — проигнорируем его (вернём первую страницу)
        }

        // 2) Выдаём сообщения по времени (ASC)
        const items = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], // стабильный порядок
            take: _take,
            ...cursorClause,
            select: {
                id: true,
                createdAt: true,
                senderId: true,
                text: true,
                attachmentUrl: true,
                readAt: true,
            },
        });

        const nextCursor = items.length === _take ? items[items.length - 1].id : null;

        return { items, nextCursor };
    }
    async getUnreadCountForUser(userId: string | undefined) {
        if (!userId) {
            throw new BadRequestException('User not resolved from token');
        }

        const unread = await this.prisma.message.count({
            where: {
                readAt: null,              // ещё не прочитано
                senderId: { not: userId }, // не считаем собственные сообщения
                conversation: {
                    OR: [
                        { clientId: userId },               // я — клиент
                        { contractor: { userId: userId } }, // я — исполнитель (по userId у Contractor)
                    ],
                },
            },
        });

        return { unread };
    }

    async getUnreadCountForChat(chatId: string | undefined, userId: string | undefined) {
        if (!userId) {
            throw new BadRequestException('User not resolved from token');
        }

        const unread = await this.prisma.message.count({
            where: {
                readAt: null,              // ещё не прочитано
                senderId: { not: userId }, // не считаем собственные сообщения
                conversation: {
                    id: chatId,
                    OR: [
                        { clientId: userId },               // я — клиент
                        { contractor: { userId: userId } }, // я — исполнитель (по userId у Contractor)
                    ],
                },
            },
        });

        return { unread };
    }
}
