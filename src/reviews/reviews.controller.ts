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
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Reviews')
@ApiBearerAuth('bearerAuth')
@Controller('reviews')
@UseGuards(JwtGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * POST /reviews
   * Body: { contractorId, projectId, rating, text }
   * userId берём из JWT
   */
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
  @Get('me')
  @ApiOperation({ summary: 'Получить отзывы, которые оставил текущий пользователь' })
  @ApiOkResponse({ description: 'Список отзывов текущего пользователя' })
  async getMyReviews(@Req() req: any) {
    const userId = req.user?.id;
    return this.reviewsService.getMyReviews(userId);
  }
}
