import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  constructor(
    private telegramService: TelegramService,
    private config: ConfigService,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Body() update: unknown,
    @Headers('x-telegram-bot-api-secret-token') secret?: string,
  ) {
    const expectedSecret = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET');
    if (expectedSecret && secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    await this.telegramService.handleWebhookUpdate(update);
    return { ok: true };
  }
}
