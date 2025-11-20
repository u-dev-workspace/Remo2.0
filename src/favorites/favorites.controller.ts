// src/favorites/favorites.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards, Req, ValidationPipe } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/add-favorite';
import { ListFavoritesDto } from './dto/list-favorites';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Favorites')
@ApiBearerAuth("bearerAuth")
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}
  @UseGuards(JwtGuard)
  @Post()
  @ApiOperation({ summary: 'Добавить проект в избранное' })
  async add(@Body() dto: AddFavoriteDto, @CurrentUser() user: any) {
    // подстрой название поля: id | sub | userId
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.favorites.add(userId, dto);
  }
  @UseGuards(JwtGuard)
  @Delete(':projectId')
  @ApiOperation({ summary: 'Удалить проект из избранного' })
  async remove(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.favorites.remove(userId, projectId);
  }

  @Get()
  async list(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: ListFavoritesDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.favorites.list(userId, query);
  }
  @UseGuards(JwtGuard)
  @Post("/contractor/:contractorId")
  @ApiOperation({ summary: 'Добавить проект в избранное' })
  async addContractor(@Param('contractorId') contractorId: string, @CurrentUser() user: any) {
    // подстрой название поля: id | sub | userId
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.favorites.addContractor(userId, contractorId);
  }
  @UseGuards(JwtGuard)
  @Delete('/contractor/:contractorId')
  @ApiOperation({ summary: 'Удалить проект из избранного' })
  async removeContractor(@Param('contractorId') contractorId: string, @CurrentUser() user: any) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.favorites.removeContractor(userId, contractorId);
  }

  @Get("/contactors")
  async listContractor(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: ListFavoritesDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.id ?? user?.sub ?? user?.userId;
    return this.favorites.listContractors(userId, query);
  }


}
