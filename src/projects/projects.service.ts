import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { randomUUID } from 'crypto';
import { join, extname } from 'path';
import fs, { promises as fsp, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { ProjectsListQueryDto } from './dto/projects-list.dto';

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
  propertyType?: 'APARTMENT' | 'HOUSE' | 'OFFICE' | 'RETAIL' | 'WAREHOUSE' | 'OTHER';
  areaFrom?: number;
  areaTo?: number;
  budgetFrom?: number;
  budgetTo?: number;
};
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAllCategoriesExist(ids: string[]) {
    if (!ids?.length) return;
    const found = await this.prisma.category.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      throw new BadRequestException('Some categoryIds do not exist');
    }
  }

  async create(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        clientId: userId,
        title: dto.title,
        description: dto.description,
        cityId: dto.city ?? null,

        // новые поля
        propertyType: dto.propertyType ?? null,
        area: dto.area ?? null,
        budgetEstimated: dto.budgetEstimated ?? null,

        // категории
        ...(dto.categoryIds
          ? { categories: { connect: dto.categoryIds.map(id => ({ id })) } }
          : {}),
      },
      include: {
        coverAttachment: true,
        categories: true,
        client: { select: { id: true, name: true, cityId: true } },
      },
    });

    return project;
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        attachments: { orderBy: { sortOrder: 'asc' } },
        coverAttachment: true,
        categories: true,
        client: {
          select: {
            id: true,
            name: true,
            cityId: true,                // ← скалярное поле (boolean флаг)

          },
        },

      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.ensureProject(id);

    const data: any = {
      // базовые поля
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),

      // новые поля
      ...(dto.propertyType !== undefined ? { propertyType: dto.propertyType } : {}),
      ...(dto.area !== undefined ? { area: dto.area } : {}),
      ...(dto.budgetEstimated !== undefined ? { budgetEstimated: dto.budgetEstimated } : {}),

      // обложка
      ...(dto.coverAttachmentId !== undefined ? { coverAttachmentId: dto.coverAttachmentId } : {}),
    };

    // категории: поддержка очистки, частичного обновления
    if (dto.categoryIds !== undefined) {
      data.categories = {
        set: dto.categoryIds.map(id => ({ id })), // если [], то очистит все категории
      };
    }

    const project = await this.prisma.project.update({
      where: { id }, // ← исправлено
      data,
      include: {
        coverAttachment: true,
        categories: true,
        client: { select: { id: true, name: true, cityId: true } },
      },
    });

    return project;
  }


  async remove(id: string) {
    // каскад удалит вложения, если в схеме onDelete: Cascade
    await this.ensureProject(id);
    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- upload epta vse rabotaet ----------
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
    const so = fields?.sortOrder?.value ?? fields?.sortOrder;
    if (typeof so !== 'undefined') {
      const parsed = parseInt(String(so), 10);
      if (!Number.isNaN(parsed) && parsed >= 0) sortOrder = parsed;
    } else {
      // если не передан — поставим следующий по порядку
      const last = await this.prisma.attachment.findFirst({
        where: { projectId },
        orderBy: [{ sortOrder: 'desc' }, { createdAt: 'desc' }],
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    // директория для пользователя
    const userDir = join(process.cwd(), 'uploads', 'projects', userId);
    await fsp.mkdir(userDir, { recursive: true });

    // имя файла
    const safeExt = extname(filename || '') || '';
    const newName = `${Date.now()}-${randomUUID()}${safeExt}`;
    const fullPath = join(userDir, newName);

    // сохранить поток на диск
    await pump(file, (await import('fs')).createWriteStream(fullPath));

    // публичный URL (через fastifyStatic prefix /uploads)
    const publicUrl = `/uploads/projects/${userId}/${newName}`;

    // создать запись Attachment
    const att = await this.prisma.attachment.create({
      data: {
        projectId,
        url: publicUrl,
        mime: mimetype,
        sortOrder,
      },
    });

    return att;
  }

  async listAttachments(projectId: string) {
    await this.ensureProject(projectId);
    return this.prisma.attachment.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async setCover(projectId: string, attachmentId: string) {
    const att = await this.prisma.attachment.findFirst({ where: { id: attachmentId, projectId } });
    if (!att) throw new NotFoundException('Attachment not found for this project');

    return this.prisma.project.update({
      where: { id: projectId },
      data: { coverAttachmentId: attachmentId },
      include: { coverAttachment: true },
    });
  }

  async deleteAttachment(projectId: string, attachmentId: string) {
    const att = await this.prisma.attachment.findFirst({ where: { id: attachmentId, projectId } });
    if (!att) throw new NotFoundException('Attachment not found for this project');

    await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (project?.coverAttachmentId === attachmentId) {
        await tx.project.update({ where: { id: projectId }, data: { coverAttachmentId: null } });
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

  async listProjects(params: ProjectsListQueryDto & { userId?: string | null }) {
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
      where,
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
        propertyType: true,
        budgetEstimated: true,
        city: { select: { id: true, slug: true, nameRu: true, nameKk: true, nameEn: true } },
        coverAttachment: { select: { id: true, url: true } },
        categories: { select: { id: true, name: true } },
        client: { select: { id: true, name: true, avatarUrl: true, cityId: true } },
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
}

