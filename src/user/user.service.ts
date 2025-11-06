import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { FastifyRequest } from 'fastify';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { promises as fsp } from 'fs';


@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUser(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!u) throw new NotFoundException('User not found');
  }

  async uploadMyAvatar(userId: string, req: FastifyRequest) {
    await this.ensureUser(userId);

    // 1) файл из fastify-multipart
    let mp: any;
    try {
      mp = await (req as any).file(); // один файл
    } catch (e: any) {
      // если плагин не зарегистрирован или конфликт boundary
      throw new BadRequestException('Multipart is not enabled or invalid form-data: ' + (e?.message || ''));
    }
    if (!mp) throw new BadRequestException('file is required (field name: "file")');

    const { filename, mimetype } = mp;
    if (!mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image/* files are allowed');
    }

    // 2) читаем в буфер (надёжнее, чем стрим-пайп на Windows)
    const buffer: Buffer = await mp.toBuffer();
    if (!buffer?.length) throw new BadRequestException('Empty file');

    // (опционально) лимит размера, если нужно
    // const MAX = 10 * 1024 * 1024; if (buffer.length > MAX) throw new BadRequestException('File too large');

    // 3) сохраняем на диск
    const safeExt = extname(filename || '') || '';
    const newName = `${Date.now()}-${randomUUID()}${safeExt}`;
    const dir = join(process.cwd(), 'uploads', 'avatars', userId);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(join(dir, newName), buffer);

    // 4) публичный URL (должен соответствовать fastifyStatic prefix)
    const publicUrl = `/uploads/avatars/${userId}/${newName}`;

    // 5) обновляем User.avatarUrl
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
      select: { id: true, avatarUrl: true },
    });
  }

  /** Установка аватарки по готовому URL (если файл уже загружен другим способом) */
  async setMyAvatarUrl(userId: string, avatarUrl: string) {
    await this.ensureUser(userId);
    if (!avatarUrl) throw new BadRequestException('avatarUrl is required');

    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
  }

  /** Очистка аватарки (avatarUrl -> null). Удаление файла — опционально. */
  async clearMyAvatar(userId: string) {
    await this.ensureUser(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: { id: true, avatarUrl: true },
    });
  }

  /** Получить текущий avatarUrl пользователя (для редиректа/проверки) */
  async getUserAvatarUrl(userId: string): Promise<string | null> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!u) throw new NotFoundException('User not found');
    return u.avatarUrl ?? null;
  }


}
