import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { randomUUID } from 'crypto';
import { join, extname } from 'path';
import fs, { promises as fsp, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { ProjectsListQueryDto } from './dto/projects-list.dto';
import { Prisma } from '@prisma/client';
import { MinioService } from '../minio/minio.service';

const pump = promisify(pipeline);

type ProjectsListParams = {
  // существующие:
  mine?: boolean | string;
  userId?: string | null;
  status?: string;
  category?: string | string[];
  city?: string;
  cursor?: string;
  take?: number;

  // новые:
  propertyType?:
    | 'APARTMENT'
    | 'HOUSE'
    | 'OFFICE'
    | 'RETAIL'
    | 'WAREHOUSE'
    | 'OTHER';
  areaFrom?: number;
  areaTo?: number;
  budgetFrom?: number;
  budgetTo?: number;
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  private async assertAllCategoriesExist(ids: string[]) {
    if (!ids?.length) return;
    const found = await this.prisma.category.count({
      where: { id: { in: ids } },
    });
    if (found !== ids.length) {
      throw new BadRequestException('Some categoryIds do not exist');
    }
  }

  // async create(userId: string, dto: CreateProjectDto) {
  //   // 1) clientId — лучше брать из JWT, а не из dto
  //   const clientId = userId ?? dto.clientId;
  //   if (!clientId) throw new BadRequestException('clientId is required');
  //
  //   // 2) Проверим cityId (если пришёл)
  //   if (dto.cityId) {
  //     const city = await this.prisma.city.findUnique({
  //       where: { id: dto.cityId },
  //     });
  //     if (!city) throw new BadRequestException('cityId is invalid');
  //   }
  //
  //   // 3) Проверим категории (если пришли)
  //   if (dto.categoryIds?.length) {
  //     const categories = await this.prisma.category.findMany({
  //       where: { id: { in: dto.categoryIds } },
  //       select: { id: true },
  //     });
  //     if (categories.length !== dto.categoryIds.length) {
  //       const existing = new Set(categories.map((c) => c.id));
  //       const missing = dto.categoryIds.filter((id) => !existing.has(id));
  //       throw new BadRequestException(
  //         `Unknown categoryIds: ${missing.join(', ')}`,
  //       );
  //     }
  //   }
  //
  //   try {
  //     const project = await this.prisma.project.create({
  //       data: {
  //         clientId,
  //         title: dto.title,
  //         description: dto.description,
  //         cityId: dto.cityId ?? null,
  //
  //         propertyType: dto.propertyType ?? null,
  //         area: dto.area ?? null,
  //         budgetEstimated: dto.budgetEstimated ?? null,
  //
  //         ...(dto.categoryIds?.length
  //           ? { categories: { connect: dto.categoryIds.map((id) => ({ id })) } }
  //           : {}),
  //       },
  //       include: {
  //         coverAttachment: true,
  //         categories: true,
  //         city: {
  //           select: {
  //             id: true,
  //             slug: true,
  //             nameRu: true,
  //             nameKk: true,
  //             nameEn: true,
  //           },
  //         },
  //         client: {
  //           select: { id: true, name: true, avatarUrl: true, cityId: true },
  //         },
  //       },
  //     });
  //
  //     return project;
  //   } catch (e: any) {
  //     // Нормализуем типичные Prisma-ошибки во что-то понятное фронту
  //     if (e instanceof Prisma.PrismaClientKnownRequestError) {
  //       if (e.code === 'P2003') {
  //         // FK constraint failed
  //         throw new BadRequestException(
  //           'Invalid foreign key: check cityId / categoryIds / clientId',
  //         );
  //       }
  //       if (e.code === 'P2002') {
  //         throw new BadRequestException('Unique constraint violation');
  //       }
  //     }
  //     throw e;
  //   }
  // }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        attachments: { orderBy: { sortOrder: 'asc' } },
        coverAttachment: true,
        categories: true,
        services: {
          select: {
            id: true,
            service: {
              select: { name: true },
            },
            selectedCategories: {
              select: { category: true },
            },
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            cityId: true, // ← скалярное поле (boolean флаг)
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  // async update(
  //   id: string,
  //   dto: UpdateProjectDto,
  //   currentUserId?: string | null,
  // ) {
  //   // 0) проект существует + проверка владельца (если передаёшь currentUserId)
  //   const existing = await this.prisma.project.findUnique({
  //     where: { id },
  //     select: { id: true, clientId: true },
  //   });
  //   if (!existing) throw new NotFoundException('Project not found');
  //   if (currentUserId && existing.clientId !== currentUserId) {
  //     throw new ForbiddenException('You are not the owner of this project');
  //   }
  //
  //   // 1) Валидация FK: cityId (если прислали)
  //   if (dto.cityId !== undefined && dto.cityId !== null) {
  //     const city = await this.prisma.city.findUnique({
  //       where: { id: dto.cityId },
  //     });
  //     if (!city) throw new BadRequestException('cityId is invalid');
  //   }
  //
  //   // 2) Валидация категорий (если прислали)
  //   if (dto.categoryIds !== undefined) {
  //     if (!Array.isArray(dto.categoryIds)) {
  //       throw new BadRequestException(
  //         'categoryIds must be an array of strings',
  //       );
  //     }
  //     if (dto.categoryIds.length) {
  //       const ok = await this.prisma.category.findMany({
  //         where: { id: { in: dto.categoryIds } },
  //         select: { id: true },
  //       });
  //       if (ok.length !== dto.categoryIds.length) {
  //         const set = new Set(ok.map((c) => c.id));
  //         const missing = dto.categoryIds.filter((x) => !set.has(x));
  //         throw new BadRequestException(
  //           `Unknown categoryIds: ${missing.join(', ')}`,
  //         );
  //       }
  //     }
  //   }
  //
  //   // 3) Валидация обложки (если прислали coverAttachmentId)
  //   if (dto.coverAttachmentId !== undefined && dto.coverAttachmentId !== null) {
  //     const att = await this.prisma.attachment.findUnique({
  //       where: { id: dto.coverAttachmentId },
  //       select: { id: true, projectId: true },
  //     });
  //     if (!att || att.projectId !== id) {
  //       throw new BadRequestException(
  //         'coverAttachmentId must belong to this project',
  //       );
  //     }
  //   }
  //
  //   // 4) Собираем data только из присланных полей
  //   const data: Prisma.ProjectUpdateInput = {
  //     ...(dto.title !== undefined ? { title: dto.title } : {}),
  //     ...(dto.description !== undefined
  //       ? { description: dto.description }
  //       : {}),
  //
  //     // справочник города
  //     ...(dto.cityId !== undefined ? { cityId: dto.cityId } : {}),
  //
  //     // новые поля
  //     ...(dto.propertyType !== undefined
  //       ? { propertyType: dto.propertyType as any }
  //       : {}),
  //     ...(dto.area !== undefined ? { area: dto.area } : {}),
  //     ...(dto.budgetEstimated !== undefined
  //       ? { budgetEstimated: dto.budgetEstimated }
  //       : {}),
  //
  //     // обложка
  //     ...(dto.coverAttachmentId !== undefined
  //       ? { coverAttachmentId: dto.coverAttachmentId }
  //       : {}),
  //   };
  //
  //   // категории: set заменяет полностью. Если прислали пустой массив — очистим все категории
  //   if (dto.categoryIds !== undefined) {
  //     data.categories = { set: dto.categoryIds.map((id) => ({ id })) };
  //   }
  //
  //   try {
  //     const project = await this.prisma.project.update({
  //       where: { id },
  //       data,
  //       include: {
  //         coverAttachment: true,
  //         categories: { select: { id: true, name: true } },
  //         city: {
  //           select: {
  //             id: true,
  //             slug: true,
  //             nameRu: true,
  //             nameKk: true,
  //             nameEn: true,
  //           },
  //         },
  //         client: {
  //           select: { id: true, name: true, avatarUrl: true, cityId: true },
  //         },
  //       },
  //     });
  //     return project;
  //   } catch (e: any) {
  //     if (e instanceof Prisma.PrismaClientKnownRequestError) {
  //       if (e.code === 'P2003') {
  //         throw new BadRequestException(
  //           'Invalid foreign key: cityId / categoryIds / coverAttachmentId',
  //         );
  //       }
  //       if (e.code === 'P2002') {
  //         throw new BadRequestException('Unique constraint violation');
  //       }
  //     }
  //     throw e;
  //   }
  // }
  //
  async remove(id: string) {
    // каскад удалит вложения, если в схеме onDelete: Cascade
    await this.ensureProject(id);
    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }

  async uploadAttachment(projectId: string, userId: string, req: any) {
    await this.ensureProject(projectId);

    const data = await req.file(); // fastify-multipart
    if (!data) throw new BadRequestException('file is required');

    const { filename, mimetype, file, fields } = data;

    if (!mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image/* files are allowed');
    }

    // sortOrder из полей формы (опционально)
    let sortOrder = 0;
    const so = fields?.sortOrder?.value ?? (fields as any)?.sortOrder;
    if (typeof so !== 'undefined') {
      const parsed = parseInt(String(so), 10);
      if (!Number.isNaN(parsed) && parsed >= 0) sortOrder = parsed;
    } else {
      // как и раньше: берём макс sortOrder и +1
      const last = await this.prisma.attachment.findFirst({
        where: { projectId },
        orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const safeExt = extname(filename || '') || '';
    const newName = `${Date.now()}-${randomUUID()}${safeExt}`;
    const objectName = `projects/${userId}/${newName}`;

    // читаем поток в Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file as any) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const buffer = Buffer.concat(chunks);

    // грузим в MinIO
    await this.minio.uploadBuffer(
      objectName,
      buffer,
      mimetype || 'application/octet-stream',
    );
    const att = await this.prisma.attachment.create({
      data: {
        projectId,
        url: objectName, // в БД ключ
        mime: mimetype,
        sortOrder,
      },
    });
    // публичный URL, с которым фронт уже умеет работать
    const publicUrl = await this.minio.getPublicUrl(att?.url);

    // создать запись Attachment
    // const att = await this.prisma.attachment.create({
    //   data: {
    //     projectId,
    //     url: publicUrl,
    //     mime: mimetype,
    //     sortOrder,
    //   },
    // });

    return { ...att, url: publicUrl };
  }

  // ProjectsService.listAttachments
  async listAttachments(projectId: string) {
    const attachments = await this.prisma.attachment.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return Promise.all(
      attachments.map(async (att) => ({
        ...att,
        url: await this.minio.getPublicUrl(att.url), // <– ТУТ
      })),
    );
  }

  async setCover(projectId: string, attachmentId: string) {
    const att = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, projectId },
    });
    if (!att)
      throw new NotFoundException('Attachment not found for this project');

    return this.prisma.project.update({
      where: { id: projectId },
      data: { coverAttachmentId: attachmentId },
      include: { coverAttachment: true },
    });
  }

  async deleteAttachment(projectId: string, attachmentId: string) {
    const att = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, projectId },
    });
    if (!att)
      throw new NotFoundException('Attachment not found for this project');

    // попытка удалить файл из MinIO
    if (att.url && att.url.startsWith('/uploads/')) {
      const objectName = att.url.replace(/^\/uploads\//, '');
      try {
        await this.minio.deleteObject(objectName);
      } catch (e) {
        // можно залогировать, но падать не будем
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (project?.coverAttachmentId === attachmentId) {
        await tx.project.update({
          where: { id: projectId },
          data: { coverAttachmentId: null },
        });
      }
      await tx.attachment.delete({ where: { id: attachmentId } });
    });

    return { ok: true };
  }

  private async ensureProject(id: string) {
    const exists = await this.prisma.project.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Project not found');
    return exists;
  }

  // private async ensureProject(id: string) {
  //   const exists = await this.prisma.project.findUnique({ where: { id } });
  //   if (!exists) throw new NotFoundException('Project not found');
  //   return exists;
  // }

  async listProjects(
    params: ProjectsListQueryDto & { userId?: string | null },
  ) {
    const take = Math.min(Math.max(Number(params.take) || 20, 1), 100);

    const where: any = {};

    // mine=true → только проекты текущего пользователя
    const mine =
      typeof (params as any).mine === 'string'
        ? (params as any).mine === 'true'
        : Boolean((params as any).mine);

    if (mine && params.userId) {
      where.clientId = params.userId;
    }

    if (params.status) where.status = params.status as any;

    // новый справочник городов
    if ((params as any).cityId) where.cityId = (params as any).cityId;

    // категории (одна или несколько)
    if ((params as any).category) {
      const ids = Array.isArray((params as any).category)
        ? (params as any).category
        : [(params as any).category];
      where.categories = { some: { id: { in: ids } } };
    }

    const query: any = {
      where:{
        clientId: params.userId
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        status: true,
        cityId: true,
        area: true,
        services: {
          select: {
            id: true,
            service: {
              select: { name: true },
            },
            selectedCategories: {
              select: { category: true },
            },
          },
        },

        propertyType: true,
        budgetEstimated: true,
        city: {
          select: {
            id: true,
            slug: true,
            nameRu: true,
            nameKk: true,
            nameEn: true,
          },
        },
        coverAttachment: { select: { id: true, url: true } },
        client: {
          select: { id: true, name: true, avatarUrl: true, cityId: true },
        },
      },
    };

    if (params.cursor) {
      query.cursor = { id: params.cursor };
      query.skip = 1;
    }

    const items = await this.prisma.project.findMany(query);
    const nextCursor =
      items.length === take ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }

  private async resolveServiceCategoriesOrThrow(
    serviceId: string,
    subset?: string[],
  ) {
    // найдём все категории услуги
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, categories: { select: { id: true } } },
    });
    if (!service)
      throw new BadRequestException(`Unknown serviceId=${serviceId}`);

    const allIds = service.categories.map((c) => c.id);

    if (!subset || subset.length === 0) {
      return allIds; // по умолчанию — все категории услуги
    }

    // валидируем, что subset ⊆ allIds
    const set = new Set(allIds);
    const invalid = subset.filter((x) => !set.has(x));
    if (invalid.length) {
      throw new BadRequestException(
        `Categories not in service ${serviceId}: ${invalid.join(', ')}`,
      );
    }
    return subset;
  }

  // объединение без дублей
  private union<T>(arrs: T[][]): T[] {
    const set = new Set<T>();
    arrs.forEach((a) => a.forEach((x) => set.add(x)));
    return [...set];
  }

  // ---- CREATE ----
  async create(userId: string, dto: CreateProjectDto) {
    // валидации FK (cityId, coverAttachment, categories и т.п.) — как мы делали ранее
    // …

    // 1) подготовим услуги и их категории
    let serviceSelections: { serviceId: string; categoryIds: string[] }[] = [];
    if (dto.services?.length) {
      // validate unique serviceIds
      const uniqSvc = new Set(dto.services.map((s) => s.serviceId));
      if (uniqSvc.size !== dto.services.length) {
        throw new BadRequestException('Duplicate serviceId in services array');
      }

      // получим для каждой услуги конечный набор категорий
      serviceSelections = await Promise.all(
        dto.services.map(async (s) => ({
          serviceId: s.serviceId,
          categoryIds: await this.resolveServiceCategoriesOrThrow(
            s.serviceId,
            s.categoryIds,
          ),
        })),
      );
    }

    // 2) итоговые категории проекта — объединение всех категорий выбранных услуг
    const finalProjectCategoryIds = this.union(
      serviceSelections.map((s) => s.categoryIds),
    );

    // 3) транзакция: создаём проект, проставляем categories, создаём ProjectService + выбранные категории
    return await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          clientId: userId,
          title: dto.title,
          description: dto.description,
          cityId: dto.cityId ?? null,
          propertyType: dto.propertyType ?? null,
          area: dto.area ?? null,
          budgetEstimated: dto.budgetEstimated ?? null,
          ...(finalProjectCategoryIds.length
            ? {
                categories: {
                  connect: finalProjectCategoryIds.map((id) => ({ id })),
                },
              }
            : {}),
        },
        select: { id: true },
      });

      // создаём связи "проект ↔ услуга" + их выбранные категории
      for (const s of serviceSelections) {
        const link = await tx.projectService.create({
          data: { projectId: project.id, serviceId: s.serviceId },
          select: { id: true },
        });
        if (s.categoryIds.length) {
          await tx.projectServiceSelectedCategory.createMany({
            data: s.categoryIds.map((cid) => ({
              projectServiceId: link.id,
              categoryId: cid,
            })),
            skipDuplicates: true,
          });
        }
      }

      // вернём проект с полями для фронта
      return tx.project.findUnique({
        where: { id: project.id },
        include: {
          city: {
            select: {
              id: true,
              slug: true,
              nameRu: true,
              nameKk: true,
              nameEn: true,
            },
          },
          categories: { select: { id: true, name: true } },
          services: {
            select: {
              id: true,
              service: { select: { id: true, name: true, slug: true } },
              selectedCategories: {
                select: { category: { select: { id: true, name: true } } },
              },
            },
          },
          coverAttachment: true,
          client: {
            select: { id: true, name: true, avatarUrl: true, cityId: true },
          },
        },
      });
    });
  }

  // ---- UPDATE ----
  // Полная замена набора услуг и выбранных категорий
  async update(
    id: string,
    dto: UpdateProjectDto,
    currentUserId?: string | null,
  ) {
    // проверка владельца и существования
    const existing = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    });
    if (!existing) throw new NotFoundException('Project not found');
    if (currentUserId && existing.clientId !== currentUserId) {
      throw new ForbiddenException('You are not the owner of this project');
    }

    // подготовка услуг
    let serviceSelections:
      | { serviceId: string; categoryIds: string[] }[]
      | undefined = undefined;
    if (dto.services) {
      const uniqSvc = new Set(dto.services.map((s) => s.serviceId));
      if (uniqSvc.size !== dto.services.length) {
        throw new BadRequestException('Duplicate serviceId in services array');
      }
      serviceSelections = await Promise.all(
        dto.services.map(async (s) => ({
          serviceId: s.serviceId,
          categoryIds: await this.resolveServiceCategoriesOrThrow(
            s.serviceId,
            s.categoryIds,
          ),
        })),
      );
    }

    // Итоговые категории проекта — объединение всех выбранных категорий всех услуг (если services присланы)
    const finalProjectCategoryIds = serviceSelections
      ? this.union(serviceSelections.map((s) => s.categoryIds))
      : undefined;

    return await this.prisma.$transaction(async (tx) => {
      // 1) обычные поля проекта
      const data: Prisma.ProjectUpdateInput = {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.cityId !== undefined ? { cityId: dto.cityId } : {}),
        ...(dto.propertyType !== undefined
          ? { propertyType: dto.propertyType as any }
          : {}),
        ...(dto.area !== undefined ? { area: dto.area } : {}),
        ...(dto.budgetEstimated !== undefined
          ? { budgetEstimated: dto.budgetEstimated }
          : {}),
        ...(dto.coverAttachmentId !== undefined
          ? { coverAttachmentId: dto.coverAttachmentId }
          : {}),
      };

      // 2) если прислали services — заменим набор услуг + selections; и заменим Project.categories на union
      if (serviceSelections) {
        // очистим старые связи и выбранные категории
        const oldLinks = await tx.projectService.findMany({
          where: { projectId: id },
          select: { id: true },
        });
        if (oldLinks.length) {
          await tx.projectServiceSelectedCategory.deleteMany({
            where: { projectServiceId: { in: oldLinks.map((l) => l.id) } },
          });
          await tx.projectService.deleteMany({ where: { projectId: id } });
        }

        // создадим новые связи
        for (const s of serviceSelections) {
          const link = await tx.projectService.create({
            data: { projectId: id, serviceId: s.serviceId },
            select: { id: true },
          });
          if (s.categoryIds.length) {
            await tx.projectServiceSelectedCategory.createMany({
              data: s.categoryIds.map((cid) => ({
                projectServiceId: link.id,
                categoryId: cid,
              })),
              skipDuplicates: true,
            });
          }
        }

        // заменим категории проекта на объединение
        data.categories = {
          set: (finalProjectCategoryIds ?? []).map((cid) => ({ id: cid })),
        };
      }

      await tx.project.update({ where: { id }, data });

      // выдаём обновлённую карточку
      return tx.project.findUnique({
        where: { id },
        include: {
          city: {
            select: {
              id: true,
              slug: true,
              nameRu: true,
              nameKk: true,
              nameEn: true,
            },
          },
          categories: { select: { id: true, name: true } },
          services: {
            select: {
              id: true,
              service: { select: { id: true, name: true, slug: true } },
              selectedCategories: {
                select: { category: { select: { id: true, name: true } } },
              },
            },
          },
          coverAttachment: true,
          client: {
            select: { id: true, name: true, avatarUrl: true, cityId: true },
          },
        },
      });
    });
  }

  async uploadFile(projectId: string, userId: string, req: any) {
    await this.ensureProject(projectId);

    const data = await req.file(); // fastify-multipart
    if (!data) throw new BadRequestException('file is required');

    const { filename, mimetype, file, fields } = data;

    // ✅ НЕТ ограничения image/* — разрешаем любые типы
    // (при желании: добавь белый список здесь)

    // sortOrder (опционально)
    let sortOrder = 0;
    const so = (fields as any)?.sortOrder?.value ?? (fields as any)?.sortOrder;
    if (typeof so !== 'undefined') {
      const parsed = parseInt(String(so), 10);
      if (!Number.isNaN(parsed) && parsed >= 0) sortOrder = parsed;
    } else {
      const last = await this.prisma.attachment.findFirst({
        where: { projectId },
        orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const safeExt = extname(filename || '') || '';
    const newName = `${Date.now()}-${randomUUID()}${safeExt}`;

    // 👉 складываем документы отдельно от картинок:
    // было: `projects/${userId}/${newName}`
    const objectName = `projects/${userId}/files/${newName}`;

    // читаем поток
    const chunks: Buffer[] = [];
    for await (const chunk of file as any) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const buffer = Buffer.concat(chunks);

    await this.minio.uploadBuffer(
      objectName,
      buffer,
      mimetype || 'application/octet-stream',
    );

    const att = await this.prisma.attachment.create({
      data: {
        projectId,
        url: objectName, // ключ в MinIO
        mime: mimetype ?? 'application/octet-stream',
        sortOrder,
      },
    });

    const publicUrl = await this.minio.getPublicUrl(att.url);
    return { ...att, url: publicUrl };
  }

  listFiles(projectId: string) {
    return this.prisma.attachment.findMany({
      where: {
        projectId,
        NOT: { mime: { startsWith: 'image/' } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }).then(rows =>
      Promise.all(rows.map(async (r) => ({
        ...r,
        url: await this.minio.getPublicUrl(r.url),
      })))
    );
  }

}
