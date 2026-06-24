import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { ShoppingModule } from '../shopping/shopping.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [ShoppingModule, AiModule],
  providers: [WhatsAppService],
  controllers: [WhatsAppController],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
