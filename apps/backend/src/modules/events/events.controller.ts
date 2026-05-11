import {
  Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService, CreateEventDto, UpdateEventDto } from './events.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EventStatus, EventType, User } from '@prisma/client';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  findAll(
    @Query('status') status?: EventStatus,
    @Query('type') type?: EventType,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.eventsService.findAll({ status, type, from, to });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: User) {
    return this.eventsService.create(dto, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() user: User) {
    return this.eventsService.update(id, dto, user);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.eventsService.cancel(id, user);
  }

  @Patch(':id/confirm')
  confirm(
    @Param('id') id: string,
    @Body('confirmed') confirmed: boolean,
    @CurrentUser() user: User,
  ) {
    return this.eventsService.confirmAttendance(id, user.id, confirmed);
  }
}
