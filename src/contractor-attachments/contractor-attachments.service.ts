import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import type { FastifyRequest } from 'fastify';
import { basename } from 'path';
import { MinioService } from '../minio/minio.service';

type SaveStreamArgs = {
  contractorId: string;
  filename: string;
  mimetype?: string;
  fileStream: Readable;
};

@Injectable()
export class ContractorAttachmentsService {
  // Папка внутри бакета MinIO
  private folder = 'contractors';

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  /**
   * Определяем contractorId текущего пользователя.
   */
  async resolveContractorId(user: any): Promise<string> {
    if (user?.contractorId) return String(user.contractorId);
    if (!user?.id)
      throw new ForbiddenException(
        'Нет идентификатора пользователя в токене',
      );

    const contractor = await this.prisma.contractor.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!contractor)
      throw new ForbiddenException(
        'Для этого пользователя не найден профиль подрядчика',
      );
    return contractor.id;
  }

  /**
   * Вспомогательная функция: читаем Readable в Buffer
   * (для картинок это ок, обычно они не гигантские).
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Сохранить файл подрядчика:
   *  - читаем stream в Buffer
   *  - загружаем в MinIO
   *  - пишем запись в contractorAttachment
   */
  async saveStreamFile({
                         contractorId,
                         filename,
                         mimetype,
                         fileStream,
                       }: SaveStreamArgs) {
    if (!fileStream) throw new BadRequestException('Пустой файл');

    const safeName =
      filename?.replace(/[^\p{L}\p{N}\.\-_ ]/gu, '_') || 'file';
    const unique = `${Date.now()}_${randomUUID()}`.slice(0, 36);
    const finalName = `${unique}_${safeName}`;

    // Ключ объекта в MinIO: contractors/{contractorId}/{finalName}
    const objectName = `${this.folder}/${contractorId}/${finalName}`;
    const buffer = await this.streamToBuffer(fileStream);
    const size = buffer.length;
    const contentType = mimetype || 'application/octet-stream';

    // Сначала грузим в MinIO
    await this.minio.uploadBuffer(objectName, buffer, contentType);

    // Потом сохраняем запись в БД
    const rec = await this.prisma.contractorAttachment.create({
      data: {
        contractorId,
        filename: safeName,
        // В path теперь храним именно ключ в MinIO
        path: objectName,
        mimetype: mimetype || null,
        size,
      },
    });

    return rec;
  }

  async getFilesByContractor(contractorId: string) {
    return this.prisma.contractorAttachment.findMany({
      where: { contractorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFileForContractor(id: string, contractorId: string) {
    const file = await this.prisma.contractorAttachment.findUnique({
      where: { id },
    });
    if (!file) throw new NotFoundException('Файл не найден');
    if (file.contractorId !== contractorId)
      throw new ForbiddenException('Нет доступа к этому файлу');
    return file;
  }

  /**
   * Вместо пути до файла на диске теперь возвращаем
   * пресайновую ссылку на объект в MinIO.
   * Имя метода сохранил, чтобы не ломать импорты.
   */
  async getStaticPathForContractor(id: string, contractorId: string) {
    const file = await this.getFileForContractor(id, contractorId);

    const downloadUrl = await this.minio.getPresignedUrl(file.path);
    const downloadName = file.filename || basename(file.path);

    return { downloadUrl, downloadName };
  }

  /**
   * Удаление: сначала из MinIO, потом из БД.
   */
  async deleteFileForContractor(id: string, contractorId: string) {
    const file = await this.getFileForContractor(id, contractorId);

    // удаляем из MinIO (ключ хранится в path)
    await this.minio.deleteObject(file.path).catch(() => null);

    // удаляем запись
    await this.prisma.contractorAttachment.delete({ where: { id } });
    return { message: 'Файл удалён' };
  }

  /**
   * Список файлов с готовыми URL
   * (используем пресайновые ссылки MinIO).
   */
  async listForContractorAsLinks(
    contractorId: string,
    _req?: FastifyRequest,
  ) {
    const items = await this.prisma.contractorAttachment.findMany({
      where: { contractorId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        path: true,
        mimetype: true,
        size: true,
        createdAt: true,
      },
    });

    const result = await Promise.all(
      items.map(async (i) => ({
        id: i.id,
        filename: i.filename,
        url: "https://remo-api.centi.space/files/" + i.path,
        mimetype: i.mimetype,
        size: i.size,
        createdAt: i.createdAt,
      })),
    );

    return result;
  }
}
