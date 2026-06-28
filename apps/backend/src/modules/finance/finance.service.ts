import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, PaymentMethod, Prisma, Role, TransactionType, User } from '@prisma/client';

export interface CreateTransactionDto {
  description: string;
  supplierName?: string;
  tradeName?: string;
  documentNumber?: string;
  paymentMethod?: PaymentMethod;
  amount: number;
  type: TransactionType;
  categoryId?: string;
  dueDate?: string;
  isRecurring?: boolean;
  recurringDay?: number;
  notes?: string;
  receiptUrl?: string;
}

export interface UpdateTransactionDto {
  description?: string;
  supplierName?: string;
  tradeName?: string;
  documentNumber?: string;
  paymentMethod?: PaymentMethod;
  categoryId?: string;
  notes?: string;
  dueDate?: string;
}

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(user: User, filters?: { type?: TransactionType; isPaid?: boolean; month?: number; year?: number }) {
    const where: Record<string, unknown> = {
      deletedAt: null,
      ...(user.role !== Role.ADMIN ? { userId: user.id } : {}),
      ...(filters?.type ? { type: filters.type } : {}),
      ...(filters?.isPaid !== undefined ? { isPaid: filters.isPaid } : {}),
    };

    if (filters?.month && filters?.year) {
      const start = new Date(filters.year, filters.month - 1, 1);
      const end = new Date(filters.year, filters.month, 0, 23, 59, 59);
      where['createdAt'] = { gte: start, lte: end };
    }

    return this.prisma.transaction.findMany({
      where,
      include: {
        category: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateTransactionDto, userId: string) {
    return this.prisma.transaction.create({
      data: {
        description: dto.description,
        supplierName: dto.supplierName,
        tradeName: dto.tradeName,
        documentNumber: dto.documentNumber,
        paymentMethod: dto.paymentMethod,
        amount: new Prisma.Decimal(dto.amount),
        type: dto.type,
        categoryId: dto.categoryId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        isRecurring: dto.isRecurring ?? false,
        recurringDay: dto.recurringDay,
        notes: dto.notes,
        receiptUrl: dto.receiptUrl,
        userId,
      },
      include: { category: true },
    });
  }

  async markPaid(id: string, user: User) {
    const tx = await this.prisma.transaction.findFirstOrThrow({
      where: { id, deletedAt: null },
    });

    if (user.role !== Role.ADMIN && tx.userId !== user.id) {
      throw new ForbiddenException('Sem permissão para alterar esta transação');
    }

    return this.prisma.transaction.update({
      where: { id },
      data: { isPaid: true, paidAt: new Date() },
    });
  }

  async update(id: string, dto: UpdateTransactionDto, user: User) {
    const tx = await this.prisma.transaction.findFirstOrThrow({
      where: { id, deletedAt: null },
    });

    if (tx.isPaid) throw new BadRequestException('Transações pagas não podem ser editadas');
    if (user.role !== Role.ADMIN && tx.userId !== user.id) throw new ForbiddenException();

    return this.prisma.transaction.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: User) {
    const tx = await this.prisma.transaction.findFirstOrThrow({
      where: { id, deletedAt: null },
    });

    if (user.role !== Role.ADMIN && tx.userId !== user.id) throw new ForbiddenException();

    return this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getSummary(month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: { deletedAt: null, createdAt: { gte: start, lte: end } },
      include: { category: true },
    });

    const income = transactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const byCategory = transactions.reduce<Record<string, number>>((acc, t) => {
      const cat = t.category?.name ?? 'Sem categoria';
      acc[cat] = (acc[cat] ?? 0) + Number(t.amount);
      return acc;
    }, {});

    return { income, expense, balance: income - expense, byCategory, count: transactions.length };
  }

  async findCategories() {
    return this.prisma.transactionCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(name: string, type: TransactionType, color?: string) {
    return this.prisma.transactionCategory.create({ data: { name, type, color } });
  }

  @Cron('0 8 * * *')
  async checkDueDates() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const today = new Date();

    const dueTomorrow = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        isPaid: false,
        dueDate: {
          gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
          lte: new Date(tomorrow.setHours(23, 59, 59, 999)),
        },
      },
      include: { user: true },
    });

    const dueToday = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        isPaid: false,
        dueDate: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lte: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
      include: { user: true },
    });

    for (const tx of dueTomorrow) {
      await this.notifications.send(tx.userId, {
        type: NotificationType.PAYMENT_DUE,
        title: 'Conta vence amanhã',
        message: `${tx.description} vence amanhã (R$ ${Number(tx.amount).toFixed(2)})`,
      });
    }

    for (const tx of dueToday) {
      await this.notifications.send(tx.userId, {
        type: NotificationType.PAYMENT_DUE,
        title: '⚠️ Conta vence HOJE',
        message: `${tx.description} vence hoje (R$ ${Number(tx.amount).toFixed(2)})`,
      });
    }
  }

  @Cron('1 0 * * *')
  async processRecurring() {
    const today = new Date();
    const day = today.getDate();

    const recurring = await this.prisma.transaction.findMany({
      where: { isRecurring: true, recurringDay: day, deletedAt: null },
    });

    for (const tx of recurring) {
      const alreadyExists = await this.prisma.transaction.findFirst({
        where: {
          description: tx.description,
          userId: tx.userId,
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lte: new Date(today.getFullYear(), today.getMonth() + 1, 0),
          },
          isRecurring: false,
        },
      });

      if (!alreadyExists) {
        await this.prisma.transaction.create({
          data: {
            description: tx.description,
            supplierName: tx.supplierName,
            tradeName: tx.tradeName,
            documentNumber: tx.documentNumber,
            paymentMethod: tx.paymentMethod,
            amount: tx.amount,
            type: tx.type,
            categoryId: tx.categoryId,
            userId: tx.userId,
            dueDate: new Date(today.getFullYear(), today.getMonth(), day),
          },
        });
      }
    }
  }
}
