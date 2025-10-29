import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ScoreRow<T> = T & {
  matchScore: number;
  match: {
    services: Array<{
      serviceId: string;
      serviceSlug?: string;
      serviceName?: string;
      projectCats: string[];     // учтённые (выбранные или все) категории проекта по этой услуге
      contractorCats: string[];  // учтённые категории исполнителя по этой услуге
      inter: string[];           // пересечение категорий
    }>;
  };
};

export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  // --------- helpers ---------
  private uniq<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  }

  // “выбранные или все” категории по услуге у проекта
  private resolvedProjectCats(ps: {
    service: { categories: { id: string }[] };
    selectedCategories: { categoryId: string }[];
  }): string[] {
    const all = ps.service.categories.map(c => c.id);
    const selected = ps.selectedCategories?.map(x => x.categoryId) ?? [];
    return selected.length ? selected : all;
  }

  // “выбранные или все” категории по услуге у исполнителя
  private resolvedContractorCats(cs: {
    service: { categories: { id: string }[] };
    selectedCategories: { categoryId: string }[];
  }): string[] {
    const all = cs.service.categories.map(c => c.id);
    const selected = cs.selectedCategories?.map(x => x.categoryId) ?? [];
    return selected.length ? selected : all;
  }

  // размер и набор пересечения
  private intersect(a: string[], b: string[]) {
    const sb = new Set(b);
    const inter = a.filter(x => sb.has(x));
    return inter;
    // длину возьмём как inter.length
  }

  // --------- 1) Исполнители для проекта ---------
  async recommendContractorsForProject(
    projectId: string,
    opts?: { take?: number; sameCityBoost?: boolean },
  ) {
    const take = Math.min(Math.max(opts?.take ?? 20, 1), 100);

    try {
      // 1) Базовая инфа о проекте (без обратной связи на services)
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, cityId: true },
      });
      if (!project) {
        // вернём пусто, чтобы не заваливать 500
        return { items: [], count: 0, note: 'Project not found' };
      }

      // 2) ЯВНО читаем ProjectService по projectId
      const projectServices = await this.prisma.projectService.findMany({
        where: { projectId },
        select: {
          service: {
            select: {
              id: true,
              slug: true,
              name: true,
              categories: { select: { id: true } },
            },
          },
          selectedCategories: { select: { categoryId: true } },
        },
      });

      if (!projectServices.length) {
        return { items: [], count: 0, note: 'Project has no services' };
      }

      // helper-функции (локальные)
      const resolvedProjectCats = (ps: {
        service: { categories: { id: string }[] };
        selectedCategories: { categoryId: string }[];
      }) => {
        const all = ps.service.categories.map(c => c.id);
        const selected = ps.selectedCategories?.map(x => x.categoryId) ?? [];
        return selected.length ? selected : all;
      };
      const resolvedContractorCats = (cs: {
        service: { categories: { id: string }[] };
        selectedCategories: { categoryId: string }[];
      }) => {
        const all = cs.service.categories.map(c => c.id);
        const selected = cs.selectedCategories?.map(x => x.categoryId) ?? [];
        return selected.length ? selected : all;
      };
      const intersect = (a: string[], b: string[]) => {
        const sb = new Set(b);
        return a.filter(x => sb.has(x));
      };

      const projectServiceIds = [...new Set(projectServices.map(s => s.service.id))];

      // 3) Пул кандидатов: только те, у кого есть хотя бы одна из услуг проекта
      const contractors = await this.prisma.contractor.findMany({
        where: { services: { some: { serviceId: { in: projectServiceIds } } } },
        select: {
          id: true,
          userId: true,
          cityId: true,
          companyName: true,
          about: true,
          user: { select: { id: true, name: true, avatarUrl: true, cityId: true } },
          services: {
            where: { serviceId: { in: projectServiceIds } },
            select: {
              service: {
                select: {
                  id: true, slug: true, name: true,
                  categories: { select: { id: true } },
                },
              },
              selectedCategories: { select: { categoryId: true } },
            },
          },
        },
        take: 1000, // верхняя отсечка; потом режем по score
      });

      // 4) Считаем score
      const scored = contractors
        .map(ctr => {
          let score = 0;
          const details: Array<{
            serviceId: string;
            serviceSlug?: string;
            serviceName?: string;
            projectCats: string[];
            contractorCats: string[];
            inter: string[];
          }> = [];

          for (const ps of projectServices) {
            const cs = ctr.services.find(s => s.service.id === ps.service.id);
            if (!cs) continue;

            const pCats = resolvedProjectCats(ps);
            const cCats = resolvedContractorCats(cs);
            const inter = intersect(pCats, cCats);

            const serviceWeight = 5; // вес за совпадение услуги
            score += serviceWeight + inter.length;

            details.push({
              serviceId: ps.service.id,
              serviceSlug: ps.service.slug,
              serviceName: ps.service.name,
              projectCats: pCats,
              contractorCats: cCats,
              inter,
            });
          }

          if (opts?.sameCityBoost && project.cityId && ctr.cityId && project.cityId === ctr.cityId) {
            score += 2;
          }

          return { ...ctr, matchScore: score, match: { services: details } };
        })
        .filter(x => x.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore || (a.id > b.id ? 1 : -1));

      const items = scored.slice(0, take);
      return { items, count: scored.length };
    } catch (e) {
      // безопасный лог, чтобы сразу понять первопричину 500
      // eslint-disable-next-line no-console
      console.error('[recommendContractorsForProject] failed:', e);
      // не оставляем “внутрянку” на фронт
      return { items: [], count: 0, error: 'internal_error' };
    }
  }


  // --------- 2) Проекты для исполнителя ---------
  async recommendProjectsForContractor(contractorId: string, opts?: { take?: number; onlyOpen?: boolean; sameCityBoost?: boolean }) {
    const take = Math.min(Math.max(opts?.take ?? 20, 1), 100);

    // 1) грузим исполнителя + услуги с категориями
    const contractor = await this.prisma.contractor.findUnique({
      where: { id: contractorId },
      select: {
        id: true,
        cityId: true,
        services: {
          select: {
            service: { select: { id: true, slug: true, name: true, categories: { select: { id: true } } } },
            selectedCategories: { select: { categoryId: true } },
          },
        },
      },
    });
    if (!contractor) throw new NotFoundException('Contractor not found');
    if (!contractor.services.length) return { items: [], count: 0 };

    const contractorServiceIds = this.uniq(contractor.services.map(s => s.service.id));

    // 2) пул проектов с пересечением по услугам
    const projects = await this.prisma.project.findMany({
      where: {
        ...(opts?.onlyOpen ? { status: 'OPEN' as any } : {}),
        services: { some: { serviceId: { in: contractorServiceIds } } },
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        status: true,
        cityId: true,
        services: {
          where: { serviceId: { in: contractorServiceIds } },
          select: {
            service: { select: { id: true, slug: true, name: true, categories: { select: { id: true } } } },
            selectedCategories: { select: { categoryId: true } },
          },
        },
        coverAttachment: { select: { id: true, url: true } },
        client: { select: { id: true, name: true, avatarUrl: true, cityId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // 3) score
    const scored: ScoreRow<typeof projects[number]>[] = projects.map((p) => {
      let score = 0;
      const perService: ScoreRow<any>['match']['services'] = [];

      for (const cs of contractor.services) {
        const pLinksSameService = p.services.filter(ps => ps.service.id === cs.service.id);
        if (!pLinksSameService.length) continue;

        const ps = pLinksSameService[0];

        const pCats = this.resolvedProjectCats(ps);
        const cCats = this.resolvedContractorCats(cs);
        const inter = this.intersect(pCats, cCats);

        const serviceWeight = 5;
        score += serviceWeight + inter.length;

        perService.push({
          serviceId: cs.service.id,
          serviceSlug: cs.service.slug,
          serviceName: cs.service.name,
          projectCats: pCats,
          contractorCats: cCats,
          inter,
        });
      }

      if (opts?.sameCityBoost && p.cityId && contractor.cityId && p.cityId === contractor.cityId) {
        score += 2;
      }

      return { ...p, matchScore: score, match: { services: perService } };
    })
      .filter(x => x.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore || (a.id > b.id ? 1 : -1));

    const items = scored.slice(0, take);
    return { items, count: scored.length };
  }

  // --------- 3) Для клиента (агрегация по всем его проектам) ---------
  async recommendContractorsForClient(userId: string, opts?: { take?: number; sameCityBoost?: boolean }) {
    const take = Math.min(Math.max(opts?.take ?? 20, 1), 100);

    // берём все услуги/категории из ВСЕХ проектов клиента
    const projects = await this.prisma.project.findMany({
      where: { clientId: userId },
      select: {
        id: true,
        cityId: true,
        services: {
          select: {
            service: { select: { id: true, slug: true, name: true, categories: { select: { id: true } } } },
            selectedCategories: { select: { categoryId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // ограничим для производительности
    });

    if (!projects.length) return { items: [], count: 0 };

    // Собираем уникальные услуги и “разрешённые” по ним категории (объединение по проектам)
    const byService = new Map<
      string,
      { serviceId: string; categoryIds: Set<string> }
    >();

    for (const p of projects) {
      for (const ps of p.services) {
        const all = ps.service.categories.map(c => c.id);
        const selected = ps.selectedCategories?.map(x => x.categoryId) ?? [];
        const use = (selected.length ? selected : all);

        if (!byService.has(ps.service.id)) {
          byService.set(ps.service.id, { serviceId: ps.service.id, categoryIds: new Set(use) });
        } else {
          const agg = byService.get(ps.service.id)!;
          use.forEach(id => agg.categoryIds.add(id));
        }
      }
    }

    const serviceIds = [...byService.keys()];
    if (!serviceIds.length) return { items: [], count: 0 };

    // пул: все исполнители, у кого есть хотя бы одна нужная услуга
    const pool = await this.prisma.contractor.findMany({
      where: { services: { some: { serviceId: { in: serviceIds } } } },
      select: {
        id: true,
        userId: true,
        cityId: true,
        companyName: true,
        about: true,
        user: { select: { id: true, name: true, avatarUrl: true, cityId: true } },
        services: {
          where: { serviceId: { in: serviceIds } },
          select: {
            service: { select: { id: true, slug: true, name: true, categories: { select: { id: true } } } },
            selectedCategories: { select: { categoryId: true } },
          },
        },
      },
      take: 1000,
    });

    // simple score
    const scored = pool.map((ctr) => {
      let score = 0;
      const perService: any[] = [];

      for (const cs of ctr.services) {
        const allowed = byService.get(cs.service.id);
        if (!allowed) continue;

        const cCats = this.resolvedContractorCats(cs);
        const inter = this.intersect([...allowed.categoryIds], cCats);

        const serviceWeight = 5;
        score += serviceWeight + inter.length;

        perService.push({
          serviceId: cs.service.id,
          serviceSlug: cs.service.slug,
          serviceName: cs.service.name,
          projectCats: [...allowed.categoryIds],
          contractorCats: cCats,
          inter,
        });
      }

      return { ...ctr, matchScore: score, match: { services: perService } };
    })
      .filter(x => x.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore || (a.id > b.id ? 1 : -1));

    const items = scored.slice(0, take);
    return { items, count: scored.length };
  }
}
