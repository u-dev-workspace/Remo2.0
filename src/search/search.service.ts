import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { CityListQueryDto } from './dto/city-list.dto';
import { CitySuggestQueryDto } from './dto/city-suggest.dto';
import { SearchContractorsQueryDto } from './dto/search-contractors.dto';
import { SearchProjectsQueryDto } from './dto/search-projects.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(SearchService.name);
  // -------- Cities --------
  async listCities(dto: CityListQueryDto) {
    const take = Math.min(Math.max(dto.take ?? 100, 1), 500);
    const select = { id: true, slug: true, nameRu: true, nameKk: true, nameEn: true };

    const items = await this.prisma.city.findMany({
      select,
      orderBy: { [dto.sortBy || 'nameRu']: 'asc' },
      take,
      ...(dto.cursor ? { cursor: { id: dto.cursor }, skip: 1 } : {}),
    });

    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  async suggestCities(dto: CitySuggestQueryDto) {
    const take = Math.min(Math.max(dto.take ?? 10, 1), 50);
    const lang = dto.lang || 'ru';

    // поле для поиска
    const field = lang === 'kk' ? 'nameKk' : lang === 'en' ? 'nameEn' : 'nameRu';

    const where: Prisma.CityWhereInput = dto.q
      ? {
        OR: [
          { [field]: { contains: dto.q, mode: 'insensitive' } },
          { slug: { startsWith: dto.q.toLowerCase() } },
        ],
      }
      : {};

    const items = await this.prisma.city.findMany({
      where,
      select: { id: true, slug: true, nameRu: true, nameKk: true, nameEn: true },
      orderBy: [{ [field]: 'asc' }, { slug: 'asc' }],
      take,
    });

    // На фронт можно рендерить label по lang
    return items.map((c) => ({
      id: c.id,
      slug: c.slug,
      label:
        (lang === 'kk' ? c.nameKk : lang === 'en' ? c.nameEn : c.nameRu) ||
        c.nameRu ||
        c.slug,
      names: { ru: c.nameRu, kk: c.nameKk, en: c.nameEn },
    }));
  }

  // -------- Contractors by city --------
  async searchContractors(
    dto: SearchContractorsQueryDto,
    currentUserId: string,
  ) {
    const take = Math.min(Math.max(dto.take ?? 20, 1), 100);

    let cityId = dto.cityId ?? null;
    if (!cityId && dto.citySlug) {
      const city = await this.prisma.city.findUnique({ where: { slug: dto.citySlug } });
      if (!city) throw new NotFoundException('City not found');
      cityId = city.id;
    }

    const where: Prisma.ContractorWhereInput = {};

    if (cityId) {
      where.cityId = cityId;
    }


      where.user = { id: { not: currentUserId } };
    this.logger.debug(
      `Contractor userId is -> ` + currentUserId,
    );


    const items = await this.prisma.contractor.findMany({
      where,
      take,
      ...(dto.cursor ? { cursor: { id: dto.cursor }, skip: 1 } : {}),
      orderBy: { id: 'desc' },
      select: {
        id: true,
        cityId: true,
        city: { select: { id: true, slug: true, nameRu: true, nameKk: true, nameEn: true } },
        user: { select: { id: true, name: true, avatarUrl: true } },
        companyName: true,
        ContractorAttachment: {take: 3},
        services: {
          select: {
            service: { select: { name: true } },
            selectedCategories: true,
          },
        },
        about: true,
      },
    });

    const nextCursor = items.length === take ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }


  // -------- Projects by city --------
  async searchProjects(dto: SearchProjectsQueryDto) {
    const take = Math.min(Math.max(dto.take ?? 20, 1), 100);

    let cityId = dto.cityId ?? null;
    if (!cityId && dto.citySlug) {
      const city = await this.prisma.city.findUnique({ where: { slug: dto.citySlug } });
      if (!city) throw new NotFoundException('City not found');
      cityId = city.id;
    }

    const where: Prisma.ProjectWhereInput = cityId ? { cityId } : {};

    const items = await this.prisma.project.findMany({
      where,
      take,
      ...(dto.cursor ? { cursor: { id: dto.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        cityId: true,
        createdAt: true,
        coverAttachment: { select: { id: true, url: true } },
        attachments: { take:3 },
        city: { select: { id: true, slug: true, nameRu: true, nameKk: true, nameEn: true } },
        client: { select: { id: true, name: true } },
        categories: { select: { id: true, name: true } },
        services: { select: {service: true} },
        status: true,
        area: true,
        budgetEstimated: true,
        propertyType: true,

      },
    });

    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }
}
