// src/favorites/favorites.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddFavoriteDto } from './dto/add-favorite';
import { ListFavoritesDto } from './dto/list-favorites';
import { Prisma } from '@prisma/client';
const contractorInclude = {
  contractor: {
    select: {
      id: true,
      companyName: true,
      about: true,
      // город
      city: {
        select: {
          id: true,
          slug: true,
          nameRu: true,
          nameKk: true,
          nameEn: true,
        },
      },
      // категории подрядчика
      categories: {
        select: {
          id: true,
          name: true,
        },
      },
      // услуги подрядчика
      services: {
        select: {
          id: true,
          service: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
          selectedCategories: {
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      // исходные вложения (если нужно)
      ContractorAttachment: {
        select: {
          id: true,
          filename: true,
          path: true,
          mimetype: true,
          size: true,
          createdAt: true,
        },
      },
      // витринные картинки (первые три и т.д.)
      ContractorShowcaseImage: {
        select: {
          id: true,
          position: true,
          contractorAttachment: {
            select: {
              id: true,
              filename: true,
              path: true,
              mimetype: true,
              size: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async add(userId: string | undefined, dto: AddFavoriteDto) {
    if (!userId) {
      throw new BadRequestException('User not resolved from token');
    }

    // Быстрый check на существование проекта
    const exists = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Project not found');
    }

    // Выносим include в константу, чтобы не дублировать в create / findUnique
    const projectInclude = {
      project: {
        select: {
          id: true,
          title: true,          // в схеме Project нет name, есть title
          status: true,
          coverAttachment: true,
          attachments: true,
          services: {
            select: {
              id: true,
              service: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                },
              },
              selectedCategories: {
                select: {
                  category: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as const;

    try {
      const fav = await this.prisma.favorite.create({
        data: {
          userId,
          projectId: dto.projectId,
        },
        include: projectInclude,
      });

      return {
        id: fav.id,
        addedAt: fav.createdAt,
        project: fav.project,
      };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // Уже в избранном — достаём существующую запись с тем же include
        const fav = await this.prisma.favorite.findUnique({
          where: {
            uniq_favorite_user_project: {
              userId,
              projectId: dto.projectId,
            },
          },
          include: projectInclude,
        });

        if (!fav) {
          // теоретически, если запись удалили между create и findUnique
          throw new NotFoundException('Favorite not found');
        }

        return {
          id: fav.id,
          addedAt: fav.createdAt,
          project: fav.project,
        };
      }

      if (e?.code === 'P2003') {
        throw new NotFoundException('Project not found');
      }

      throw e;
    }
  }
  async remove(userId: string | undefined, projectId: string) {
    if (!userId) throw new BadRequestException('User not resolved from token');

    try {
      const res = await this.prisma.favorite.delete({
        where: {
          uniq_favorite_user_project: {
            userId,      // ← должно быть userId
            projectId,   // ← а не два раза projectId
          },
        },
      });

      return { removed: 1, id: res.id };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        // запись не найдена — можно вернуть 404 или просто 0
        return { removed: 0 };
        // или:
        // throw new NotFoundException('Favorite not found');
      }
      throw e;
    }
  }

  // favorites.service.ts
  async list(
    userId: string | undefined,
    { take = 20, cursor }: { take?: number; cursor?: string }
  ) {
    if (!userId) throw new BadRequestException('User not resolved from token');

    // валидируем курсор (простейшая проверка для cuid/uuid)
    let useCursor = cursor ?? undefined;
    if (useCursor) {
      const exists = await this.prisma.favorite.findUnique({
        where: { id: useCursor },
        select: { id: true },
      });
      if (!exists) useCursor = undefined; // игнорируем
    }

    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(useCursor ? { cursor: { id: useCursor }, skip: 1 } : {}),
      include: {  project: {
          select: {
            id: true,
            title: true,
            status: true,
            coverAttachment: true,
            attachments: true,
            services: {
              select: {
                id: true,
                service: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                  },
                },
                selectedCategories: {
                  select: {
                    category: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        } },
    });

    return {
      items: rows.map((r) => ({
        favoriteId: r.id,
        addedAt: r.createdAt,
        project: r.project, // теперь тип есть
      })),
      nextCursor: rows.length === take ? rows[rows.length - 1].id : null,
      count: rows.length,
    };
  }


  // dto ожидаю такого вида:
// export class AddFavoriteContractorDto { contractorId: string; }

  async addContractor(
    userId: string | undefined,
     contractorId: string , // или AddFavoriteContractorDto
  ) {
    if (!userId) {
      throw new BadRequestException('User not resolved from token');
    }

    // проверяем, что подрядчик существует
    const exists = await this.prisma.contractor.findUnique({
      where: { id: contractorId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Contractor not found');
    }

    try {
      const fav = await this.prisma.favoriteContractor.create({
        data: {
          userId,
          contractorId: contractorId,
        },
        include: contractorInclude,
      });

      return {
        id: fav.id,
        addedAt: fav.createdAt,
        contractor: fav.contractor,
      };
    } catch (e: any) {
      // уникальный индекс (userId + contractorId)
      if (e?.code === 'P2002') {
        const fav = await this.prisma.favoriteContractor.findUnique({
          where: {
            uniq_favorite_user_contractor: {
              userId,
              contractorId: contractorId,
            },
          },
          include: contractorInclude,
        });

        if (!fav) {
          // теоретически, если запись удалили между create и findUnique
          throw new NotFoundException('Favorite contractor not found');
        }

        return {
          id: fav.id,
          addedAt: fav.createdAt,
          contractor: fav.contractor,
        };
      }

      if (e?.code === 'P2003') {
        // FK на подрядчика
        throw new NotFoundException('Contractor not found');
      }

      throw e;
    }
  }


  async listContractors(
    userId: string | undefined,
    { take = 20, cursor }: { take?: number; cursor?: string },
  ) {
    if (!userId) {
      throw new BadRequestException('User not resolved from token');
    }

    // валидация курсора (существует ли такой fav)
    let useCursor = cursor ?? undefined;
    if (useCursor) {
      const exists = await this.prisma.favoriteContractor.findUnique({
        where: { id: useCursor },
        select: { id: true },
      });
      if (!exists) {
        useCursor = undefined;
      }
    }

    const rows = await this.prisma.favoriteContractor.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(useCursor ? { cursor: { id: useCursor }, skip: 1 } : {}),
      include: contractorInclude,
    });

    return {
      items: rows.map((r) => ({
        favoriteId: r.id,
        addedAt: r.createdAt,
        contractor: r.contractor,
      })),
      nextCursor: rows.length === take ? rows[rows.length - 1].id : null,
      count: rows.length,
    };
  }


  async removeContractor(userId: string | undefined, contractorId: string) {
    if (!userId) {
      throw new BadRequestException('User not resolved from token');
    }

    const result = await this.prisma.favoriteContractor.deleteMany({
      where: {
        contractorId:contractorId,
        userId, // защита от удаления чужой записи
      },
    });

    // result.count — сколько записей реально удалено
    return {
      removed: result.count,
      id: result.count ? contractorId : null,
    };
  }




}
