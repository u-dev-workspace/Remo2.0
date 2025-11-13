import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { NotificationType, NotificationStatus, ReviewStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { JsPromise } from '@prisma/client/runtime/binary';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly minio: MinioService,// <- вот он
  ) {}


  /**
   * Создание отзыва.
   * Сразу ставим статус PENDING и через 15 секунд пытаемся опубликовать.
   */
  async create(
    userId: string,
    dto: CreateReviewDto,
    files: { key: string; mime: string }[] = [],
  ) {
    const { contractorId, projectId, text, rating } = dto;

    const [contractor, project] = await Promise.all([
      this.prisma.contractor.findUnique({ where: { id: contractorId } }),
      this.prisma.project.findUnique({ where: { id: projectId } }),
    ]);

    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        contractorId,
        projectId,
        text,
        rating,
        status: ReviewStatus.PENDING,
        attachments: files.length
          ? {
            create: files.map((f, index) => ({
              url: f.key,
              mime: f.mime,
              sortOrder: index,
            })),
          }
          : undefined,
      },
      include: {
        attachments: true,
        project: { select: { title: true } },
      },
    });



    setTimeout(() => {
      this.publishIfStillPending(review.id).catch(err => {
        this.logger.error(`Failed to publish review ${review.id}`, err);
      });
    }, 15_000);
    // this.notifications.createInfo(userId, {title: "test", data: null,
    //   message: `Был размещен отзыв о вашей работе на проекте: ${review.project.title}`})
    return review;
  }

  /**
   * Публикация отзыва, если он всё ещё в статусе PENDING.
   * При публикации отправляем исполнителю инфо-уведомление.
   */
  private async publishIfStillPending(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        contractor: { select: { id: true, userId: true } }, // userId — владелец аккаунта исполнителя
        project: { select: { id: true, title: true } },
      },
    });

    if (!review) return;
    if (review.status !== ReviewStatus.PENDING) return;

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status: ReviewStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    // Отправляем инфо-уведомление исполнителю
    const contractorUserId = review.contractor?.userId;
    if (contractorUserId) {
      await this.notifications.createInfo(contractorUserId, {
        title: 'Новый отзыв на вашу работу',
        message: `По проекту ${review.project?.title} опубликован отзыв.`,
        data: {
          reviewId: review.id,
        },
      });
    }

    return updated;
  }

  /**
   * Получить опубликованные отзывы по исполнителю.
   * PENDING здесь не показываем.
   */
  async getForContractor(contractorId: string) {
    return this.prisma.review.findMany({
      where: {
        contractorId,
        status: ReviewStatus.PUBLISHED,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, title: true } },
      },
    });
  }

  /**
   * Отзывы, которые оставил конкретный пользователь (видит и PENDING, и PUBLISHED).
   */
  async getMyReviews(userId: string) {
    return this.prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        contractor: { select: { id: true, companyName: true } },
        project: { select: { id: true, title: true } },
      },
    });
  }
}
