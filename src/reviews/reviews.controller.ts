import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam, ApiConsumes,
} from '@nestjs/swagger';
import { Readable } from 'stream';
import { MinioService } from '../minio/minio.service';

@ApiTags('Reviews')
@ApiBearerAuth('bearerAuth')
@Controller('reviews')

export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService,
  private readonly minio: MinioService
) {}

  /**
   * POST /reviews
   * Body: { contractorId, projectId, rating, text }
   * userId берём из JWT
   */
  @UseGuards(JwtGuard)
  @Post()
  @ApiOperation({ summary: 'Создать или обновить отзыв по исполнителю и проекту' })
  @ApiCreatedResponse({
    description:
      'Отзыв создан/обновлён и отправлен на модерацию (15 секунд до публикации)',
  })
  @ApiBody({
    description: 'Тело запроса для создания отзыва',
    type: CreateReviewDto,
    examples: {
      example1: {
        summary: 'Пример отзыва с максимальной оценкой',
        value: {
          contractorId: 'cmh9m49ta0000yl7ypqvz5dgb',
          projectId: 'cmheh5wkc001h4234gurl6s9t',
          rating: 5,
          text: 'Исполнитель всё сделал в срок, постоянно был на связи, работа на высшем уровне.',
        },
      },
      example2: {
        summary: 'Пример отзыва с оценкой 3',
        value: {
          contractorId: 'cmh9m49ta0000yl7ypqvz5dgb',
          projectId: 'cmheh5wkc001h4234gurl6s9t',
          rating: 3,
          text: 'В целом нормально, но были задержки по срокам.',
        },
      },
    },
  })
  async create(@Body() dto: CreateReviewDto, @Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not resolved from token');
    }

    return this.reviewsService.create(userId, dto);
  }

  /**
   * GET /reviews/contractor/:contractorId
   * Все опубликованные отзывы по исполнителю
   */
  @Get('contractor/:contractorId')
  @ApiOperation({ summary: 'Получить опубликованные отзывы по исполнителю' })
  @ApiOkResponse({ description: 'Список опубликованных отзывов по исполнителю' })
  @ApiParam({
    name: 'contractorId',
    description: 'ID исполнителя',
    example: 'cmh9m49ta0000yl7ypqvz5dgb',
  })
  async getForContractor(@Param('contractorId') contractorId: string) {
    return this.reviewsService.getForContractor(contractorId);
  }

  /**
   * GET /reviews/me
   * Все отзывы, которые оставил текущий пользователь (и PENDING, и PUBLISHED)
   */
  @UseGuards(JwtGuard)
  @Get('me')
  @ApiOperation({ summary: 'Получить отзывы, которые оставил текущий пользователь' })
  @ApiOkResponse({ description: 'Список отзывов текущего пользователя' })
  async getMyReviews(@Req() req: any) {
    const userId = req.user?.id;
    return this.reviewsService.getMyReviews(userId);
  }
  @UseGuards(JwtGuard)
  @Post('with-files')
  @ApiOperation({ summary: 'Создать отзыв с фотографиями' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Создание отзыва с возможностью прикрепить файлы',
    schema: {
      type: 'object',
      properties: {
        contractorId: { type: 'string' },
        projectId: { type: 'string' },
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        text: { type: 'string' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['contractorId', 'projectId', 'rating', 'text'],
    },
  })
  async createWithFiles(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not resolved from token');
    }

    if (!req.isMultipart || !req.isMultipart()) {
      throw new Error('Content-Type must be multipart/form-data');
    }

    const parts = req.parts();
    const fields: Record<string, string> = {};
    const files: {
      filename: string;
      mimetype: string;
      buffer: Buffer;
    }[] = [];

    // 1) собираем поля и файлы
    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'files') {
        const buffer = await this.streamToBuffer(part.file);
        files.push({
          filename: part.filename,
          mimetype: part.mimetype,
          buffer,
        });
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value;
      }
    }

    // 2) формируем dto вручную
    const dto: CreateReviewDto = {
      contractorId: fields.contractorId,
      projectId: fields.projectId,
      rating: Number(fields.rating),
      text: fields.text,
    };

    // тут можно ещё повесить class-validator, но для краткости — ручная проверка
    if (!dto.contractorId || !dto.projectId || !dto.text || !dto.rating) {
      throw new Error('Missing required fields');
    }

    // 3) заливаем файлы в MinIO в папку "reviews"
    const uploaded: { key: string; mime: string }[] = [];

    for (const file of files) {
      const ext = file.filename?.split('.').pop();
      const objectName = this.minio.generateObjectName('reviews', ext);
      await this.minio.uploadBuffer(objectName, file.buffer, file.mimetype);

      uploaded.push({
        key: objectName,        // "reviews/...."
        mime: file.mimetype,
      });
    }

    // 4) прокидываем дальше в сервис (там решаешь, как сохранить в БД)
    return this.reviewsService.create(userId, dto, uploaded);
  }

  // утилитка для перевода стрима в Buffer (для fastify-multipart)
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
