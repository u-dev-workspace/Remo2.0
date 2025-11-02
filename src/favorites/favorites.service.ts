// src/favorites/favorites.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddFavoriteDto } from './dto/add-favorite';
import { ListFavoritesDto } from './dto/list-favorites';
import { Prisma } from '@prisma/client';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async add(userId: string | undefined, dto: AddFavoriteDto) {
    if (!userId) throw new BadRequestException('User not resolved from token');

    // Быстрый check на существование проекта
    const exists = await this.prisma.project.findUnique({ where: { id: dto.projectId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Project not found');

    try {
      const fav = await this.prisma.favorite.create({
        data: { userId, projectId: dto.projectId },
        include: { project: true },
      });
      return { id: fav.id, addedAt: fav.createdAt, project: fav.project };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // уже в избранном — вернём существующее
        const fav = await this.prisma.favorite.findUnique({
          where: { uniq_favorite_user_project: { userId, projectId: dto.projectId } },
          include: { project: true },
        });
        return { id: fav!.id, addedAt: fav!.createdAt, project: fav!.project };
      }
      if (e?.code === 'P2003') throw new NotFoundException('Project not found');
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
      include: { project: true },
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

}
