import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { Telegraf } from 'telegraf';

interface SendNotificationDto {
  type: NotificationType;
  title: string;
  message: string;
}

@Injectable()
export class NotificationsService {
  private bot: Telegraf | null = null;
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const token = config.get<string>('TELEGRAM_BOT_TOKEN');
    if (token) {
      this.bot = new Telegraf(token);
    }
  }

  async send(userId: string, dto: SendNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.telegramId && this.bot) {
      try {
        const text = `*${dto.title}*\n${dto.message}`;
        const sentMsg = await this.bot.telegram.sendMessage(user.telegramId, text, {
          parse_mode: 'Markdown',
        });

        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { sentAt: new Date(), telegramMessageId: sentMsg.message_id },
        });
      } catch (err) {
        this.logger.error(`Falha ao enviar Telegram para ${user.telegramId}: ${err}`);
      }
    }

    return notification;
  }

  async sendToAll(dto: SendNotificationDto) {
    const users = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
    });

    return Promise.all(users.map((u) => this.send(u.id, dto)));
  }

  async markRead(notificationId: string, userId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
