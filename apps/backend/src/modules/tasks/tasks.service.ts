import { Injectable, ForbiddenException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AssignmentMethod,
  NotificationType,
  Role,
  TaskFrequency,
  TaskStatus,
  User,
} from '@prisma/client';

export interface CreateTaskDto {
  name: string;
  description?: string;
  frequency: TaskFrequency;
  effortScore?: number;
}

export interface AssignTaskDto {
  userId: string;
  dueDate: string;
  method?: AssignmentMethod;
}

export interface CompleteTaskDto {
  status: TaskStatus;
  notes?: string;
}

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAllTasks() {
    return this.prisma.task.findMany({
      where: { deletedAt: null },
      include: {
        assignments: {
          where: { deletedAt: null },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
            completion: true,
          },
          orderBy: { dueDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTask(dto: CreateTaskDto, user: User) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Apenas ADMIN pode criar tarefas');

    return this.prisma.task.create({
      data: {
        name: dto.name,
        description: dto.description,
        frequency: dto.frequency,
        effortScore: dto.effortScore ?? 1,
      },
    });
  }

  async assignTask(taskId: string, dto: AssignTaskDto, user: User) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Apenas ADMIN pode atribuir tarefas');

    const assignment = await this.prisma.taskAssignment.create({
      data: {
        taskId,
        userId: dto.userId,
        dueDate: new Date(dto.dueDate),
        method: dto.method ?? AssignmentMethod.MANUAL,
      },
      include: {
        task: true,
        user: true,
      },
    });

    await this.notifications.send(dto.userId, {
      type: NotificationType.TASK_DUE,
      title: 'Nova tarefa atribuída',
      message: `${assignment.task.name} — prazo: ${new Date(dto.dueDate).toLocaleDateString('pt-BR')}`,
    });

    return assignment;
  }

  async completeAssignment(assignmentId: string, dto: CompleteTaskDto, user: User) {
    const assignment = await this.prisma.taskAssignment.findUniqueOrThrow({
      where: { id: assignmentId, deletedAt: null },
    });

    if (user.role !== Role.ADMIN && assignment.userId !== user.id) {
      throw new ForbiddenException('Sem permissão para completar esta tarefa');
    }

    return this.prisma.taskCompletion.create({
      data: {
        assignmentId,
        userId: user.id,
        status: dto.status,
        notes: dto.notes,
        completedAt: dto.status === TaskStatus.DONE ? new Date() : undefined,
      },
    });
  }

  async getMyAssignments(userId: string) {
    return this.prisma.taskAssignment.findMany({
      where: {
        userId,
        deletedAt: null,
        completion: null,
        dueDate: { gte: new Date() },
      },
      include: {
        task: true,
        completion: true,
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getMonthlyScoreboard() {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const completions = await this.prisma.taskCompletion.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        assignment: { include: { task: { select: { effortScore: true } } } },
      },
    });

    const byUser: Record<string, { userId: string; name: string; avatarUrl: string | null; done: number; skipped: number; effort: number }> = {};

    for (const c of completions) {
      if (!byUser[c.userId]) {
        byUser[c.userId] = {
          userId: c.userId,
          name: c.user.name,
          avatarUrl: c.user.avatarUrl,
          done: 0,
          skipped: 0,
          effort: 0,
        };
      }
      if (c.status === TaskStatus.DONE) {
        byUser[c.userId].done++;
        byUser[c.userId].effort += c.assignment.task.effortScore;
      } else {
        byUser[c.userId].skipped++;
      }
    }

    return Object.values(byUser).sort((a, b) => b.effort - a.effort);
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkOverdueTasks() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const overdue = await this.prisma.taskAssignment.findMany({
      where: {
        deletedAt: null,
        dueDate: { lte: yesterday },
        completion: null,
      },
      include: { task: true, user: true },
    });

    for (const assignment of overdue) {
      await this.notifications.send(assignment.userId, {
        type: NotificationType.TASK_OVERDUE,
        title: 'Tarefa em atraso',
        message: `${assignment.task.name} estava prevista para ${assignment.dueDate.toLocaleDateString('pt-BR')}`,
      });

      const admins = await this.prisma.user.findMany({
        where: { role: Role.ADMIN, isActive: true, deletedAt: null },
      });
      for (const admin of admins) {
        if (admin.id !== assignment.userId) {
          await this.notifications.send(admin.id, {
            type: NotificationType.TASK_OVERDUE,
            title: 'Tarefa em atraso',
            message: `${assignment.user.name} não completou: ${assignment.task.name}`,
          });
        }
      }
    }
  }
}
