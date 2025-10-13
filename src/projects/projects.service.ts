// src/projects/projects.service.ts
import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { join, basename } from 'path';
import { createWriteStream, promises as fs } from 'fs';
import { randomUUID, createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import type { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';

type AddMultipartArgs = {
    filename: string;
    mimetype?: string;
    fileStream: Readable;
    caption?: string | null;
    isCover?: boolean;
    width?: number;
    height?: number;
    sizeBytes?: number;
    req?: FastifyRequest;
};

@Injectable()
export class ProjectsService {
    private root = join(process.cwd(), 'uploads');     // /uploads
    private folder = 'projects';                       // uploads/projects/<projectId>/

    constructor(
      private readonly prisma: PrismaService,
      private readonly config: ConfigService,
    ) {}

    async create(dto:any, clientId:string) {
        return this.prisma.project.create({
            data: {
                clientId,
                title: dto.title,
                description: dto.description,
                placeType: dto.placeType,
                areaM2: dto.areaM2,
                budgetMin: dto.budgetMin,
                budgetMax: dto.budgetMax,
                city: dto.city,
                categories: { connect: dto.categories.map((id:string)=>({ id })) },
            }
        });
    }

    async listOpen(q:any) {
        const page = Number(q.page ?? 1), limit = Math.min(Number(q.limit ?? 20), 50);
        const where:any = { status: 'OPEN' };
        if (q.city) where.city = q.city;
        if (q.categoryId) where.categories = { some: { id: q.categoryId } };
        const [total, data] = await this.prisma.$transaction([
            this.prisma.project.count({ where }),
            this.prisma.project.findMany({
                where, orderBy: { createdAt: 'desc' }, skip:(page-1)*limit, take:limit,
                include:{ categories:true, client:{ select:{ id:true, name:true, city:true } } }
            })
        ]);
        return { data, page, limit, total };
    }

    get(id:string) {
        return this.prisma.project.findUnique({
            where: { id },
            include: { categories:true, attachments:true, client:true }
        });
    }

    // ---------- utils ----------


    private async sha256File(absPath: string): Promise<string> {
        const buf = await fs.readFile(absPath);
        return createHash('sha256').update(buf).digest('hex');
    }

    private async ensureProjectExists(projectId: string) {
        const exists = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true }});
        if (!exists) throw new NotFoundException('Проект не найден');
    }

    // ---------- public API ----------
    async listAttachments(projectId: string) {
        await this.ensureProjectExists(projectId);
        return this.prisma.attachment.findMany({
            where: { projectId },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });
    }

    /**
     * Создание из multipart: кладём файл в uploads/projects/<projectId>/
     * и создаём запись Attachment (url указывает на /uploads/...).
     */
    async addAttachmentMultipart(projectId: string, args: AddMultipartArgs) {
        await this.ensureProjectExists(projectId);

        const { filename, mimetype, fileStream } = args;
        if (!fileStream) throw new BadRequestException('Пустой файл');

        // 1) FS: готовим имя и путь
        const safeName = filename?.replace(/[^\p{L}\p{N}\.\-_ ]/gu, '_') || 'file';
        const unique = `${Date.now()}_${randomUUID()}`.slice(0, 36);
        const finalName = `${unique}_${safeName}`;

        const dirAbs = join(this.root, this.folder, projectId);
        await fs.mkdir(dirAbs, { recursive: true });

        const absPath = join(dirAbs, finalName);
        const write = createWriteStream(absPath);
        await pipeline(fileStream, write);

        // 2) Собираем objectKey/url
        const objectKey = join(this.folder, projectId, finalName).replace(/\\/g, '/'); // projects/<projectId>/<file>
        const urlPath = `/uploads/${objectKey}`;

        // 3) Метаданные
        const st = await fs.stat(absPath);
        const checksum = await this.sha256File(absPath);

        // width/height — если не передали, оставим undefined → в БД будет NULL
        const width = args.width;
        const height = args.height;
        const sizeBytes = args.sizeBytes ?? st.size;
        const caption = args.caption ?? null;
        const isCover = args.isCover ?? false;
        const mime = mimetype || 'application/octet-stream';

        // 4) sortOrder = max + 1
        const last = await this.prisma.attachment.findFirst({
            where: { projectId },
            orderBy: { sortOrder: 'desc' },
            select: { sortOrder: true },
        });
        const nextOrder = (last?.sortOrder ?? -1) + 1;

        // 5) Запись в БД
        const rec = await this.prisma.attachment.create({
            data: {
                projectId,
                url: urlPath,
                mime,
                width,
                height,
                sizeBytes,
                caption,
                sortOrder: nextOrder,
                isCover,
                objectKey,          // уникальный
                checksum,           // уникальный (может быть null, но мы считаем)
            },
        });

        // Вернём с абсолютным URL (удобно фронту)
        const base = this.buildBaseUrl(args.req);
        return { ...rec, url: `${base}${rec.url}` };
    }

    async updateAttachment(
      projectId: string,
      attachmentId: string,
      body: { caption?: string; isCover?: boolean },
    ) {
        const att = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
        if (!att || att.projectId !== projectId) {
            throw new NotFoundException('Вложение не найдено в проекте');
        }

        // если ставим isCover=true, снимем со всех остальных
        if (body.isCover === true) {
            await this.prisma.attachment.updateMany({
                where: { projectId, NOT: { id: attachmentId } },
                data: { isCover: false },
            });
        }

        return this.prisma.attachment.update({
            where: { id: attachmentId },
            data: {
                caption: body.caption ?? undefined,
                isCover: body.isCover ?? undefined,
            },
        });
    }

    async reorderAttachments(projectId: string, items: { id: string; sortOrder: number }[]) {
        await this.ensureProjectExists(projectId);

        // проверим все id принадлежат проекту
        const ids = items.map(i => i.id);
        const existing = await this.prisma.attachment.findMany({
            where: { id: { in: ids }, projectId },
            select: { id: true },
        });
        const missing = ids.filter(id => !existing.find(e => e.id === id));
        if (missing.length) throw new BadRequestException(`Некорректные id: ${missing.join(', ')}`);

        // батч-апдейты
        await this.prisma.$transaction(
          items.map(i =>
            this.prisma.attachment.update({ where: { id: i.id }, data: { sortOrder: i.sortOrder } }),
          ),
        );

        return { message: 'OK' };
    }

    async removeAttachment(projectId: string, attachmentId: string) {
        const att = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
        if (!att || att.projectId !== projectId) {
            throw new NotFoundException('Вложение не найдено в проекте');
        }

        // удаляем файл с диска
        const absPath = join(this.root, att.url.replace(/^\/?uploads\/?/, ''));
        await fs.unlink(absPath).catch(() => null);

        await this.prisma.attachment.delete({ where: { id: attachmentId } });
        return { message: 'Файл и запись удалены' };
    }
}
