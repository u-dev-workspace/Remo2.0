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
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBody,
} from '@nestjs/swagger';
// если у тебя есть DTO на уведомление — подключи его
// import { NotificationDto } from './dto/notification.dto';

@ApiTags('Notification')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtGuard)
@Controller('notification')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Получить уведомления текущего пользователя',
    description:
      'Возвращает список уведомлений для текущего пользователя. Можно отфильтровать только непрочитанные уведомления.',
  })
  @ApiQuery({
    name: 'onlyUnread',
    required: false,
    type: Boolean,
    description: 'Если true — вернуть только непрочитанные уведомления',
    example: true,
  })
  @ApiOkResponse({
    description: 'Список уведомлений пользователя',
    // замени на свой DTO:
    // type: NotificationDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Пользователь не авторизован или токен недействителен',
  })
  async myNotifications(
    @Req() req: any,
    @Query('onlyUnread') onlyUnread?: string,
  ) {
    const userId = req.user?.id;
    return this.notifications.getForUser(userId, onlyUnread === 'true');
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Отметить уведомление как прочитанное',
    description:
      'Помечает указанное уведомление как прочитанное для текущего пользователя.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID уведомления',
    example: 'clz123abc456',
  })
  @ApiOkResponse({
    description: 'Уведомление успешно помечено как прочитанное',
    // type: NotificationDto,
  })
  @ApiBadRequestResponse({
    description:
      'Некорректный запрос (например, уведомление не принадлежит пользователю или уже обработано)',
  })
  @ApiUnauthorizedResponse({
    description: 'Пользователь не авторизован или токен недействителен',
  })
  async markRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    return this.notifications.markRead(userId, id);
  }

  @Post(':id/respond')
  @ApiOperation({
    summary: 'Ответить на алерт/уведомление',
    description:
      'Используется для алертов, которые требуют решения (например, принять/отклонить).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID уведомления/алерта',
    example: 'clz123abc456',
  })
  @ApiBody({
    description: 'Решение по уведомлению (например: accept / reject)',
    type: RespondAlertDto,
  })
  @ApiOkResponse({
    description: 'Решение по уведомлению успешно сохранено',
    // type: NotificationDto, // или объект с результатом
  })
  @ApiBadRequestResponse({
    description:
      'Некорректный запрос (например, некорректное значение decision или алерт уже обработан)',
  })
  @ApiNotFoundResponse({
    description: 'Уведомление не найдено или не принадлежит пользователю',
  })
  @ApiUnauthorizedResponse({
    description: 'Пользователь не авторизован или токен недействителен',
  })
  async respond(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: RespondAlertDto,
  ) {
    const userId = req.user?.id;
    return this.notifications.respondToAlert(userId, id, body.decision);
  }
}
