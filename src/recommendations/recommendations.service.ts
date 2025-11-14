import { BadRequestException, NotFoundException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type BaseOpts = { take?: number };
type ProjectsForContractorOpts = BaseOpts & { onlyOpen?: boolean };
type MatchService = { serviceId: string; slug?: string | null; name?: string | null };
type ScoreRow<T> = T & { matchScore: number; match: { services: MatchService[] } };
type MatchCategory = { categoryId: string; name?: string | null };
type MatchServiceEx = MatchService & { categories: MatchCategory[] };
@Injectable()
export class RecommendationsService {
  private readonly log = new Logger('RecommendationsService');
  constructor(private readonly prisma: PrismaService) {}

  private scoreByServices(left: MatchService[], right: MatchService[]) {
    const setR = new Set(right.map(s => s.serviceId));
    const matched = left.filter(s => setR.has(s.serviceId));
    return { score: matched.length, matched };
  }

  // 1) Исполнители для проекта
  async recommendContractorsForProject(projectId: string, opts?: BaseOpts) {
    if (!projectId) throw new BadRequestException('projectId is required');
    const take = Math.min(Math.max(opts?.take ?? 20, 1), 100);

    // сам проект + выбранные категории по каждой услуге
    let project: {
      id: string;
      services: {
        serviceId: string;
        service: { slug: string | null; name: string | null } | null;
        selectedCategories: { categoryId: string; category: { name: string | null } | null }[];
      }[];
    } | null;

    try {
      project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          services: {
            select: {
              serviceId: true,
              service: { select: { slug: true, name: true } },
              selectedCategories: {
                select: {
                  categoryId: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    } catch (e: any) {
      this.log.error(`[recommendContractorsForProject] project.findUnique failed`, e?.meta ?? e);
      throw new InternalServerErrorException('DB query failed (project)');
    }
    if (!project) throw new NotFoundException('Project not found');

    const projectServicesEx: MatchServiceEx[] = project.services.map(s => ({
      serviceId: s.serviceId,
      slug: s.service?.slug ?? null,
      name: s.service?.name ?? null,
      categories: (s.selectedCategories ?? []).map(c => ({
        categoryId: c.categoryId,
        name: c.category?.name ?? null,
      })),
    }));
    if (projectServicesEx.length === 0) return { items: [], count: 0 };

    // Предвыборка исполнителей по совпадающим услугам (быстро),
    // а детальный матч по категориям — в коде
    let preselected: any[];
    try {
      preselected = await this.prisma.contractor.findMany({
        where: {
          services: { some: { serviceId: { in: projectServicesEx.map(s => s.serviceId) } } },
        },
        select: {
          id: true,
          userId: true,
          companyName: true,
          about: true,
          cityId: true,
          services: {
            select: {
              serviceId: true,
              service: { select: { slug: true, name: true } },
              selectedCategories: {
                select: {
                  categoryId: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    } catch (e: any) {
      this.log.error(`[recommendContractorsForProject] contractor.findMany failed`, e?.meta ?? e);
      throw new InternalServerErrorException('DB query failed (contractors)');
    }

    const scored: ScoreRow<(typeof preselected)[number]>[] = preselected
      .map(c => {
        const ctrServicesEx: MatchServiceEx[] = c.services.map(s => ({
          serviceId: s.serviceId,
          slug: s.service?.slug ?? null,
          name: s.service?.name ?? null,
          categories: (s.selectedCategories ?? []).map(ca => ({
            categoryId: ca.categoryId,
            name: ca.category?.name ?? null,
          })),
        }));
        const { score, matched } = this.scoreByServiceAndCategories(projectServicesEx, ctrServicesEx);
        return { ...c, matchScore: score, match: matched };
      })
      .filter(x => x.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore || (a.id > b.id ? 1 : -1));

    return { items: scored.slice(0, take), count: scored.length };
  }

  // 2) Проекты для исполнителя
  async recommendProjectsForContractor(userId: string, opts?: ProjectsForContractorOpts) {
    if (!userId) throw new BadRequestException('contractorId is required');
    const take = Math.min(Math.max(opts?.take ?? 20, 1), 100);
    const onlyOpen = opts?.onlyOpen ?? true;

    // сам исполнитель + его категории по услугам
    let contractor: {
      id: string;
      services: {
        serviceId: string;
        service: { slug: string | null; name: string | null } | null;
        selectedCategories: { categoryId: string; category: { name: string | null } | null }[];
      }[];
    } | null;

    try {
      contractor = await this.prisma.contractor.findUnique({
        where: { userId },
        select: {
          id: true,
          city:true,

          services: {
            select: {
              serviceId: true,
              service: { select: { slug: true, name: true } },
              selectedCategories: {
                select: {
                  categoryId: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    } catch (e: any) {
      this.log.error(`[recommendProjectsForContractor] contractor.findUnique failed`, e?.meta ?? e);
      throw new InternalServerErrorException('DB query failed (contractor)');
    }
    if (!contractor) throw new NotFoundException('Contractor not found');

    const ctrServicesEx: MatchServiceEx[] = contractor.services.map(s => ({
      serviceId: s.serviceId,
      slug: s.service?.slug ?? null,
      name: s.service?.name ?? null,
      categories: (s.selectedCategories ?? []).map(ca => ({
        categoryId: ca.categoryId,
        name: ca.category?.name ?? null,
      })),
    }));
    if (ctrServicesEx.length === 0) return { items: [], count: 0 };

    const whereProjects: any = {
      services: { some: { serviceId: { in: ctrServicesEx.map(s => s.serviceId) } } },
    };
    if (onlyOpen) whereProjects.status = 'OPEN';

    // проекты-кандидаты + их категории
    let preselected: any[];
    try {
      preselected = await this.prisma.project.findMany({
        where: whereProjects,
        select: {
          id: true,
          title: true,
          description:true,
          status: true,
          attachments: {take:3},
          city:true,
          services: {
            select: {
              serviceId: true,
              service: { select: { slug: true, name: true } },
              selectedCategories: {
                select: {
                  categoryId: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    } catch (e: any) {
      this.log.error(`[recommendProjectsForContractor] project.findMany failed`, e?.meta ?? e);
      throw new InternalServerErrorException('DB query failed (projects)');
    }

    const scored: ScoreRow<(typeof preselected)[number]>[] = preselected
      .map(p => {
        const pServicesEx: MatchServiceEx[] = p.services.map(s => ({
          serviceId: s.serviceId,
          slug: s.service?.slug ?? null,
          name: s.service?.name ?? null,
          categories: (s.selectedCategories ?? []).map(ca => ({
            categoryId: ca.categoryId,
            name: ca.category?.name ?? null,
          })),
        }));
        const { score, matched } = this.scoreByServiceAndCategories(ctrServicesEx, pServicesEx);
        return { ...p, matchScore: score, match: matched };
      })
      .filter(x => x.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore || (a.id > b.id ? 1 : -1));

    return { items: scored.slice(0, take), count: scored.length };
  }


  // 3) Исполнители для клиента по сумме всех его проектов (с категориями)
  async recommendContractorsForClient(userId: string, opts?: BaseOpts) {
    if (!userId) throw new BadRequestException('auth required');
    const take = Math.min(Math.max(opts?.take ?? 20, 1), 100);

    // все проекты клиента + категории по услугам
    let projects: {
      id: string;
      services: {
        serviceId: string;
        service: { slug: string | null; name: string | null } | null;
        selectedCategories: { categoryId: string; category: { name: string | null } | null }[];
      }[];
    }[];
    try {
      projects = await this.prisma.project.findMany({
        where: { clientId: userId },
        select: {
          id: true,
          services: {
            select: {
              serviceId: true,
              service: { select: { slug: true, name: true } },
              selectedCategories: {
                select: {
                  categoryId: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    } catch (e: any) {
      this.log.error(`[recommendContractorsForClient] project.findMany failed`, e?.meta ?? e);
      throw new InternalServerErrorException('DB query failed (client projects)');
    }
    if (!projects.length) return { items: [], count: 0 };

    // агрегируем услуги + объединяем выбранные категории по каждой услуге
    const aggByService = new Map<string, MatchServiceEx>();
    for (const p of projects) {
      for (const s of p.services) {
        const ex = aggByService.get(s.serviceId) ?? {
          serviceId: s.serviceId,
          slug: s.service?.slug ?? null,
          name: s.service?.name ?? null,
          categories: [] as MatchCategory[],
        };
        // добавляем категории без дублей
        const existed = new Set(ex.categories.map(c => c.categoryId));
        for (const c of s.selectedCategories ?? []) {
          if (!existed.has(c.categoryId)) {
            ex.categories.push({ categoryId: c.categoryId, name: c.category?.name ?? null });
            existed.add(c.categoryId);
          }
        }
        aggByService.set(s.serviceId, ex);
      }
    }
    const clientServicesEx = Array.from(aggByService.values());
    if (clientServicesEx.length === 0) return { items: [], count: 0 };

    // предвыборка исполнителей по совпадающим услугам
    let preselected: any[];
    try {
      preselected = await this.prisma.contractor.findMany({
        where: {
          services: { some: { serviceId: { in: clientServicesEx.map(s => s.serviceId) } } },
        },
        select: {
          id: true,
          userId: true,
          companyName: true,
          about: true,
          cityId: true,
          services: {
            select: {
              serviceId: true,
              service: { select: { slug: true, name: true } },
              selectedCategories: {
                select: {
                  categoryId: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    } catch (e: any) {
      this.log.error(`[recommendContractorsForClient] contractor.findMany failed`, e?.meta ?? e);
      throw new InternalServerErrorException('DB query failed (contractors)');
    }

    const scored: ScoreRow<(typeof preselected)[number]>[] = preselected
      .map(c => {
        const ctrServicesEx: MatchServiceEx[] = c.services.map(s => ({
          serviceId: s.serviceId,
          slug: s.service?.slug ?? null,
          name: s.service?.name ?? null,
          categories: (s.selectedCategories ?? []).map(ca => ({
            categoryId: ca.categoryId,
            name: ca.category?.name ?? null,
          })),
        }));
        const { score, matched } = this.scoreByServiceAndCategories(clientServicesEx, ctrServicesEx);
        return { ...c, matchScore: score, match: matched };
      })
      .filter(x => x.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore || (a.id > b.id ? 1 : -1));

    return { items: scored.slice(0, take), count: scored.length };
  }

  private scoreByServiceAndCategories(left: MatchServiceEx[], right: MatchServiceEx[]) {
    // матч по услугам + учёт пересечения категорий в рамках каждой услуги
    const rightByService = new Map<string, MatchServiceEx>(
      right.map(s => [s.serviceId, s]),
    );

    let score = 0;
    const matched: { services: MatchService[]; categories: { serviceId: string; categoryIds: string[] }[] } = {
      services: [],
      categories: [],
    };

    for (const l of left) {
      const r = rightByService.get(l.serviceId);
      if (!r) continue;

      // услуга совпала
      matched.services.push({ serviceId: l.serviceId, slug: l.slug ?? null, name: l.name ?? null });
      // базовый балл за совпадение услуги
      let localScore = 1;

      // пересечение категорий
      const lCats = new Set(l.categories?.map(c => c.categoryId) ?? []);
      const rCats = new Set(r.categories?.map(c => c.categoryId) ?? []);
      const inter: string[] = [];
      for (const cid of lCats) if (rCats.has(cid)) inter.push(cid);

      // если в проекте выбраны категории, усиливаем балл количеством пересечений
      if (lCats.size > 0) {
        localScore += inter.length; // можно заменить на коэффициент, если нужно мягче
      }

      if (inter.length > 0) {
        matched.categories.push({ serviceId: l.serviceId, categoryIds: inter });
      }

      score += localScore;
    }

    return { score, matched };
  }
}
