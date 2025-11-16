import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { FastifyRequest } from 'fastify';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { promises as fsp } from 'fs';
import { MinioService } from '../minio/minio.service';


@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService
  ) {}

  private async ensureUser(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!u) throw new NotFoundException('User not found');
  }

  async uploadMyAvatar(userId: string, req: any) {

    await this.ensureUser(userId);
    const data = await req.file();

    const { filename, mimetype, file, fields } = data;

    if (!mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image/* files are allowed');
    }

    const safeExt = extname(filename || '') || '';
    const newName = `${Date.now()}-${randomUUID()}${safeExt}`;
    const objectName = `avatars/${userId}/${newName}`;

    // читаем поток в Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file as any) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const buffer = Buffer.concat(chunks);

    // грузим в MinIO
    await this.minio.uploadBuffer(
      objectName,
      buffer,
      mimetype || 'application/octet-stream',
    );
    const att = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatarUrl:objectName,
      },
    });
    // публичный URL, с которым фронт уже умеет работать
    const publicUrl = await this.minio.getPublicUrl(objectName);

    // создать запись Attachment
    // const att = await this.prisma.attachment.create({
    //   data: {
    //     projectId,
    //     url: publicUrl,
    //     mime: mimetype,
    //     sortOrder,
    //   },
    // });

    return { ...att, url: publicUrl };
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

  async changeCity(userId: string, cityId: string) {
    console.log('changeCity() called:', { userId, cityId });
    await this.ensureUser(userId);

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { cityId },
        select: { id: true, cityId: true, City: { select: { id: true, nameRu: true } } },
      });
      console.log('✅ updated:', updated);
      return updated;
    } catch (err: any) {
      console.error('❌ Prisma error in changeCity:', err);
      throw err;
    }
  }

  async changeCityForContractor(userId: string, cityId: string) {
    console.log('changeCity() called:', { userId, cityId });
    await this.ensureUser(userId);

    try {
      await this.changeCity(userId, cityId)
      const updated = await this.prisma.contractor.update({
        where: { userId: userId },
        data: { cityId },
        select: { id: true, cityId: true, city: { select: { id: true, nameRu: true } } },
      });
      console.log('✅ updated:', updated);
      return updated;
    } catch (err: any) {
      console.error('❌ Prisma error in changeCity:', err);
      throw err;
    }
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
