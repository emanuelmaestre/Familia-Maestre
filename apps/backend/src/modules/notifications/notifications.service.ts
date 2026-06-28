import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

interface SendNotificationDto {
  type: NotificationType;
  title: string;
  message: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly zapiBase: string;
  private readonly zapiClientToken: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const instanceId = config.get<string>('ZAPI_INSTANCE_ID') ?? '';
    const token = config.get<string>('ZAPI_TOKEN') ?? '';
    this.zapiBase = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
    this.zapiClientToken = config.get<string>('ZAPI_CLIENT_TOKEN') ?? '';
  }

  private async sendWhatsApp(phone: string, message: string) {
    if (!this.zapiClientToken) return;

    try {
      const res = await fetch(`${this.zapiBase}/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': this.zapiClientToken,
        },
        body: JSON.stringify({ phone, message }),
      });

      if (!res.ok) {
        this.logger.error(`Z-API erro ${res.status} para ${phone}`);
      }
    } catch (err) {
      this.logger.error(`Falha ao enviar WhatsApp para ${phone}: ${err}`);
    }
  }

  async send(userId: string, dto: SendNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: { userId, type: dto.type, title: dto.title, message: dto.message },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.phone) {
      const text = `*${dto.title}*\n${dto.message}`;
      await this.sendWhatsApp(user.phone, text);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { sentAt: new Date() },
      });
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
    const notification = await this.prisma.notification.findFirstOrThrow({
      where: { id: notificationId, userId },
    });

    return this.prisma.notification.update({
      where: { id: notification.id },
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
