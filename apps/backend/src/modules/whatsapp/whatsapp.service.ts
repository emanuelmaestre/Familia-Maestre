import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ShoppingService } from '../shopping/shopping.service';
import { AiService } from '../ai/ai.service';

interface ZApiMessage {
  phone: string;
  text?: { message: string };
  isGroupMsg?: boolean;
}

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly zapiBase: string;
  private readonly zapiClientToken: string;
  private enabled = false;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private shopping: ShoppingService,
    private ai: AiService,
  ) {
    const instanceId = config.get<string>('ZAPI_INSTANCE_ID') ?? '';
    const token = config.get<string>('ZAPI_TOKEN') ?? '';
    this.zapiBase = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
    this.zapiClientToken = config.get<string>('ZAPI_CLIENT_TOKEN') ?? '';
  }

  onModuleInit() {
    if (this.zapiClientToken) {
      this.enabled = true;
      this.logger.log('WhatsApp Z-API habilitado');
    } else {
      this.logger.warn('ZAPI_CLIENT_TOKEN não configurado — WhatsApp desativado');
    }
  }

  async sendText(phone: string, message: string) {
    if (!this.enabled) return;

    await fetch(`${this.zapiBase}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': this.zapiClientToken,
      },
      body: JSON.stringify({ phone, message }),
    });
  }

  async handleWebhook(payload: ZApiMessage) {
    if (payload.isGroupMsg) return;

    const phone = payload.phone;
    const message = payload.text?.message?.trim();

    if (!message || !phone) return;

    const user = await this.prisma.user.findUnique({
      where: { phone, deletedAt: null, isActive: true },
    });

    if (!user) {
      await this.sendText(phone,
        'Você não está cadastrado no sistema. Peça ao administrador para te adicionar.',
      );
      return;
    }

    if (message.toLowerCase() === '/lista') {
      const items = await this.shopping.findAll({ status: 'PENDING' });
      if (items.length === 0) {
        await this.sendText(phone, 'A lista de compras está vazia!');
      } else {
        const text = items
          .map((i) => `• ${i.name} (${i.quantity}${i.unit ? ' ' + i.unit : ''}) — ${i.priority}`)
          .join('\n');
        await this.sendText(phone, `*Lista de compras:*\n${text}`);
      }
      return;
    }

    if (message.toLowerCase() === '/ajuda') {
      await this.sendText(phone,
        'Olá! Sou o assistente da família.\n\n' +
        'Comandos:\n' +
        '/lista — Ver lista de compras\n' +
        '/ajuda — Ver este menu\n\n' +
        'Você também pode enviar mensagens como:\n' +
        '"Acabou o arroz" para adicionar à lista.',
      );
      return;
    }

    try {
      const result = await this.shopping.createFromMessage(message, user);

      if ('alreadyExists' in result && result.alreadyExists) {
        await this.sendText(phone, result.message);
      } else if ('name' in result) {
        await this.sendText(phone,
          `✓ *${result.name}* adicionado à lista ` +
          `(${result.quantity}${result.unit ? ' ' + result.unit : ''}` +
          `${result.category ? ` — ${result.category}` : ''})`,
        );
      }
    } catch (err) {
      this.logger.error('Erro ao processar mensagem WhatsApp:', err);
      await this.sendText(phone, 'Não consegui processar sua mensagem. Tente novamente.');
    }
  }
}
