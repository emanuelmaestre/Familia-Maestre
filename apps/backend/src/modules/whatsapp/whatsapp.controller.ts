import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private whatsapp: WhatsAppService,
    private config: ConfigService,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Body() payload: unknown,
    @Headers('x-zapi-secret') secret?: string,
  ) {
    const expectedSecret = this.config.get<string>('ZAPI_WEBHOOK_SECRET');
    if (expectedSecret && secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    await this.whatsapp.handleWebhook(payload as Parameters<WhatsAppService['handleWebhook']>[0]);
    return { ok: true };
  }
}
