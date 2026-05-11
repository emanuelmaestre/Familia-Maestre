import {
  Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService, CreateTransactionDto, UpdateTransactionDto } from './finance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TransactionType, User } from '@prisma/client';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('categories')
  getCategories() {
    return this.financeService.findCategories();
  }

  @Post('categories')
  createCategory(@Body() body: { name: string; type: TransactionType; color?: string }) {
    return this.financeService.createCategory(body.name, body.type, body.color);
  }

  @Get('transactions')
  findAll(
    @CurrentUser() user: User,
    @Query('type') type?: TransactionType,
    @Query('isPaid') isPaid?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.financeService.findAll(user, {
      type,
      isPaid: isPaid !== undefined ? isPaid === 'true' : undefined,
      month: month ? +month : undefined,
      year: year ? +year : undefined,
    });
  }

  @Post('transactions')
  create(@Body() dto: CreateTransactionDto, @CurrentUser() user: User) {
    return this.financeService.create(dto, user.id);
  }

  @Put('transactions/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto, @CurrentUser() user: User) {
    return this.financeService.update(id, dto, user);
  }

  @Patch('transactions/:id/pay')
  markPaid(@Param('id') id: string, @CurrentUser() user: User) {
    return this.financeService.markPaid(id, user);
  }

  @Delete('transactions/:id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.financeService.remove(id, user);
  }

  @Get('summary')
  getSummary(
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.financeService.getSummary(
      month ? +month : now.getMonth() + 1,
      year ? +year : now.getFullYear(),
    );
  }
}
