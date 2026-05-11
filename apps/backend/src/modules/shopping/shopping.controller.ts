import {
  Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  ShoppingService,
  CreateShoppingItemDto,
  UpdateShoppingItemDto,
  PurchaseItemDto,
} from './shopping.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, Priority, ShoppingItemStatus } from '@prisma/client';

@ApiTags('shopping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shopping')
export class ShoppingController {
  constructor(private shoppingService: ShoppingService) {}

  @Get()
  findAll(
    @Query('status') status?: ShoppingItemStatus,
    @Query('category') category?: string,
    @Query('priority') priority?: Priority,
    @Query('requestedById') requestedById?: string,
  ) {
    return this.shoppingService.findAll({ status, category, priority, requestedById });
  }

  @Post()
  create(@Body() dto: CreateShoppingItemDto, @CurrentUser() user: User) {
    return this.shoppingService.create(dto, user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateShoppingItemDto) {
    return this.shoppingService.update(id, dto);
  }

  @Patch(':id/purchase')
  markPurchased(
    @Param('id') id: string,
    @Body() dto: PurchaseItemDto,
    @CurrentUser() user: User,
  ) {
    return this.shoppingService.markPurchased(id, dto, user);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.shoppingService.cancel(id, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.shoppingService.remove(id, user);
  }
}
