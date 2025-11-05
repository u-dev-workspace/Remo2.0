import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, NotificationStatus } from '@prisma/client';
import { AlertDecision } from './dto/respond-alert.dto';

export type InfoOptions = {
  title?: string;
  message: string;
  data?: any;
};

export type AlertOptions = {
  title?: string;
  message: string;
  data?: any;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Простое информационное уведомление (info)
   */
  async createInfo(userId: string, opts: InfoOptions) {
    const { title, message, data } = opts;
    return this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.INFO,
        status: NotificationStatus.UNREAD,
        title: title ?? null,
        message,
        data,
      },
    });
  }

  /**
   * Уведомление-алерт, по которому нужно принять решение (alert)
   */
  async createAlert(userId: string, opts: AlertOptions) {
    const { title, message, data } = opts;
    return this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.ALERT,
        status: NotificationStatus.PENDING,
        title: title ?? null,
        message,
        data,
      },
    });
  }

  /**
   * Получить уведомления конкретного пользователя
   */
  async getForUser(userId: string, onlyUnread = false) {

    // this.createInfo(userId, {title: "test", data: null, message: "соси дура, член мне"})
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(onlyUnread ? { status: { in: [NotificationStatus.UNREAD, NotificationStatus.PENDING] } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Пометить уведомление прочитанным (только для info)
   */
  async markRead(userId: string, notificationId: string) {
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notif || notif.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    if (notif.type !== NotificationType.INFO) {
      throw new BadRequestException('Only info notifications can be marked as read');
    }

    if (notif.status === NotificationStatus.READ) {
      return notif;
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  /**
   * Ответ по alert (принять/отклонить)
   */
  async respondToAlert(userId: string, notificationId: string, decision: AlertDecision) {
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notif || notif.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    if (notif.type !== NotificationType.ALERT) {
      throw new BadRequestException('Notification is not an alert');
    }

    if (notif.status !== NotificationStatus.PENDING) {
      throw new BadRequestException('Alert already handled');
    }

    const status =
      decision === AlertDecision.ACCEPT
        ? NotificationStatus.ACCEPTED
        : NotificationStatus.REJECTED;

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status,
        readAt: new Date(),
      },
    });
  }
}
