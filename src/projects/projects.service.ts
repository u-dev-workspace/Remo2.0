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

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        clientId,
        title: dto.title,
        description: dto.description,
        city: dto.city ?? null,
      },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        attachments: { orderBy: { sortOrder: 'asc' } },
        coverAttachment: true,
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    // Проверка существования (даст нормальную 404 вместо 200/0 rows)
    await this.ensureProject(id);

    return this.prisma.project.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        city: dto.city,
        coverAttachmentId: dto.coverAttachmentId ?? undefined,
      },
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
}
