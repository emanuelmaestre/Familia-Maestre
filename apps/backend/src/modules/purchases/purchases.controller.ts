import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateReceiptDto, PurchasesService } from './purchases.service';
import { runFiscalEngine, type FiscalEngineInput } from './fiscal-engine';

@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get('products')
  products() {
    return this.purchasesService.findProducts();
  }

  @Get('receipts')
  receipts() {
    return this.purchasesService.findReceipts();
  }

  @Get('history')
  history(@Query('productName') productName?: string) {
    return this.purchasesService.findHistory(productName);
  }

  @Post('receipts')
  createReceipt(@Body() dto: CreateReceiptDto, @CurrentUser() user: User) {
    return this.purchasesService.createReceipt(dto, user.id);
  }

  @Post('import-qr')
  importQr(@Body() dto: FiscalEngineInput) {
    return runFiscalEngine(dto);
  }
}
