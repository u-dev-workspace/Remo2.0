import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReorderShowcaseDto, SetShowcaseDto } from './dto/showcase.dto';
import { Prisma } from '@prisma/client';
import { PrismaCodes } from '../common/prisma-codes';

@Injectable()
export class ShowcaseService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- PROJECT ----------
  async getProjectShowcase(projectId: string) {
    const list = await this.prisma.projectShowcaseImage.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
      select: { attachmentId: true, position: true },
    });
    return { items: list };
  }

  async setProjectShowcase(projectId: string, dto: SetShowcaseDto) {
    if (!dto.items?.length) return { items: [] };

    // нормализуем и предотвращаем дубликаты позиций
    const positions = new Set(dto.items.map(i => i.position));
    if (positions.size !== dto.items.length) {
      throw new BadRequestException('Positions must be unique');
    }

    const toCreate = dto.items.map(i => ({
      projectId,
      attachmentId: i.attachmentId,
      position: i.position,
    }));

    // транзакция: удаляем всё и ставим заново (3 записи максимум — ок)
    await this.prisma.$transaction(async (tx) => {
      await tx.projectShowcaseImage.deleteMany({ where: { projectId } });
      await tx.projectShowcaseImage.createMany({ data: toCreate });
    });

    return this.getProjectShowcase(projectId);
  }

  async reorderProjectShowcase(projectId: string, dto: ReorderShowcaseDto) {
    const ids = dto.attachmentIds.slice(0, 3);
    // пронумеруем 1..n
    await this.prisma.$transaction(
      ids.map((attachmentId, idx) =>
        this.prisma.projectShowcaseImage.update({
          where: { projectId_attachmentId: { projectId, attachmentId } },
          data: { position: idx + 1 },
        }),
      ),
    );
    return this.getProjectShowcase(projectId);
  }

  async removeProjectShowcaseItem(projectId: string, attachmentId: string) {
    const existed = await this.prisma.projectShowcaseImage.findUnique({
      where: { projectId_attachmentId: { projectId, attachmentId } },
    });
    if (!existed) throw new NotFoundException('Showcase item not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.projectShowcaseImage.delete({
        where: { projectId_attachmentId: { projectId, attachmentId } },
      });
      // После удаления пересоберём позиции слева-направо
      const rest = await tx.projectShowcaseImage.findMany({
        where: { projectId },
        orderBy: { position: 'asc' },
      });
      for (let i = 0; i < rest.length; i++) {
        if (rest[i].position !== i + 1) {
          await tx.projectShowcaseImage.update({
            where: { id: rest[i].id },
            data: { position: i + 1 },
          });
        }
      }
    });

    return this.getProjectShowcase(projectId);
  }

  // ---------- CONTRACTOR ----------
  async getContractorShowcase(contractorId: string) {
    const list = await this.prisma.contractorShowcaseImage.findMany({
      where: { contractorId },
      orderBy: { position: 'asc' },
      select: { contractorAttachmentId: true, position: true },
    });

    // наружу отдаем старое имя поля (DTO ожидает attachmentId)
    return {
      items: list.map((i) => ({
        attachmentId: i.contractorAttachmentId,
        position: i.position,
      })),
    };
  }

  /** POST /contractors/:contractorId/showcase */
  async setContractorShowcase(contractorId: string, dto: SetShowcaseDto) {
    try {
      if (!dto.items?.length) {
        // очищаем витрину
        await this.prisma.contractorShowcaseImage.deleteMany({ where: { contractorId } });
        return { items: [] };
      }

      // уникальность позиций
      const positions = new Set(dto.items.map((i) => i.position));
      if (positions.size !== dto.items.length) {
        throw new BadRequestException('Positions must be unique (1..3)');
      }

      // проверка существования и принадлежности вложений исполнителю
      const ids = dto.items.map((i) => i.attachmentId);
      const found = await this.prisma.contractorAttachment.findMany({
        where: { id: { in: ids }, contractorId },
        select: { id: true },
      });
      if (found.length !== ids.length) {
        throw new BadRequestException(
          'Some attachmentIds do not exist or do not belong to this contractor',
        );
      }

      const toCreate = dto.items.map((i) => ({
        contractorId,
        contractorAttachmentId: i.attachmentId, // <— ключевой фикс
        position: i.position,
      }));

      await this.prisma.$transaction(async (tx) => {
        await tx.contractorShowcaseImage.deleteMany({ where: { contractorId } });
        await tx.contractorShowcaseImage.createMany({ data: toCreate });
      });

      return this.getContractorShowcase(contractorId);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === PrismaCodes.UNIQUE_VIOLATION) {
          // нарушение уникального индекса (позиция/вложение)
          throw new BadRequestException(
            'Duplicate position or attachment for this contractor',
          );
        }
        if (e.code === PrismaCodes.FOREIGN_KEY_VIOLATION) {
          // внешние ключи
          throw new BadRequestException(
            'Attachment not found or wrong type/table for contractor showcase',
          );
        }
      }
      throw e;
    }
  }

  /** PATCH /contractors/:contractorId/showcase/reorder */
  async reorderContractorShowcase(contractorId: string, dto: ReorderShowcaseDto) {
    const ids = dto.attachmentIds.slice(0, 3);
    if (!ids.length) return this.getContractorShowcase(contractorId);

    // проверка принадлежности всех id этому исполнителю
    const found = await this.prisma.contractorShowcaseImage.findMany({
      where: { contractorId, contractorAttachmentId: { in: ids } },
      select: { id: true, contractorAttachmentId: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException(
        'Some attachmentIds are not in showcase for this contractor',
      );
    }

    const posById = new Map(ids.map((id, idx) => [id, idx + 1]));
    await this.prisma.$transaction(
      found.map((row) =>
        this.prisma.contractorShowcaseImage.update({
          where: { id: row.id },
          data: { position: posById.get(row.contractorAttachmentId)! },
        }),
      ),
    );

    return this.getContractorShowcase(contractorId);
  }

  /** DELETE /contractors/:contractorId/showcase/:attachmentId */
  async removeContractorShowcaseItem(contractorId: string, attachmentId: string) {
    // ищем по составному уникальному индексу @@unique([contractorId, contractorAttachmentId])
    const existed = await this.prisma.contractorShowcaseImage.findUnique({
      where: {
        contractorId_contractorAttachmentId: {
          contractorId,
          contractorAttachmentId: attachmentId,
        },
      },
      select: { id: true },
    });
    if (!existed) throw new NotFoundException('Showcase item not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.contractorShowcaseImage.delete({ where: { id: existed.id } });

      // переиндексация позиций 1..n без дырок
      const rest = await tx.contractorShowcaseImage.findMany({
        where: { contractorId },
        orderBy: { position: 'asc' },
        select: { id: true, position: true },
      });

      for (let i = 0; i < rest.length; i++) {
        const need = i + 1;
        if (rest[i].position !== need) {
          await tx.contractorShowcaseImage.update({
            where: { id: rest[i].id },
            data: { position: need },
          });
        }
      }
    });

    return this.getContractorShowcase(contractorId);
  }
}
