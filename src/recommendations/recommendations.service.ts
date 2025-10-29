import { BadRequestException, NotFoundException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type BaseOpts = { take?: number };
type ProjectsForContractorOpts = BaseOpts & { onlyOpen?: boolean };
type MatchService = { serviceId: string; slug?: string | null; name?: string | null };
type ScoreRow<T> = T & { matchScore: number; match: { services: MatchService[] } };

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

    let project: { id: string; services: { serviceId: string; service: { slug: string | null; name: string | null } | null }[] } | null;
    try {
      project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          services: {
            select: {
              serviceId: true,
              service: { select: { slug: true, name: true } },
            },
          },
        },
      });
    } catch (e: any) {
      this.log.error(`[recommendContractorsForProject] prisma.project.findUnique failed`, e?.meta ?? e);
      throw new InternalServerErrorException('DB query failed (project)');
    }
    if (!project) throw new NotFoundException('Project not found');

    const projectServices: MatchService[] = project.services.map(s => ({
      serviceId: s.serviceId,
      slug: s.service?.slug ?? null,
      name: s.service?.name ?? null,
    }));
    if (projectServices.length === 0) return { items: [], count: 0 };

    let preselected: any[];
    try {
      preselected = await this.prisma.contractor.findMany({
        where: { services: { some: { serviceId: { in: projectServices.map(s => s.serviceId) } } } },
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
            },
          },
        },
      });
    } catch (e: any) {
      this.log.error(`[recommendContractorsForProject] prisma.contractor.findMany failed`, e?.meta ?? e);
      throw new InternalServerErrorException('DB query failed (contractors)');
    }

    const scored: ScoreRow<(typeof preselected)[number]>[] = preselected
      .map(c => {
        const ctrServices: MatchService[] = c.services.map(s => ({
          serviceId: s.serviceId,
          slug: s.service?.slug ?? null,
          name: s.service?.name ?? null,
        }));
        const { score, matched } = this.scoreByServices(projectServices, ctrServices);
        return { ...c, matchScore: score, match: { services: matched } };
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



    let contractor: { id: string; services: { serviceId: string; service: { slug: string | null; name: string | null } | null }[] } | null;
    try {
      contractor = await this.prisma.contractor.findUnique({
        where: { userId: userId },
        select: {
          id: true,
          services: {
            select: {
              serviceId: true,
              service: { select: { slug: true, name: true } },
            },
          },
        },
      });
    } catch (e: any) {
      this.log.error(`[recommendProjectsForContractor] prisma.contractor.findUnique failed`, e?.meta ?? e);
      throw new InternalServerErrorException('DB query failed (contractor)');
    }
    if (!contractor) throw new NotFoundException('Contractor not found');

    const contractorServices: MatchService[] = contractor.services.map(s => ({
      serviceId: s.serviceId,
      slug: s.service?.slug ?? null,
      name: s.service?.name ?? null,
    }));
    if (contractorServices.length === 0) return { items: [], count: 0 };

    const whereProjects: any = {
      services: { some: { serviceId: { in: contractorServices.map(s => s.serviceId) } } },
    };
    if (onlyOpen) whereProjects.status = 'OPEN';

    let preselected: any[];
    try {
      preselected = await this.prisma.project.findMany({
        where: whereProjects,
        select: {
          id: true,
          clientId: true,
          status: true,
          title: true,
          description: true,
          services: {
            select: {
              serviceId: true,
              service: { select: { slug: true, name: true } },
            },
          },
        },
      });
    } catch (e: any) {
      this.log.error(`[recommendProjectsForContractor] prisma.project.findMany failed`, e?.meta ?? e);
      throw new InternalServerErrorException('DB query failed (projects)');
    }

    const scored: ScoreRow<(typeof preselected)[number]>[] = preselected
      .map(p => {
        const pServices: MatchService[] = p.services.map(s => ({
          serviceId: s.serviceId,
          slug: s.service?.slug ?? null,
          name: s.service?.name ?? null,
        }));
        const { score, matched } = this.scoreByServices(contractorServices, pServices);
        return { ...p, matchScore: score, match: { services: matched } };
      })
      .filter(x => x.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore || (a.id > b.id ? 1 : -1));

    return { items: scored.slice(0, take), count: scored.length };
  }

  // 3) Исполнители для клиента по сумме всех его проектов
  async recommendContractorsForClient(userId: string, opts?: BaseOpts) {
    if (!userId) throw new BadRequestException('auth required');
    const take = Math.min(Math.max(opts?.take ?? 20, 1), 100);

    let projects: { id: string; services: { serviceId: string }[] }[];
    try {
      projects = await this.prisma.project.findMany({
        where: { clientId: userId },
        select: {
          id: true,
          services: { select: { serviceId: true } },
        },
      });
    } catch (e: any) {
      this.log.error(`[recommendContractorsForClient] prisma.project.findMany failed`, e?.meta ?? e);
      throw new InternalServerErrorException('DB query failed (client projects)');
    }
    if (!projects.length) return { items: [], count: 0 };

    const clientServiceIds = Array.from(new Set(projects.flatMap(p => p.services.map(s => s.serviceId))));
    if (clientServiceIds.length === 0) return { items: [], count: 0 };

    let preselected: any[];
    try {
      preselected = await this.prisma.contractor.findMany({
        where: { services: { some: { serviceId: { in: clientServiceIds } } } },
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
            },
          },
        },
      });
    } catch (e: any) {
      this.log.error(`[recommendContractorsForClient] prisma.contractor.findMany failed`, e?.meta ?? e);
      throw new InternalServerErrorException('DB query failed (contractors)');
    }

    const aggProjectServices: MatchService[] = clientServiceIds.map(id => ({ serviceId: id }));
    const scored: ScoreRow<(typeof preselected)[number]>[] = preselected
      .map(c => {
        const ctrServices: MatchService[] = c.services.map(s => ({
          serviceId: s.serviceId,
          slug: s.service?.slug ?? null,
          name: s.service?.name ?? null,
        }));
        const { score, matched } = this.scoreByServices(aggProjectServices, ctrServices);
        return { ...c, matchScore: score, match: { services: matched } };
      })
      .filter(x => x.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore || (a.id > b.id ? 1 : -1));

    return { items: scored.slice(0, take), count: scored.length };
  }
}
