import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AddCategoriesDto, UpdateContractorDto } from './dto/update-contractor.dto';

@Injectable()
export class ContractorProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfileByUserId(userId: string) {
    console.log('userId =>', userId);
    const contractor = await this.prisma.contractor.findUnique({
      where: { userId },
      include:{
        categories:true,
      }
    });
    console.log('contractor =>', contractor);
    if (!contractor) throw new NotFoundException('Contractor profile not found');
    return contractor;
  }


  private async getByUserIdOrThrow(userId: string) {
    const contractor = await this.prisma.contractor.findUnique({ where: { userId } });
    if (!contractor) throw new NotFoundException('Profile not found');
    return contractor;
  }

  private async assertAllCategoriesExist(ids: string[]) {
    if (!ids?.length) return;
    const count = await this.prisma.category.count({ where: { id: { in: ids } } });
    if (count !== ids.length) throw new BadRequestException('Some categoryIds do not exist');
  }

  // === 1) Полная замена профиля (+ опционально полная замена категорий) ===
  async updateProfile(userId: string, data: UpdateContractorDto) {
    await this.getByUserIdOrThrow(userId);

    // если в payload присутствует categoryIds — делаем полную замену
    let categoriesUpdate: Prisma.ContractorUpdateInput['categories'] | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(data, 'categoryIds')) {
      const ids = data.categoryIds ?? [];
      await this.assertAllCategoriesExist(ids);
      categoriesUpdate = { set: ids.map((id) => ({ id })) };
    }

    return this.prisma.contractor.update({
      where: { userId },
      data: {
        companyName: data.companyName,
        about: data.about,
        ...(categoriesUpdate ? { categories: categoriesUpdate } : {}),
      },
      include: { categories: true },
    });
  }

  // === 2) Добавить несколько категорий (без удаления существующих) ===
  async addCategories(userId: string, payload: AddCategoriesDto) {
    await this.getByUserIdOrThrow(userId);
    const ids = payload.categoryIds ?? [];
    if (!ids.length) throw new BadRequestException('categoryIds is required');
    await this.assertAllCategoriesExist(ids);

    return this.prisma.contractor.update({
      where: { userId },
      data: {
        categories: {
          // connect игнорирует уже существующие связи, ошибок не будет
          connect: ids.map((id) => ({ id })),
        },
      },
      include: { categories: true },
    });
  }

  // === 3) Удалить одну категорию ===
  async removeCategory(userId: string, categoryId: string) {
    await this.getByUserIdOrThrow(userId);

    // опционально проверим связь, чтобы отдать 404, если её нет
    const exists = await this.prisma.contractor.findFirst({
      where: { userId, categories: { some: { id: categoryId } } },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Category not linked to this contractor');

    return this.prisma.contractor.update({
      where: { userId },
      data: {
        categories: { disconnect: { id: categoryId } },
      },
      include: { categories: true },
    });
  }



  async deleteProfile(userId: string) {
    return this.prisma.contractor.delete({ where: { userId } });
  }

  async createProfile(userId: string) {
    return this.prisma.contractor.create({
      data: { userId },
    });
  }
}
