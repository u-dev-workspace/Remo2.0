import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Service } from '@prisma/client';
import { PrismaCodes } from '../common/prisma-codes';
import { PrismaService } from '../prisma/prisma.service';
import { ListServicesQueryDto } from './dto/list-services';
import { SetServiceCategoriesDto } from './dto/set-service-categories.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { SetServiceCoverDto } from './dto/set-service-cover.dto';
import { SetServiceIconDto } from './dto/set-service-icon.dto';
import { PresignIconDto } from './dto/presign-icon.dto';
import { UploadsService } from '../uploads/uploads.service';
import { randomUUID } from 'crypto';
import { join } from 'path';

import { createWriteStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import type { Readable } from 'stream';

type SaveIconStreamArgs = {
  serviceId: string;
  filename: string;
  mimetype?: string;
  fileStream: Readable;
};

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService, // 🔽
  ) {}

  async list(dto: ListServicesQueryDto) {
    const take = Math.min(Math.max(dto.take ?? 20, 1), 100);

    // В некоторых версиях Prisma нет StringFilter.mode,
    // поэтому используем contains без 'mode'.
    // Для MySQL обычно и так регистр нечувствителен (зависит от collation).
    const where: Prisma.ServiceWhereInput = {
      ...(dto.active !== 'false' ? { isActive: true } : {}),
      ...(dto.q
        ? {
          OR: [
            { name: { contains: dto.q } },
            { description: { contains: dto.q } },
            { slug: { contains: dto.q.toLowerCase() } },
          ],
        }
        : {}),
      ...(dto.categoryId ? { categories: { some: { id: dto.categoryId } } } : {}),
    };

    const items = await this.prisma.service.findMany({
      where,
      take,
      ...(dto.cursor ? { cursor: { id: dto.cursor }, skip: 1 } : {}),
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        iconUrl:true,
        isActive: true,
        categories: { select: { id: true, name: true } },
      },
    });

    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async byId(id: string) {
    return this.prisma.service.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        isActive: true,
        categories: { select: { id: true, name: true } },
      },
    });
  }

  async bySlug(slug: string) {
    return this.prisma.service.findUniqueOrThrow({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        isActive: true,
        categories: { select: { id: true, name: true } },
      },
    });
  }

  async create(dto: CreateServiceDto) {
    // валидация категорий (если указаны)
    if (dto.categoryIds?.length) {
      const exist = await this.prisma.category.findMany({
        where: { id: { in: dto.categoryIds } },
        select: { id: true },
      });
      if (exist.length !== dto.categoryIds.length) {
        const have = new Set(exist.map(c => c.id));
        const missing = dto.categoryIds.filter(id => !have.has(id));
        throw new BadRequestException(`Unknown categoryIds: ${missing.join(', ')}`);
      }
    }

    try {
      const created = await this.prisma.service.create({
        data: {
          slug: dto.slug,
          name: dto.name,
          description: dto.description ?? null,
          isActive: dto.isActive ?? true,
          ...(dto.categoryIds?.length
            ? { categories: { connect: dto.categoryIds.map(id => ({ id })) } }
            : {}),
        },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          isActive: true,
          categories: { select: { id: true, name: true } },
        },
      });
      return created;
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === PrismaCodes.UNIQUE_VIOLATION) {
          // unique (скорее всего slug)
          throw new ConflictException('Service with this slug already exists');
        }
        if (e.code === PrismaCodes.FOREIGN_KEY_VIOLATION) {
          throw new BadRequestException('Invalid categoryIds (FK error)');
        }
      }
      throw e;
    }
  }

  // Полная замена списка категорий у услуги
  async setCategories(id: string, dto: SetServiceCategoriesDto) {
    const service = await this.prisma.service.findUnique({ where: { id }, select: { id: true } });
    if (!service) throw new NotFoundException('Service not found');

    const exist = await this.prisma.category.findMany({
      where: { id: { in: dto.categoryIds } },
      select: { id: true },
    });
    if (exist.length !== dto.categoryIds.length) {
      const have = new Set(exist.map(c => c.id));
      const missing = dto.categoryIds.filter(x => !have.has(x));
      throw new BadRequestException(`Unknown categoryIds: ${missing.join(', ')}`);
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        categories: { set: dto.categoryIds.map(id => ({ id })) }, // ← перезаменяем полностью
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        isActive: true,
        categories: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  async getCoverServices() {
    const items = await this.prisma.service.findMany({
      where: { isCoverser: true, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 8,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        iconUrl: true,
        isCoverser: true,
        isActive: true,
        categories: { select: { id: true, name: true } },
      },
    });

    return items;
  }

  private async ensureServiceExists(id: string): Promise<Service> {
    const srv = await this.prisma.service.findUnique({ where: { id } });
    if (!srv) throw new NotFoundException('Service not found');
    return srv;
  }

  async setCoverFlag(id: string, dto: SetServiceCoverDto) {
    const service = await this.ensureServiceExists(id);

    if (dto.isCoverser && !service.isCoverser) {
      const count = await this.prisma.service.count({
        where: { isCoverser: true, isActive: true },
      });

      if (count >= 8) {
        throw new BadRequestException('Нельзя разместить на обложке более 8 услуг');
      }
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: { isCoverser: dto.isCoverser },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        iconUrl: true,
        isCoverser: true,
        isActive: true,
        categories: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  async setIconUrl(id: string, dto: SetServiceIconDto) {
    await this.ensureServiceExists(id);

    const updated = await this.prisma.service.update({
      where: { id },
      data: { iconUrl: dto.iconUrl },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        iconUrl: true,
        isCoverser: true,
        isActive: true,
        categories: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  // services.service.ts
  async createIconPresignedPut(
    id: string,
    fileInfo: { mime: string; sizeBytes: number },
  ) {
    await this.ensureServiceExists(id);

    // просто пробрасываем в UploadsService
    return this.uploads.createServiceIconPresignedPut(
      id,
      fileInfo.mime,
      fileInfo.sizeBytes,
    );
  }

  private readonly root = join(process.cwd(), 'uploads');
  private iconFolder = 'service-icons';
  async saveIconFileStream({ serviceId, filename, mimetype, fileStream }: SaveIconStreamArgs) {
    await this.ensureServiceExists(serviceId);

    if (!fileStream) {
      throw new BadRequestException('Пустой файл');
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic'];
    if (mimetype && !allowed.includes(mimetype)) {
      throw new BadRequestException('Недопустимый тип файла для иконки');
    }

    const safeName = filename?.replace(/[^\p{L}\p{N}\.\-_ ]/gu, '_') || 'icon';
    const unique = `${Date.now()}_${randomUUID()}`.slice(0, 36);
    const finalName = `${unique}_${safeName}`;

    const dirAbs = join(this.root, this.iconFolder, serviceId);
    await fs.mkdir(dirAbs, { recursive: true });

    const absPath = join(dirAbs, finalName);
    const write = createWriteStream(absPath);

    await pipeline(fileStream, write); // теперь ок

    const staticRelativePath = join(this.iconFolder, serviceId, finalName).replace(/\\/g, '/');
    const dbPath = `/uploads/${staticRelativePath}`;

    const updated = await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        iconUrl: dbPath,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        iconUrl: true,
        isCoverser: true,
        isActive: true,
        categories: { select: { id: true, name: true } },
      },
    });

    return updated;
  }


  async getPopularServices() {
    const services = await this.prisma.service.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        iconUrl: true,
        description: true,
        projectLinks: {
          select: { id: true },
        },
        contractorLinks: {
          select: { id: true },
        },
      },
    });

    // посчитать и отсортировать по сумме
    const withCounts = services
      .map((s) => ({
        id: s.id,
        name: s.name,
        iconUrl: s.iconUrl,
        description: s.description,
        projectsCount: s.projectLinks.length,
        contractorsCount: s.contractorLinks.length,
        totalCount: s.projectLinks.length + s.contractorLinks.length,
      }))
      .sort((a, b) => b.totalCount - a.totalCount);

    return withCounts.slice(0, 10); // например, топ-10
  }








}
