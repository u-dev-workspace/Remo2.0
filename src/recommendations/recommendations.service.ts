import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ProjectStatus } from '@prisma/client';

type ListParams = {
  status?: string;
  city?: string;
  take?: number;
  cursor?: string;
  excludeTalked?: boolean;
  debug?: boolean;
};

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}


  async projectsForContractor(userId: string, params: ListParams) {
    if (!userId) throw new BadRequestException('userId is required');

    const contractor = await this.prisma.contractor.findUnique({
      where: { userId },
      include: { categories: { select: { id: true, name: true } } },
    });
    if (!contractor) throw new NotFoundException('Contractor profile not found');

    const categoryIds = contractor.categories.map(c => c.id);
    if (!categoryIds.length) {
      return { items: [], nextCursor: null, ...(params.debug ? { debug: { reason: 'no_contractor_categories' } } : {}) };
    }

    // нормализуем статус
    let statusFilter: ProjectStatus | undefined;
    if (params.status) {
      const u = params.status.toUpperCase();
      if ((Object.values(ProjectStatus) as string[]).includes(u)) {
        statusFilter = u as ProjectStatus;
      }
    }

    // --- where (БЕЗ mode для MySQL) ---
    const where: Prisma.ProjectWhereInput = {
      categories: { some: { id: { in: categoryIds } } },
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(params.city
        ? {
          // равенство по городу (MySQL обычно case-insensitive из-за коллации *_ci)
          OR: [{ city: { equals: params.city } }, { city: null }],
          // если хочешь частичное совпадение:
          // OR: [{ city: { contains: params.city } }, { city: null }],
        }
        : {}),
    };

    // исключить проекты, где уже был диалог (если включено)
    let excludedProjectIds: string[] = [];
    if (params.excludeTalked !== false) {
      const conversations = await this.prisma.conversation.findMany({
        where: { contractorId: contractor.id },
        select: { projectId: true },
      });
      excludedProjectIds = conversations.map(c => c.projectId);
      if (excludedProjectIds.length) (where as any).id = { notIn: excludedProjectIds };
    }

    const take = Math.min(Math.max(params.take || 20, 1), 100);

    const query: Prisma.ProjectFindManyArgs = {
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        categories: true,
        coverAttachment: true,
        client: { select: { id: true, name: true, city: true } },
        attachments: {
          take: 3, // ← возвращает только первые 3 вложения
        },
      },
    };

    // валидируем cursor
    if (params.cursor) {
      const exists = await this.prisma.project.findFirst({
        where: { ...where, id: params.cursor },
        select: { id: true },
      });
      if (exists) {
        query.cursor = { id: params.cursor };
        (query as any).skip = 1;
      }
    }

    // --- debug counters (типизируем как number | undefined) ---
    let totalMatch: number | undefined;
    let totalAfterExclusion: number | undefined;
    if (params.debug) {
      totalMatch = await this.prisma.project.count({
        where: {
          categories: { some: { id: { in: categoryIds } } },
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(params.city ? { OR: [{ city: { equals: params.city } }, { city: null }] } : {}),
        },
      });
      if (excludedProjectIds.length) {
        totalAfterExclusion = await this.prisma.project.count({ where });
      }
    }

    const items = await this.prisma.project.findMany(query);
    const nextCursor = items.length === take ? items[items.length - 1].id : null;

    return {
      items,
      nextCursor,
      ...(params.debug
        ? {
          debug: {
            contractorId: contractor.id,
            contractorCategoryIds: categoryIds,
            contractorCategoryNames: contractor.categories.map(c => c.name),
            where,
            totalMatch,
            excludedProjectIds,
            totalAfterExclusion,
          },
        }
        : {}),
    };
  }
  // 2) Исполнители для проекта (по категориям проекта)
  async contractorsForProject(projectId: string, opts: { city?: string; take?: number }) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { categories: { select: { id: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');

    const categoryIds = project.categories.map(c => c.id);
    if (categoryIds.length === 0) return { items: [], count: 0 };

    // кандидаты: у кого есть хотя бы одна из категорий (и опц. по городу пользователя)
    const contractors = await this.prisma.contractor.findMany({
      where: {
        categories: { some: { id: { in: categoryIds } } },
        ...(opts.city ? { user: { city: opts.city } } : {}),
      },
      include: {
        user: { select: { id: true, name: true, city: true, avatarUrl: true } },
        categories: { select: { id: true, name: true } },
      },
      take: Math.min(Math.max(opts.take || 20, 1), 100),
    });

    // посчитаем score = размер пересечения категорий
    const set = new Set(categoryIds);
    const scored = contractors
      .map((c) => {
        const inter = c.categories.filter(k => set.has(k.id)).length;
        return { ...c, matchScore: inter };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return { items: scored, count: scored.length, projectId };
  }
}
