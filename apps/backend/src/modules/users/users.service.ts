import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

export interface CreateUserDto {
  name: string;
  telegramId: string;
  telegramHandle?: string;
  password: string;
  role?: Role;
  avatarUrl?: string;
}

export interface UpdateUserDto {
  name?: string;
  telegramHandle?: string;
  avatarUrl?: string;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true, name: true, telegramId: true, telegramHandle: true,
        role: true, avatarUrl: true, isActive: true, createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, name: true, telegramId: true, telegramHandle: true,
        role: true, avatarUrl: true, isActive: true, createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { telegramId: dto.telegramId },
    });
    if (exists) throw new ConflictException('Telegram ID já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        telegramId: dto.telegramId,
        telegramHandle: dto.telegramHandle,
        passwordHash,
        role: dto.role ?? Role.MEMBER,
        avatarUrl: dto.avatarUrl,
      },
    });

    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true, name: true, telegramId: true, telegramHandle: true,
        role: true, avatarUrl: true, isActive: true, updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Usuário removido' };
  }

  async getScoreboard() {
    const completions = await this.prisma.taskCompletion.groupBy({
      by: ['userId', 'status'],
      _count: { _all: true },
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    const users = await this.findAll();

    return users.map((u) => {
      const done = completions
        .filter((c) => c.userId === u.id && c.status === 'DONE')
        [0]?._count?._all ?? 0;
      const skipped = completions
        .filter((c) => c.userId === u.id && c.status === 'SKIPPED')
        [0]?._count?._all ?? 0;
      return { ...u, tasksCompleted: done, tasksSkipped: skipped };
    });
  }
}
