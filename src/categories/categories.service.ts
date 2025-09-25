import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) {}

    async create(dto: CreateCategoryDto) {
        try {
            return await this.prisma.category.create({ data: { name: dto.name } });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new ConflictException('Такая категория уже существует');
            }
            throw e;
        }
    }

    async findAll() {
        return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    }

    async findOne(id: string) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category) throw new NotFoundException(`Категория ${id} не найдена`);
        return category;
    }

    async update(id: string, dto: UpdateCategoryDto) {
        return this.prisma.category.update({
            where: { id },
            data: { name: dto.name },
        });
    }

    async remove(id: string) {
        return this.prisma.category.delete({ where: { id } });
    }
}
