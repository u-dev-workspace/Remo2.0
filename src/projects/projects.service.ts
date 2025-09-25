import { Injectable } from '@nestjs/common';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class ProjectsService {
    constructor(private prisma: PrismaService, private uploads: UploadsService) {}

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

    async listAttachments(projectId: string) {
        return this.prisma.attachment.findMany({
            where: { projectId },
            orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }], // если добавишь createdAt
        });
    }

    async addAttachment(projectId: string, body: { objectKey: string; url: string; mime: string; width?: number; height?: number; sizeBytes?: number; caption?: string; isCover?: boolean }) {
        // проверим, что проект существует
        const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
        if (!project) throw new NotFoundException('Project not found');

        // если isCover = true — снимем обложку с других
        if (body.isCover) {
            await this.prisma.attachment.updateMany({ where: { projectId }, data: { isCover: false } });
        }

        // узнаем максимальный sortOrder и поставим следующий
        const max = await this.prisma.attachment.aggregate({ where: { projectId }, _max: { sortOrder: true } });
        const sortOrder = (max._max.sortOrder ?? -1) + 1;

        return this.prisma.attachment.create({
            data: {
                projectId,
                objectKey: body.objectKey,
                url: body.url,
                mime: body.mime,
                width: body.width,
                height: body.height,
                sizeBytes: body.sizeBytes,
                caption: body.caption,
                isCover: !!body.isCover,
                sortOrder,
            },
        });
    }

    async updateAttachment(projectId: string, attachmentId: string, body: { caption?: string; isCover?: boolean }) {
        const att = await this.prisma.attachment.findFirst({ where: { id: attachmentId, projectId } });
        if (!att) throw new NotFoundException('Attachment not found');

        // если ставим обложку — снять со всех остальных
        if (body.isCover === true) {
            await this.prisma.attachment.updateMany({ where: { projectId }, data: { isCover: false } });
        }

        return this.prisma.attachment.update({
            where: { id: attachmentId },
            data: { caption: body.caption, isCover: body.isCover ?? att.isCover },
        });
    }

    async reorderAttachments(projectId: string, items: { id: string; sortOrder: number }[]) {
        const ids = items.map(i => i.id);
        const count = await this.prisma.attachment.count({ where: { projectId, id: { in: ids } } });
        if (count !== items.length) throw new BadRequestException('Some attachments not found for this project');

        // транзакция по обновлению порядков
        await this.prisma.$transaction(
            items.map(i => this.prisma.attachment.update({ where: { id: i.id }, data: { sortOrder: i.sortOrder } }))
        );
        return { ok: true };
    }

    async removeAttachment(projectId: string, attachmentId: string) {
        const att = await this.prisma.attachment.findFirst({ where: { id: attachmentId, projectId } });
        if (!att) throw new NotFoundException('Attachment not found');

        await this.prisma.attachment.delete({ where: { id: att.id } });
        // удалим объект из S3 (если нужно сразу чистить)
        try { await this.uploads.deleteObject(att.objectKey); } catch {}
        return { ok: true };
    }
}
