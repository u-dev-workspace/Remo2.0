import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { join, basename } from 'path';
import { createWriteStream, promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import type { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';

type SaveStreamArgs = {
  contractorId: string;
  filename: string;
  mimetype?: string;
  fileStream: Readable;
};

@Injectable()
export class ContractorAttachmentsService {
  private root = join(process.cwd(), 'uploads');
  private folder = 'contractors';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async resolveContractorId(user: any): Promise<string> {
    if (user?.contractorId) return String(user.contractorId);
    if (!user?.id) throw new ForbiddenException('Нет идентификатора пользователя в токене');

    const contractor = await this.prisma.contractor.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!contractor) throw new ForbiddenException('Для этого пользователя не найден профиль подрядчика');
    return contractor.id;
  }

  async saveStreamFile({ contractorId, filename, mimetype, fileStream }: SaveStreamArgs) {
    if (!fileStream) throw new BadRequestException('Пустой файл');

    const safeName = filename?.replace(/[^\p{L}\p{N}\.\-_ ]/gu, '_') || 'file';
    const unique = `${Date.now()}_${randomUUID()}`.slice(0, 36);
    const finalName = `${unique}_${safeName}`;

    const dirAbs = join(this.root, this.folder, contractorId);
    await fs.mkdir(dirAbs, { recursive: true });

    const absPath = join(dirAbs, finalName);
    const write = createWriteStream(absPath);
    await pipeline(fileStream, write);

    const staticRelativePath = join(this.folder, contractorId, finalName).replace(/\\/g, '/');

    const rec = await this.prisma.contractorAttachment.create({
      data: {
        contractorId,
        filename: safeName,
        path: `/uploads/${staticRelativePath}`,
        mimetype: mimetype || null,
        size: (await fs.stat(absPath)).size,
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
    const file = await this.prisma.contractorAttachment.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Файл не найден');
    if (file.contractorId !== contractorId) throw new ForbiddenException('Нет доступа к этому файлу');
    return file;
  }

  async getStaticPathForContractor(id: string, contractorId: string) {
    const file = await this.getFileForContractor(id, contractorId);
    const staticRelativePath = file.path.replace(/^\/?uploads\/?/, '');
    const downloadName = file.filename || basename(staticRelativePath);
    return { staticRelativePath, downloadName };
  }

  async deleteFileForContractor(id: string, contractorId: string) {
    const file = await this.getFileForContractor(id, contractorId);
    const absPath = join(this.root, file.path.replace(/^\/?uploads\/?/, ''));
    await fs.unlink(absPath).catch(() => null);
    await this.prisma.contractorAttachment.delete({ where: { id } });
    return { message: 'Файл удалён' };
  }

  private buildBaseUrl(req?: FastifyRequest) {
    const env = this.config.get<string>('PUBLIC_BASE_URL');
    if (env) return env.replace(/\/$/, '');

    const host =
      (req?.headers['x-forwarded-host'] as string) ||
      (req?.headers.host as string) ||
      'localhost:8080';

    const proto =
      (req?.headers['x-forwarded-proto'] as string) ||
      (req as any)?.protocol ||
      'http';

    return `${proto}://${host}`;
  }

  async listForContractorAsLinks(contractorId: string, req?: FastifyRequest) {
    const base = this.buildBaseUrl(req);
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

    return items.map((i) => ({
      id: i.id,
      filename: i.filename,
      url: `${base}${i.path}`,
      mimetype: i.mimetype,
      size: i.size,
      createdAt: i.createdAt,
    }));
  }
}
