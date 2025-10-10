// src/conversations/chat.gateway.ts
import {
  WebSocketGateway, OnGatewayInit, SubscribeMessage,
  MessageBody, ConnectedSocket, WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConversationsService } from './conversations.service';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  namespace: '/ws',
  path: '/socket.io',                  // фиксируем явный путь
  cors: { origin: true, credentials: true },
})
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly conv: ConversationsService,
  ) {}

  afterInit(server: Server) {
    console.log('[WS] ChatGateway init');

    // middleware авторизации — НЕ роняем сервер
    server.use((socket: Socket, next) => {
      try {
        const header = (socket.handshake.headers.authorization as string) || '';
        const token =
          socket.handshake.auth?.token ||
          (header.startsWith('Bearer ') ? header.slice(7) : undefined);

        if (!token) return next(new Error('Unauthorized'));

        const payload: any = this.jwt.verify(token); // секрет берёт стратегия/модуль
        (socket.data as any).user = {
          userId: payload.userId || payload.sub, // поддержим оба варианта
          role: payload.role,
        };
        next();
      } catch (e) {
        return next(new Error('Unauthorized'));
      }
    });
  }

  private room(id: string) {
    return `conversation:${id}`;
  }

  @SubscribeMessage('conversation:join')
  async onJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const userId = (socket.data as any)?.user?.userId;
    const conv = await this.conv.findByIdWithParticipants(body.conversationId);
    if (!conv) return socket.emit('error', { code: 'CONVERSATION_NOT_FOUND' });

    const isParticipant = userId === conv.clientId || userId === conv.contractor.userId;
    if (!isParticipant) return socket.emit('error', { code: 'ACCESS_DENIED' });

    socket.join(this.room(body.conversationId));
    socket.emit('conversation:joined', { conversationId: body.conversationId });
    console.log('[WS] joined', { userId, conversationId: body.conversationId });
  }

  @OnEvent('conversation.message.created')
  handleMessageCreated(p) {
    console.log('[WS] message:new to', `conversation:${p.conversationId}`);
    this.server.to(`conversation:${p.conversationId}`).emit('message:new', p.message);
  }

}
