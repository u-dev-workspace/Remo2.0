import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Req,
  UseGuards,
  Query,
  Post,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RespondAlertDto } from './dto/respond-alert.dto';

@Controller('notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async myNotifications(
    @Req() req: any,
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    const userId = req.user?.id;
    return this.notifications.getForUser(userId, onlyUnread === 'true');
  }

  @Patch(':id/read')
  async markRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    return this.notifications.markRead(userId, id);
  }

  @Post(':id/respond')
  async respond(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: RespondAlertDto,
  ) {
    const userId = req.user?.id;
    return this.notifications.respondToAlert(userId, id, body.decision);
  }
}
