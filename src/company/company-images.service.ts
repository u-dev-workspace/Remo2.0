import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Readable } from 'stream';
import type { FastifyRequest } from 'fastify';
import { basename } from 'path';
import { MinioService } from '../minio/minio.service';

type SaveCompanyImageArgs = {
  companyId: string;
  filename: string;
  mimetype?: string;
  fileStream: Readable;
  isMain?: boolean;
};

@Injectable()
export class CompanyImagesService {
  // Папка внутри бакета MinIO
  private folder = 'companies';

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  /**
   * Вспомогательная: читаем Readable в Buffer.
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Проверка, что пользователь имеет доступ к компании.
   * (сейчас простая: является ли сотрудником этой компании)
   */
  async ensureUserHasAccessToCompany(user: any, companyId: string) {
    if (!user?.id) {
      throw new ForbiddenException('Нет идентификатора пользователя в токене');
    }

    const employee = await this.prisma.companyEmployee.findFirst({
      where: {
        companyId,
        userId: user.id,
        isActive: true,
      },
      select: { id: true },
    });

    if (!employee) {
      throw new ForbiddenException('Нет доступа к этой компании');
    }
  }

  /**
   * Сохранить картинку компании:
   *  - читаем stream в Buffer
   *  - загружаем в MinIO
   *  - пишем запись в CompanyImage
   */
  async saveStreamFile({
                         companyId,
                         filename,
                         mimetype,
                         fileStream,
                         isMain,
                       }: SaveCompanyImageArgs) {
    if (!fileStream) throw new BadRequestException('Пустой файл');

    const safeName =
      filename?.replace(/[^\p{L}\p{N}\.\-_ ]/gu, '_') || 'file';
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const finalName = `${unique}_${safeName}`;

    // Ключ объекта в MinIO: companies/{companyId}/{finalName}
    const objectName = `${this.folder}/${companyId}/${finalName}`;
    const buffer = await this.streamToBuffer(fileStream);
    const contentType = mimetype || 'application/octet-stream';

    // Сначала грузим в MinIO
    await this.minio.uploadBuffer(objectName, buffer, contentType);

    // Потом сохраняем запись в БД
    const rec = await this.prisma.companyImage.create({
      data: {
        companyId,
        // В url будем хранить именно КЛЮЧ в MinIO (как path у подрядчика)
        url: objectName,
        isMain: isMain ?? false,
        sortOrder: 0,
      },
    });

    return rec;
  }

  async getImageForCompany(id: string, companyId: string) {
    const img = await this.prisma.companyImage.findUnique({
      where: { id },
    });

    if (!img) throw new NotFoundException('Изображение не найдено');
    if (img.companyId !== companyId)
      throw new ForbiddenException('Нет доступа к этому изображению');

    return img;
  }

  /**
   * Возвращаем прямой URL для скачивания/просмотра.
   * Аналогично getStaticPathForContractor.
   */
  async getStaticPathForCompany(id: string, companyId: string) {
    const img = await this.getImageForCompany(id, companyId);

    const downloadUrl = await this.minio.getPresignedUrl(img.url);
    const downloadName = basename(img.url);

    return { downloadUrl, downloadName };
  }

  /**
   * Список картинок компании в виде готовых ссылок для фронта.
   * Аналог listForContractorAsLinks.
   */
  async listForCompanyAsLinks(companyId: string, _req?: FastifyRequest) {
    const items = await this.prisma.companyImage.findMany({
      where: { companyId },
      orderBy: [
        { isMain: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        url: true,
        isMain: true,
        sortOrder: true,
        createdAt: true,
      },
    });

    const result = items.map((i) => ({
      id: i.id,
      filename: basename(i.url),
      // как в ContractorAttachmentsService:
      url: 'https://remo-api.centi.space/files/' + i.url,
      isMain: i.isMain,
      sortOrder: i.sortOrder,
      createdAt: i.createdAt,
    }));

    return result;
  }

  /**
   * Удаление: сначала из MinIO, потом из БД.
   */
  async deleteImageForCompany(id: string, companyId: string) {
    const img = await this.getImageForCompany(id, companyId);

    // удаляем из MinIO (ключ хранится в url)
    await this.minio.deleteObject(img.url).catch(() => null);

    // удаляем запись
    await this.prisma.companyImage.delete({ where: { id } });

    return { message: 'Изображение удалено' };
  }
}
