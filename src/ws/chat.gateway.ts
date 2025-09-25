import { WebSocketGateway, OnGatewayInit, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConversationsService } from '../conversations/conversations.service';

@WebSocketGateway({ namespace: '/ws', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayInit {
    constructor(private jwt: JwtService, private conv: ConversationsService) {}
    afterInit(server: Server) {
        server.use((socket, next) => {
            const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
            try { socket.data.user = this.jwt.verify(token); next(); } catch { next(new Error('Unauthorized')); }
        });
    }

    @SubscribeMessage('message:send')
    async onSend(@ConnectedSocket() socket: Socket, @MessageBody() payload:{conversationId:string;text:string}) {
        const senderId = socket.data.user?.sub;
        const msg = await this.conv.sendMessage(payload.conversationId, senderId, payload.text);
        socket.nsp.emit(`message:new:${payload.conversationId}`, msg);
        return { ok: true };
    }
}
