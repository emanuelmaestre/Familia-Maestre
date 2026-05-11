import {
  Controller, Get, Post, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService, CreateTaskDto, AssignTaskDto, CompleteTaskDto } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  findAll() {
    return this.tasksService.findAllTasks();
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: User) {
    return this.tasksService.createTask(dto, user);
  }

  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignTaskDto, @CurrentUser() user: User) {
    return this.tasksService.assignTask(id, dto, user);
  }

  @Get('my')
  myAssignments(@CurrentUser() user: User) {
    return this.tasksService.getMyAssignments(user.id);
  }

  @Get('scoreboard')
  scoreboard() {
    return this.tasksService.getMonthlyScoreboard();
  }

  @Post('assignments/:id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteTaskDto, @CurrentUser() user: User) {
    return this.tasksService.completeAssignment(id, dto, user);
  }
}
