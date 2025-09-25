// src/conversations/conversations.controller.ts
// УДАЛИ: import { Request } from 'express';
import { Controller, Post, Get, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ConversationsService } from './conversations.service';

@Controller('api/v1/conversations')
export class ConversationsController {
    constructor(private readonly service: ConversationsService) {}

    @UseGuards(JwtGuard)
    @Post(':projectId/contact')
    contact(@Param('projectId') projectId: string, @Req() req: any) {
        return this.service.contact(projectId, req.user.userId);
    }

    @UseGuards(JwtGuard)
    @Get(':projectId')
    list(@Param('projectId') projectId: string, @Req() req: any) {
        return this.service.listByProject(projectId, req.user.userId);
    }

    @UseGuards(JwtGuard)
    @Get('messages/:conversationId')
    msgs(@Param('conversationId') id: string, @Query() q: any) {
        return this.service.listMessages(id, Number(q.page ?? 1), Number(q.limit ?? 30));
    }

    @UseGuards(JwtGuard)
    @Post('messages/:conversationId')
    send(@Param('conversationId') id: string, @Req() req: any, @Body() dto: { text: string }) {
        return this.service.sendMessage(id, req.user.userId, dto.text);
    }
}
