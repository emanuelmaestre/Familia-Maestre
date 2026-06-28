import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { Priority, ShoppingItemStatus, Role, User } from '@prisma/client';

export interface CreateShoppingItemDto {
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  priority?: Priority;
  notes?: string;
  estimatedPrice?: number;
}

export interface UpdateShoppingItemDto {
  name?: string;
  quantity?: number;
  unit?: string;
  category?: string;
  priority?: Priority;
  notes?: string;
  estimatedPrice?: number;
}

export interface PurchaseItemDto {
  purchasedPrice?: number;
  createTransaction?: boolean;
}

@Injectable()
export class ShoppingService {
  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  private async getActiveList() {
    let list = await this.prisma.shoppingList.findFirst({
      where: { isActive: true, deletedAt: null },
    });
    if (!list) {
      list = await this.prisma.shoppingList.create({
        data: { name: 'Lista Principal' },
      });
    }
    return list;
  }

  async findAll(filters?: {
    status?: ShoppingItemStatus;
    category?: string;
    priority?: Priority;
    requestedById?: string;
  }) {
    const list = await this.getActiveList();
    return this.prisma.shoppingItem.findMany({
      where: {
        listId: list.id,
        deletedAt: null,
        ...filters,
      },
      include: {
        requestedBy: { select: { id: true, name: true, avatarUrl: true } },
        purchasedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateShoppingItemDto, user: User) {
    const list = await this.getActiveList();

    const existing = await this.prisma.shoppingItem.findFirst({
      where: {
        listId: list.id,
        name: { equals: dto.name, mode: 'insensitive' },
        status: ShoppingItemStatus.PENDING,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`"${dto.name}" já está na lista como pendente`);
    }

    const item = await this.prisma.shoppingItem.create({
      data: {
        listId: list.id,
        name: dto.name,
        quantity: dto.quantity ?? 1,
        unit: dto.unit,
        category: dto.category,
        priority: dto.priority ?? Priority.MEDIUM,
        notes: dto.notes,
        estimatedPrice: dto.estimatedPrice,
        requestedById: user.id,
      },
      include: {
        requestedBy: { select: { id: true, name: true } },
      },
    });

    return item;
  }

  async createFromMessage(message: string, user: User) {
    const extracted = await this.ai.extractShoppingItem(message, user.id);

    return this.create(
      {
        name: extracted.name,
        quantity: extracted.quantity,
        unit: extracted.unit,
        category: extracted.category,
        priority: extracted.priority,
      },
      user,
    ).catch(async (err) => {
      if (err instanceof ConflictException) {
        return { message: err.message, alreadyExists: true };
      }
      throw err;
    });
  }

  async markPurchased(id: string, dto: PurchaseItemDto, user: User) {
    await this.prisma.shoppingItem.findFirstOrThrow({
      where: { id, deletedAt: null },
    });

    const updated = await this.prisma.shoppingItem.update({
      where: { id },
      data: {
        status: ShoppingItemStatus.PURCHASED,
        purchasedById: user.id,
        purchasedPrice: dto.purchasedPrice,
        purchasedAt: new Date(),
      },
    });

    return updated;
  }

  async cancel(id: string, user: User) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Apenas ADMIN pode cancelar itens');

    const existing = await this.prisma.shoppingItem.findFirstOrThrow({
      where: { id, deletedAt: null },
    });

    const updated = await this.prisma.shoppingItem.update({
      where: { id: existing.id },
      data: { status: ShoppingItemStatus.CANCELLED },
    });

    return updated;
  }

  async remove(id: string, user: User) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Apenas ADMIN pode excluir itens');

    const existing = await this.prisma.shoppingItem.findFirstOrThrow({
      where: { id, deletedAt: null },
    });

    await this.prisma.shoppingItem.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Item removido' };
  }

  async update(id: string, dto: UpdateShoppingItemDto) {
    const existing = await this.prisma.shoppingItem.findFirstOrThrow({
      where: { id, deletedAt: null },
    });

    const item = await this.prisma.shoppingItem.update({
      where: { id: existing.id },
      data: dto,
    });
    return item;
  }
}
