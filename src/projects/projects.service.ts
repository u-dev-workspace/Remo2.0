import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { randomUUID } from 'crypto';
import { join, extname } from 'path';
import fs, { promises as fsp, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pump = promisify(pipeline);

type ProjectsListParams = {
  mine?: boolean;
  userId?: string;
  status?: string;
  city?: string;
  categoryId?: string;
  take?: number;
  cursor?: string;
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

  async create(clientId: string, dto: CreateProjectDto) {
    // проверим категории, если передали
    await this.assertAllCategoriesExist(dto.categoryIds ?? []);

    return this.prisma.project.create({
      data: {
        clientId,
        title: dto.title,
        description: dto.description,
        city: dto.city ?? null,
        ...(dto.categoryIds?.length
          ? { categories: { connect: dto.categoryIds.map((id) => ({ id })) } }
          : {}),
      },
      include: { categories: true },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        attachments: { orderBy: { sortOrder: 'asc' } },
        coverAttachment: true,
        categories: true,
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.ensureProject(id);

    // coverAttachmentId как раньше
    const coverAttachmentId =
      Object.prototype.hasOwnProperty.call(dto, 'coverAttachmentId')
        ? dto.coverAttachmentId ?? null
        : undefined;

    // если поле categoryIds присутствует — полная замена
    let categoriesUpdate: { set: { id: string }[] } | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(dto, 'categoryIds')) {
      const ids = dto.categoryIds ?? [];
      await this.assertAllCategoriesExist(ids);
      categoriesUpdate = { set: ids.map((cid) => ({ id: cid })) };
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        city: dto.city,
        coverAttachmentId,
        ...(categoriesUpdate ? { categories: categoriesUpdate } : {}),
      },
      include: { categories: true },
    });
  }

  async remove(id: string) {
    // каскад удалит вложения, если в схеме onDelete: Cascade
    await this.ensureProject(id);
    await this.prisma.project.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- Multipart upload ----------
  /**
   * Принимает multipart через Fastify: const data = await req.file()
   * Сохраняет файл в uploads/projects/<userId>/<generatedName>
   * Создаёт Attachment с url вида /uploads/projects/<userId>/<file>
   */
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

  async list(params: ProjectsListParams) {
    const where: any = {};

    if (params.mine && params.userId) {
      where.clientId = params.userId;
    }
    if (params.status) where.status = params.status as any;
    if (params.city) where.city = params.city;
    if (params.categoryId) where.categories = { some: { id: params.categoryId } };

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
}

