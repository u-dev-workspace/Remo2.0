import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ListParams = { status?: string; city?: string; take?: number; cursor?: string };

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1) Проекты для исполнителя (по его категориям)
  async projectsForContractor(userId: string, params: ListParams) {
    const contractor = await this.prisma.contractor.findUnique({
      where: { userId },
      include: { categories: { select: { id: true } } },
    });
    if (!contractor) throw new NotFoundException('Contractor profile not found');

    const categoryIds = contractor.categories.map(c => c.id);
    if (categoryIds.length === 0) return { items: [], nextCursor: null };

    const where: any = {
      categories: { some: { id: { in: categoryIds } } },
    };
    if (params.status) where.status = params.status as any;
    if (params.city) where.city = params.city;

    // исключим проекты, где уже есть диалог с этим исполнителем
    const conversations = await this.prisma.conversation.findMany({
      where: { contractorId: contractor.id },
      select: { projectId: true },
    });
    const already = new Set(conversations.map(c => c.projectId));
    if (already.size) where.id = { notIn: Array.from(already) };

    const take = Math.min(Math.max(params.take || 20, 1), 100);
    const query: any = {
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        categories: true,
        coverAttachment: true,
        client: { select: { id: true, name: true, city: true } },
      },
    };
    if (params.cursor) {
      query.cursor = { id: params.cursor };
      query.skip = 1;
    }

    const items = await this.prisma.project.findMany(query);
    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
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
