import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventStatus, EventType, NotificationType, Role, User } from '@prisma/client';

export interface CreateEventDto {
  title: string;
  type: EventType;
  startsAt: string;
  endsAt?: string;
  description?: string;
  location?: string;
  isRecurring?: boolean;
  recurringRule?: string;
  documentUrl?: string;
  notes?: string;
  attendeeIds?: string[];
}

export interface UpdateEventDto {
  title?: string;
  type?: EventType;
  startsAt?: string;
  endsAt?: string;
  description?: string;
  location?: string;
  notes?: string;
  status?: EventStatus;
}

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(filters?: { status?: EventStatus; type?: EventType; from?: string; to?: string }) {
    return this.prisma.event.findMany({
      where: {
        deletedAt: null,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.from || filters?.to
          ? { startsAt: { gte: filters.from ? new Date(filters.from) : undefined, lte: filters.to ? new Date(filters.to) : undefined } }
          : {}),
      },
      include: {
        attendees: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id, deletedAt: null },
      include: {
        attendees: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');
    return event;
  }

  async create(dto: CreateEventDto, _userId: string) {
    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        type: dto.type,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        description: dto.description,
        location: dto.location,
        isRecurring: dto.isRecurring ?? false,
        recurringRule: dto.recurringRule,
        documentUrl: dto.documentUrl,
        notes: dto.notes,
      },
    });

    if (dto.attendeeIds?.length) {
      await this.prisma.eventAttendee.createMany({
        data: dto.attendeeIds.map((uid) => ({ eventId: event.id, userId: uid })),
        skipDuplicates: true,
      });
    }

    return this.findOne(event.id);
  }

  async update(id: string, dto: UpdateEventDto, user: User) {
    await this.findOne(id);
    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async cancel(id: string, user: User) {
    const event = await this.findOne(id);
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Apenas ADMIN pode cancelar eventos de outros membros');

    return this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.CANCELLED },
    });
  }

  async confirmAttendance(eventId: string, userId: string, confirmed: boolean) {
    return this.prisma.eventAttendee.update({
      where: { eventId_userId: { eventId, userId } },
      data: { confirmed, confirmedAt: confirmed ? new Date() : null },
    });
  }

  @Cron('0 9 * * *')
  async sendDayBeforeReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = await this.prisma.event.findMany({
      where: {
        deletedAt: null,
        status: { in: [EventStatus.SCHEDULED, EventStatus.CONFIRMED] },
        startsAt: {
          gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
          lte: new Date(tomorrow.setHours(23, 59, 59, 999)),
        },
      },
      include: {
        attendees: { include: { user: true } },
      },
    });

    for (const event of events) {
      for (const attendee of event.attendees) {
        await this.notifications.send(attendee.userId, {
          type: NotificationType.EVENT_REMINDER,
          title: 'Evento amanhã',
          message: `${event.title} - ${new Date(event.startsAt).toLocaleString('pt-BR')} ${event.location ? `em ${event.location}` : ''}`,
        });
      }
    }
  }
}
