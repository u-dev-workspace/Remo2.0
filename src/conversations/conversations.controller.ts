import {
    Controller, Get, Post, Param, Body, UseGuards, Req, Query, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ConversationsService } from './conversations.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages.query.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
@ApiTags('Conversation')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtGuard)
@Controller('api/v1/conversations')
export class ConversationsController {
    constructor(private readonly service: ConversationsService) {}

    @Post(':projectId/contact')
    async contact(@Param('projectId') projectId: string, @Req() req: any) {
        return this.service.contact(projectId, req.user?.id);
    }

    @Get('messages/:conversationId')
    async list(
      @Param('conversationId') conversationId: string,
      @Query(new ValidationPipe({ transform: true })) query: ListMessagesQueryDto,
    ) {
        const { page, limit } = query;
        const items = await this.service.listMessages(conversationId, page, limit);
        return { items, page, limit };
    }

    @Post('messages/:conversationId')
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    async send(
      @Param('conversationId') conversationId: string,
      @Body() dto: CreateMessageDto,
      @Req() req: any,
    ) {
        return this.service.sendMessage(conversationId, req.user?.id, dto.text);
    }
}
