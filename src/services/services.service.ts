import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Service } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListServicesQueryDto } from './dto/list-services';
import { SetServiceCategoriesDto } from './dto/set-service-categories.dto';
import { CreateServiceDto } from './dto/create-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

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
        if (e.code === 'P2002') {
          // unique (скорее всего slug)
          throw new ConflictException('Service with this slug already exists');
        }
        if (e.code === 'P2003') {
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
}
