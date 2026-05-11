import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { ShoppingModule } from '../shopping/shopping.module';
import { InventoryModule } from '../inventory/inventory.module';
import { FinanceModule } from '../finance/finance.module';
import { EventsModule } from '../events/events.module';
import { TasksModule } from '../tasks/tasks.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [ShoppingModule, InventoryModule, FinanceModule, EventsModule, TasksModule, AiModule],
  providers: [TelegramService],
  controllers: [TelegramController],
})
export class TelegramModule {}
