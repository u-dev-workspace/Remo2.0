import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateContractorDto } from './dto/update-contractor.dto';
import { take } from 'rxjs';
import { ContractorServiceInput } from './dto/contractor-service-input.dto';
import { use } from 'passport';

@Injectable()
export class ContractorProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfileByUserId(userId: string) {
    console.log('userId =>', userId);
    const contractor = await this.prisma.contractor.findUnique({
      where: { userId },
      include: {
        city:{
          select:{
            id:true,
            nameRu:true,
            nameKk:true,
            nameEn:true,
          }
        },
        user:{
          select: {
            name:true,
            avatarUrl:true,
          }
        },
        services: {select: { serviceId:true, service:{select: {name:true}}, selectedCategories:{select:{category:{select:{name:true}}}}}},
      },
    });
    console.log('contractor =>', contractor);
    if (!contractor)
      throw new NotFoundException('Contractor profile not found');
    return contractor;
  }

  async getProfileByContractorId(contractorId: string) {
    console.log('userId =>', contractorId);
    const contractor = await this.prisma.contractor.findUnique({
      where: { id: contractorId },
      include: {
        categories: true,
        ContractorAttachment: { take: 3 },
        city:{
          select:{
            id:true,
            nameRu:true,
            nameKk:true,
            nameEn:true,
          }
        },
        user:{
          select: {
            name:true,
            avatarUrl:true,
          }
        },
        services: {select: { serviceId:true, service:{select: {name:true}}, selectedCategories:true}}
      },
    });
    console.log('contractor =>', contractor);
    if (!contractor)
      throw new NotFoundException('Contractor profile not found');
    return contractor;
  }

  private async getByUserIdOrThrow(userId: string) {
    const contractor = await this.prisma.contractor.findUnique({
      where: { userId },
      include: {
        services:true
      }
    });
    if (!contractor) throw new NotFoundException('Profile not found');
    return contractor;
  }

  private async assertAllCategoriesExist(ids: string[]) {
    if (!ids?.length) return;
    const count = await this.prisma.category.count({
      where: { id: { in: ids } },
    });
    if (count !== ids.length)
      throw new BadRequestException('Some categoryIds do not exist');
  }

  // === 1) Полная замена профиля (+ опционально полная замена категорий) ===
  async updateProfile(userId: string, data: UpdateContractorDto) {
    await this.getByUserIdOrThrow(userId);

    // если в payload присутствует categoryIds — делаем полную замену
    let categoriesUpdate:
      | Prisma.ContractorUpdateInput['categories']
      | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(data, 'categoryIds')) {
      const ids = data.categoryIds ?? [];
      await this.assertAllCategoriesExist(ids);
      categoriesUpdate = { set: ids.map((id) => ({ id })) };
    }

    const contractorId = this.prisma.contractor.findUnique(
      {
        where:{
          userId:userId

        }
      }
    )

    await this.setServices(
      data?.contractorId ?? "",
      data?.services ?? [],
      userId,
    );


    return this.prisma.contractor.update({
      where: { userId },
      data: {
        companyName: data.companyName,
        cityId: data.cityId,
        about: data.about,
        ...(categoriesUpdate ? { categories: categoriesUpdate } : {}),
      },
      include: { categories: true },
    });
  }

  // === 2) Добавить несколько категорий (без удаления существующих) ===
  // async addCategories(userId: string, payload: AddCategoriesDto) {
  //   await this.getByUserIdOrThrow(userId);
  //   const ids = payload.categoryIds ?? [];
  //   if (!ids.length) throw new BadRequestException('categoryIds is required');
  //   await this.assertAllCategoriesExist(ids);
  //
  //   return this.prisma.contractor.update({
  //     where: { userId },
  //     data: {
  //       categories: {
  //         // connect игнорирует уже существующие связи, ошибок не будет
  //         connect: ids.map((id) => ({ id })),
  //       },
  //     },
  //     include: { categories: true },
  //   });
  // }
  //
  // // === 3) Удалить одну категорию ===
  // async removeCategory(userId: string, categoryId: string) {
  //   await this.getByUserIdOrThrow(userId);
  //
  //   // опционально проверим связь, чтобы отдать 404, если её нет
  //   const exists = await this.prisma.contractor.findFirst({
  //     where: { userId, categories: { some: { id: categoryId } } },
  //     select: { id: true },
  //   });
  //   if (!exists)
  //     throw new NotFoundException('Category not linked to this contractor');
  //
  //   return this.prisma.contractor.update({
  //     where: { userId },
  //     data: {
  //       categories: { disconnect: { id: categoryId } },
  //     },
  //     include: { categories: true },
  //   });
  // }

  async deleteProfile(userId: string) {
    return this.prisma.contractor.delete({ where: { userId } });
  }

  async createProfile(userId: string) {
    return this.prisma.contractor.create({
      data: { userId },
    });
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

  // service
  async setServices(
    contractorId: string,
    inputs: ContractorServiceInput[],
    currentUserId?: string,
  ) {
    // проверка владельца
    const contractor = await this.prisma.contractor.findUnique({
      where: { id: contractorId },
      select: { id: true, userId: true },
    });
    if (!contractor) throw new NotFoundException('Contractor not found');
    if (currentUserId && contractor.userId !== currentUserId) {
      throw new ForbiddenException('You are not the owner of this contractor profile');
    }

    // валидация дубликатов
    const uniqSvc = new Set(inputs.map((s) => s.serviceId));
    if (uniqSvc.size !== inputs.length) {
      throw new BadRequestException('Duplicate serviceId in services array');
    }

    const selections = await Promise.all(
      inputs.map(async (s) => ({
        serviceId: s.serviceId,
        categoryIds: await this.resolveServiceCategoriesOrThrow(
          s.serviceId,
          s.categoryIds,
        ),
      })),
    );

    return this.prisma.$transaction(async (tx) => {
      const oldLinks = await tx.contractorService.findMany({
        where: { contractorId },
        select: { id: true },
      });

      if (oldLinks.length) {
        await tx.contractorServiceSelectedCategory.deleteMany({
          where: { contractorServiceId: { in: oldLinks.map((l) => l.id) } },
        });
        await tx.contractorService.deleteMany({ where: { contractorId } });
      }

      for (const s of selections) {
        const link = await tx.contractorService.create({
          data: { contractorId, serviceId: s.serviceId },
          select: { id: true },
        });

        if (s.categoryIds.length) {
          await tx.contractorServiceSelectedCategory.createMany({
            data: s.categoryIds.map((cid) => ({
              contractorServiceId: link.id,
              categoryId: cid,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.contractor.findUnique({
        where: { id: contractorId },
        select: {
          id: true,
          userId: true,
          services: {
            select: {
              id: true,
              service: { select: { id: true, name: true, slug: true } },
              selectedCategories: {
                select: { category: { select: { id: true, name: true } } },
              },
            },
          },
        },
      });
    });
  }

}
