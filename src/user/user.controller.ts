import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Req,
  Param,
  UseGuards, UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiProperty, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../common/guards/jwt.guard';
import { UserService } from './user.service';

class UploadAvatarDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Файл аватарки' })
  file!: any;
}

class SetAvatarUrlDto {
  @ApiProperty({ type: 'string', description: 'Готовый публичный URL' })
  avatarUrl!: string;
}

@ApiTags('users')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtGuard)
@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** Загрузка аватарки текущего пользователя (multipart/form-data, Fastify) */
  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  async uploadMyAvatar(@Req() req: FastifyRequest & { user?: any }) {
    if (!req.user?.id) {
      // если guard не проставил user
      throw new UnauthorizedException('No user in request');
    }
    return this.userService.uploadMyAvatar(req?.user?.id, req);
  }


  /** Установка аватарки по готовому URL */
  @Post('me/avatar-url')
  @ApiBody({ type: SetAvatarUrlDto })
  async setMyAvatarUrl(@Body() body: SetAvatarUrlDto, @Req() req: any) {
    return this.userService.setMyAvatarUrl(req.user.userId, body.avatarUrl);
  }

  /** Очистить аватарку */
  @Delete('me/avatar')
  async clearMyAvatar(@Req() req: any) {
    return this.userService.clearMyAvatar(req.user.userId);
  }

  /** (опционально) Редирект на аватар конкретного пользователя */
  @Get(':userId/avatar/download')
  async downloadAvatar(
    @Param('userId') userId: string,
    @Req() req: FastifyRequest,
  ) {
    const url = await this.userService.getUserAvatarUrl(userId);
    const reply = (req as any).reply as FastifyReply;
    if (url) return reply.redirect(url);
    return reply.code(204).send();
  }
}
