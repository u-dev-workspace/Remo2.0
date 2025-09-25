import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { ChatGateway } from '../ws/chat.gateway';
import { AuthModule } from '../auth/auth.module'; // чтобы JwtService был доступен

@Module({
    imports: [AuthModule],            // JwtService приходит из AuthModule (он экспортирует JwtModule)
    controllers: [ConversationsController],
    providers: [ConversationsService, ChatGateway],
    exports: [ConversationsService],  // (на будущее) если где-то ещё понадобится
})
export class ConversationsModule {}
