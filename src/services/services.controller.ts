import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query, Req, UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiQuery, ApiCreatedResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { ListServicesQueryDto } from './dto/list-services';
import { CreateServiceDto } from './dto/create-service.dto';
import { SetServiceCategoriesDto } from './dto/set-service-categories.dto';
import { SetServiceCoverDto } from './dto/set-service-cover.dto';
import { SetServiceIconDto } from './dto/set-service-icon.dto';
import { PresignIconDto } from './dto/presign-icon.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import type { FastifyRequest } from 'fastify';

@ApiTags('Services')
@Controller('api/v1/services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}


  // 🔹 Услуги для обложки
  @Get('cover')
  @ApiOkResponse({ description: 'Услуги для обложки (макс. 8)' })
  async cover() {
    return this.service.getCoverServices();
  }

  // 🔹 Список услуг
  @Get()
  @ApiOkResponse({ description: 'Список услуг' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async list(@Query() query: ListServicesQueryDto) {
    return this.service.list(query);
  }

  // 🔹 Услуга по id
  @Get(':id')
  @ApiOkResponse({ description: 'Услуга по id' })
  async byId(@Param('id') id: string) {
    return this.service.byId(id);
  }

  // 🔹 Обновить флаг "на обложке"
  @Put(':id/cover')
  @ApiOkResponse({ description: 'Обновлённый флаг обложки услуги' })
  @ApiBody({
    description: 'Флаг, показывать ли услугу на обложке',
    type: SetServiceCoverDto,
    examples: {
      enableCover: {
        summary: 'Включить показ на обложке',
        value: {
          isCoverser: true,
        },
      },
      disableCover: {
        summary: 'Выключить показ на обложке',
        value: {
          isCoverser: false,
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async setCover(@Param('id') id: string, @Body() dto: SetServiceCoverDto) {
    return this.service.setCoverFlag(id, dto);
  }

  // 🔹 Сохранить iconUrl (после успешной загрузки на S3/MinIO)
  @Put(':id/icon')
  @ApiOkResponse({ description: 'Обновлённая иконка услуги' })
  @ApiBody({
    description:
      'Публичный URL иконки, который вернулся после загрузки файла (presigned URL)',
    type: SetServiceIconDto,
    examples: {
      basic: {
        summary: 'Пример иконки в CDN / S3',
        value: {
          iconUrl:
            'https://cdn.example.com/service-icons/7f7e0a2c-1234-4f1b-8e2b/icon.png',
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async setIcon(@Param('id') id: string, @Body() dto: SetServiceIconDto) {
    return this.service.setIconUrl(id, dto);
  }

  // 🔹 Получить presigned URL для загрузки иконки
  // 🔽 Получить presigned URL для загрузки иконки (через загрузку файла в Swagger)
  // 🔹 Получить presigned URL для загрузки иконки (через загрузку файла в Swagger)
  // 🔹 Загрузка иконки с файла (как в ContractorAttachmentsService)
  // 🔹 Загрузка иконки услуги (логика как в ContractorAttachmentsService)
  // 🔹 Загрузка иконки услуги (логика как в ContractorAttachmentsService)
  @Post(':id/icon/presign')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Файл иконки',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  async uploadIcon(
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    const anyReq: any = req as any;

    if (!anyReq.isMultipart || !anyReq.isMultipart()) {
      throw new BadRequestException('Ожидается multipart/form-data');
    }

    const file = await anyReq.file();
    if (!file) {
      throw new BadRequestException('Поле "file" обязательно');
    }

    return this.service.saveIconFileStream({
      serviceId: id,
      filename: file.filename,
      mimetype: file.mimetype,
      fileStream: file.file,
    });
  }




  // 🔹 Обновить категории услуги
  @Put(':id/categories')
  @ApiOkResponse({ description: 'Услуга с обновлённым списком категорий' })
  @ApiBody({
    description:
      'Список категорий, к которым относится услуга. Обычно массив ID категорий.',
    type: SetServiceCategoriesDto,
    examples: {
      simple: {
        summary: 'Привязать услугу к двум категориям',
        value: {
          categoryIds: [
            'cmgkkkc1z000512a0fivvmeoa',
            'cmgkkkd8a000612a0fivwxyzb',
          ],
        },
      },
      empty: {
        summary: 'Убрать все категории у услуги',
        value: {
          categoryIds: [],
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async setCategories(
    @Param('id') id: string,
    @Body() dto: SetServiceCategoriesDto,
  ) {
    return this.service.setCategories(id, dto);
  }

  @Get('/popular/services')
  async popular() {
    return this.service.getPopularServices();
  }

}
