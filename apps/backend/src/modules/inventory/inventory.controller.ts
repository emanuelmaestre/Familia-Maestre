import {
  Controller, Get, Post, Param, Body, UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService, CreateInventoryItemDto, InventoryEntryDto } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('categories')
  getCategories() {
    return this.inventoryService.findCategories();
  }

  @Post('categories')
  createCategory(@Body() body: { name: string; icon?: string }) {
    return this.inventoryService.createCategory(body.name, body.icon);
  }

  @Get('items')
  findAll() {
    return this.inventoryService.findAllItems();
  }

  @Get('items/:id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOneItem(id);
  }

  @Post('items')
  create(@Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.createItem(dto);
  }

  @Post('items/:id/entries')
  addEntry(
    @Param('id') id: string,
    @Body() dto: InventoryEntryDto,
    @CurrentUser() user: User,
  ) {
    return this.inventoryService.addEntry(id, dto, user.id);
  }
}
