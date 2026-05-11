import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShoppingService } from '../shopping/shopping.service';
import { EntryType, NotificationType } from '@prisma/client';

export interface CreateInventoryItemDto {
  name: string;
  unit: string;
  categoryId: string;
  minQuantity?: number;
  location?: string;
  imageUrl?: string;
}

export interface InventoryEntryDto {
  type: EntryType;
  quantity: number;
  notes?: string;
  expiresAt?: string;
  imageUrl?: string;
  aiExtracted?: boolean;
}

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private shopping: ShoppingService,
  ) {}

  async findAllItems() {
    return this.prisma.inventoryItem.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        entries: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOneItem(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: true,
        entries: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    return item;
  }

  async createItem(dto: CreateInventoryItemDto) {
    return this.prisma.inventoryItem.create({
      data: {
        name: dto.name,
        unit: dto.unit,
        categoryId: dto.categoryId,
        minQuantity: dto.minQuantity ?? 1,
        location: dto.location,
        imageUrl: dto.imageUrl,
      },
      include: { category: true },
    });
  }

  async addEntry(itemId: string, dto: InventoryEntryDto, userId: string) {
    const item = await this.prisma.inventoryItem.findUniqueOrThrow({
      where: { id: itemId, deletedAt: null },
    });

    if (dto.type === EntryType.OUT && item.quantity < dto.quantity) {
      throw new BadRequestException('Quantidade insuficiente em estoque');
    }

    const delta =
      dto.type === EntryType.IN
        ? dto.quantity
        : dto.type === EntryType.OUT
        ? -dto.quantity
        : 0;

    const [entry, updated] = await this.prisma.$transaction([
      this.prisma.inventoryEntry.create({
        data: {
          itemId,
          userId,
          type: dto.type,
          quantity: dto.quantity,
          notes: dto.notes,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          imageUrl: dto.imageUrl,
          aiExtracted: dto.aiExtracted ?? false,
        },
      }),
      this.prisma.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: { increment: delta } },
      }),
    ]);

    if (updated.quantity < updated.minQuantity) {
      await this.handleLowStock(updated, userId);
    }

    return entry;
  }

  async findCategories() {
    return this.prisma.inventoryCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(name: string, icon?: string) {
    return this.prisma.inventoryCategory.create({ data: { name, icon } });
  }

  private async handleLowStock(item: { id: string; name: string; quantity: number; minQuantity: number }, userId: string) {
    const users = await this.prisma.user.findMany({ where: { isActive: true, deletedAt: null } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    for (const u of users) {
      await this.notifications.send(u.id, {
        type: NotificationType.STOCK_LOW,
        title: 'Estoque Baixo',
        message: `${item.name} está com quantidade baixa (${item.quantity} restante(s), mínimo: ${item.minQuantity})`,
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpirations() {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiring = await this.prisma.inventoryEntry.findMany({
      where: {
        expiresAt: { lte: threeDaysFromNow, gte: new Date() },
      },
      include: {
        item: true,
        user: true,
      },
    });

    const users = await this.prisma.user.findMany({ where: { isActive: true, deletedAt: null } });

    for (const entry of expiring) {
      for (const u of users) {
        await this.notifications.send(u.id, {
          type: NotificationType.STOCK_EXPIRING,
          title: 'Produto Próximo do Vencimento',
          message: `${entry.item.name} vence em ${entry.expiresAt?.toLocaleDateString('pt-BR')}`,
        });
      }
    }
  }
}
