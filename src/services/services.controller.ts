import { Body, Controller, Get, Param, Post, Put, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiQuery, ApiCreatedResponse } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { ListServicesQueryDto } from './dto/list-services';
import { CreateServiceDto } from './dto/create-service.dto';
import { SetServiceCategoriesDto } from './dto/set-service-categories.dto';

@ApiTags('Services')
@Controller('api/v1/services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Get()
  @ApiOkResponse({ description: 'Список услуг' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async list(@Query() query: ListServicesQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Услуга по id' })
  async byId(@Param('id') id: string) {
    return this.service.byId(id);
  }

  @Get('by-slug/:slug')
  @ApiOkResponse({ description: 'Услуга по slug' })
  async bySlug(@Param('slug') slug: string) {
    return this.service.bySlug(slug);
  }


  // --- NEW: создание услуги с категориями ---
  @Post()
  @ApiCreatedResponse({ description: 'Созданная услуга' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() dto: CreateServiceDto) {
    return this.service.create(dto);
  }

  // --- NEW: полная замена категорий услуги ---
  @Put(':id/categories')
  @ApiOkResponse({ description: 'Услуга с обновленным списком категорий' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async setCategories(@Param('id') id: string, @Body() dto: SetServiceCategoriesDto) {
    return this.service.setCategories(id, dto);
  }
}
