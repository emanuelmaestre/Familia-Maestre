import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, Prisma, ReportStatus, ReportType, Role, TransactionType } from '@prisma/client';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async generateCustomReport(from: Date, to: Date, modules: string[]) {
    const report = await this.prisma.report.create({
      data: {
        type: ReportType.CUSTOM,
        status: ReportStatus.GENERATING,
        period: `${from.toISOString().split('T')[0]} — ${to.toISOString().split('T')[0]}`,
      },
    });

    const payload = await this.collectData(from, to, modules);

    return this.prisma.report.update({
      where: { id: report.id },
      data: { status: ReportStatus.READY, payload: payload as Prisma.InputJsonValue },
    });
  }

  async findAll() {
    return this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async findOne(id: string) {
    return this.prisma.report.findUniqueOrThrow({ where: { id } });
  }

  private async collectData(from: Date, to: Date, modules: string[]) {
    const data: Record<string, unknown> = {};

    if (modules.includes('shopping') || modules.includes('all')) {
      data['shopping'] = await this.prisma.shoppingItem.findMany({
        where: { createdAt: { gte: from, lte: to }, deletedAt: null },
        include: { requestedBy: { select: { name: true } } },
      });
    }

    if (modules.includes('finance') || modules.includes('all')) {
      const transactions = await this.prisma.transaction.findMany({
        where: { createdAt: { gte: from, lte: to }, deletedAt: null },
        include: { category: true },
      });

      const income = transactions
        .filter((t) => t.type === TransactionType.INCOME)
        .reduce((s, t) => s + Number(t.amount), 0);
      const expense = transactions
        .filter((t) => t.type === TransactionType.EXPENSE)
        .reduce((s, t) => s + Number(t.amount), 0);

      data['finance'] = { transactions, income, expense, balance: income - expense };
    }

    if (modules.includes('tasks') || modules.includes('all')) {
      data['tasks'] = await this.prisma.taskCompletion.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: {
          user: { select: { name: true } },
          assignment: { include: { task: true } },
        },
      });
    }

    if (modules.includes('events') || modules.includes('all')) {
      data['events'] = await this.prisma.event.findMany({
        where: { startsAt: { gte: from, lte: to }, deletedAt: null },
        include: { attendees: { include: { user: { select: { name: true } } } } },
      });
    }

    return data;
  }

  @Cron('0 8 * * 1')
  async generateWeeklyReport() {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);

    try {
      const report = await this.prisma.report.create({
        data: {
          type: ReportType.WEEKLY,
          status: ReportStatus.GENERATING,
          period: `${from.toISOString().split('T')[0]} — ${to.toISOString().split('T')[0]}`,
        },
      });

      const payload = await this.collectData(from, to, ['all']);

      await this.prisma.report.update({
        where: { id: report.id },
        data: { status: ReportStatus.READY, payload: payload as Prisma.InputJsonValue, sentAt: new Date() },
      });

      await this.notifications.sendToAll({
        type: NotificationType.REPORT_READY,
        title: '📊 Relatório Semanal',
        message: `Relatório da semana de ${from.toLocaleDateString('pt-BR')} a ${to.toLocaleDateString('pt-BR')} disponível no dashboard.`,
      });

      this.logger.log('Relatório semanal gerado com sucesso');
    } catch (err) {
      this.logger.error('Erro ao gerar relatório semanal:', err);
    }
  }

  @Cron('0 8 1 * *')
  async generateMonthlyReport() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    try {
      const report = await this.prisma.report.create({
        data: {
          type: ReportType.MONTHLY,
          status: ReportStatus.GENERATING,
          period: from.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
        },
      });

      const payload = await this.collectData(from, to, ['all']);

      await this.prisma.report.update({
        where: { id: report.id },
        data: { status: ReportStatus.READY, payload: payload as Prisma.InputJsonValue, sentAt: new Date() },
      });

      const admins = await this.prisma.user.findMany({
        where: { role: Role.ADMIN, isActive: true, deletedAt: null },
      });

      for (const admin of admins) {
        await this.notifications.send(admin.id, {
          type: NotificationType.REPORT_READY,
          title: '📊 Fechamento Mensal',
          message: `Relatório mensal de ${report.period} disponível no dashboard.`,
        });
      }

      this.logger.log('Relatório mensal gerado com sucesso');
    } catch (err) {
      this.logger.error('Erro ao gerar relatório mensal:', err);
    }
  }
}
