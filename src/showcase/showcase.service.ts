import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReorderShowcaseDto, SetShowcaseDto } from './dto/showcase.dto';

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
      select: { attachmentId: true, position: true },
    });
    return { items: list };
  }

  async setContractorShowcase(contractorId: string, dto: SetShowcaseDto) {
    if (!dto.items?.length) return { items: [] };

    const positions = new Set(dto.items.map(i => i.position));
    if (positions.size !== dto.items.length) {
      throw new BadRequestException('Positions must be unique');
    }

    const toCreate = dto.items.map(i => ({
      contractorId,
      attachmentId: i.attachmentId,
      position: i.position,
    }));

    await this.prisma.$transaction(async (tx) => {
      await tx.contractorShowcaseImage.deleteMany({ where: { contractorId } });
      await tx.contractorShowcaseImage.createMany({ data: toCreate });
    });

    return this.getContractorShowcase(contractorId);
  }

  async reorderContractorShowcase(contractorId: string, dto: ReorderShowcaseDto) {
    const ids = dto.attachmentIds.slice(0, 3);
    await this.prisma.$transaction(
      ids.map((attachmentId, idx) =>
        this.prisma.contractorShowcaseImage.update({
          where: { contractorId_attachmentId: { contractorId, attachmentId } },
          data: { position: idx + 1 },
        }),
      ),
    );
    return this.getContractorShowcase(contractorId);
  }

  async removeContractorShowcaseItem(contractorId: string, attachmentId: string) {
    const existed = await this.prisma.contractorShowcaseImage.findUnique({
      where: { contractorId_attachmentId: { contractorId, attachmentId } },
    });
    if (!existed) throw new NotFoundException('Showcase item not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.contractorShowcaseImage.delete({
        where: { contractorId_attachmentId: { contractorId, attachmentId } },
      });
      const rest = await tx.contractorShowcaseImage.findMany({
        where: { contractorId },
        orderBy: { position: 'asc' },
      });
      for (let i = 0; i < rest.length; i++) {
        if (rest[i].position !== i + 1) {
          await tx.contractorShowcaseImage.update({
            where: { id: rest[i].id },
            data: { position: i + 1 },
          });
        }
      }
    });

    return this.getContractorShowcase(contractorId);
  }
}
