import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ShoppingService } from '../shopping/shopping.service';
import { AiService } from '../ai/ai.service';
import { PurchasesService } from '../purchases/purchases.service';
import { runFiscalEngine, type FiscalEngineResult } from '../purchases/fiscal-engine';

interface ZApiMessage {
  phone: string;
  text?: { message: string };
  image?: { imageUrl?: string; caption?: string; mimeType?: string };
  document?: { documentUrl?: string; fileName?: string; mimeType?: string };
  isGroupMsg?: boolean;
}

interface PendingReceipt {
  result: FiscalEngineResult;
  userId: string;
}

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly zapiBase: string;
  private readonly zapiClientToken: string;
  private enabled = false;

  /** Aguarda confirmação do usuário antes de salvar a NF. Chave: phone */
  private readonly pendingReceipts = new Map<string, PendingReceipt>();

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private shopping: ShoppingService,
    private ai: AiService,
    private purchases: PurchasesService,
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

  private async downloadAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao baixar imagem: ${response.status}`);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }

  private formatReceiptSummary(result: FiscalEngineResult): string {
    const lines: string[] = [];
    lines.push('*Nota Fiscal lida com sucesso!*');
    lines.push('');
    if (result.supplierName) lines.push(`🏪 *Fornecedor:* ${result.supplierName}`);
    if (result.purchaseDate) lines.push(`📅 *Data:* ${result.purchaseDate}`);
    if (result.totalAmount) lines.push(`💰 *Total:* R$ ${result.totalAmount.toFixed(2).replace('.', ',')}`);
    if (result.paymentMethod) {
      const methods: Record<string, string> = {
        PIX: 'PIX',
        CASH: 'Dinheiro',
        DEBIT_CARD: 'Débito',
        CREDIT_CARD: 'Crédito',
      };
      lines.push(`💳 *Pagamento:* ${methods[result.paymentMethod] ?? result.paymentMethod}`);
    }

    if (result.items.length > 0) {
      lines.push('');
      lines.push('*Itens:*');
      for (const item of result.items.slice(0, 10)) {
        lines.push(`  • ${item.productName} — ${item.quantity}x R$ ${item.unitPrice.toFixed(2).replace('.', ',')}`);
      }
      if (result.items.length > 10) {
        lines.push(`  ... e mais ${result.items.length - 10} itens`);
      }
    }

    if (result.warnings?.length) {
      lines.push('');
      lines.push(`⚠️ ${result.warnings.join('; ')}`);
    }

    lines.push('');
    lines.push('Deseja salvar esta nota? Responda *sim* para confirmar ou *não* para cancelar.');
    return lines.join('\n');
  }

  private async handleImageMessage(phone: string, userId: string, imageUrl: string, fileName?: string) {
    await this.sendText(phone, '🔍 Lendo sua nota fiscal, aguarde...');

    const imageBase64 = await this.downloadAsBase64(imageUrl);
    const result = await runFiscalEngine({ imageBase64, fileName });

    if (!result.items.length) {
      await this.sendText(phone, '⚠️ Não consegui identificar itens nesta imagem. Tente com uma foto mais nítida e de frente para a nota.');
      return;
    }

    this.pendingReceipts.set(phone, { result, userId });
    await this.sendText(phone, this.formatReceiptSummary(result));
  }

  private async handleConfirmation(phone: string, message: string, userId: string) {
    const pending = this.pendingReceipts.get(phone);
    if (!pending) return false;

    const normalized = message.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    if (normalized === 'sim' || normalized === 's') {
      this.pendingReceipts.delete(phone);
      const { result } = pending;
      await this.purchases.createReceipt(
        {
          qrCodeRaw: result.qrCodeRaw,
          url: result.url,
          accessKey: result.accessKey,
          supplierName: result.supplierName,
          tradeName: result.tradeName,
          documentNumber: result.documentNumber,
          purchaseDate: result.purchaseDate ?? new Date().toISOString().slice(0, 10),
          totalAmount: result.totalAmount ?? 0,
          paymentMethod: result.paymentMethod as never,
          items: result.items,
        },
        userId,
      );
      await this.sendText(phone, '✅ Nota fiscal salva com sucesso!');
      return true;
    }

    if (normalized === 'nao' || normalized === 'n' || normalized === 'não') {
      this.pendingReceipts.delete(phone);
      await this.sendText(phone, '❌ Nota fiscal descartada.');
      return true;
    }

    return false;
  }

  async handleWebhook(payload: ZApiMessage) {
    if (payload.isGroupMsg) return;

    const phone = payload.phone;
    if (!phone) return;

    const user = await this.prisma.user.findFirst({
      where: { phone, deletedAt: null, isActive: true },
    });

    if (!user) {
      await this.sendText(phone, 'Você não está cadastrado no sistema. Peça ao administrador para te adicionar.');
      return;
    }

    // Mensagem de imagem → processar NF
    const imageUrl = payload.image?.imageUrl ?? payload.document?.documentUrl;
    if (imageUrl) {
      try {
        await this.handleImageMessage(phone, user.id, imageUrl, payload.document?.fileName);
      } catch (err) {
        this.logger.error('Erro ao processar imagem de NF:', err);
        await this.sendText(phone, '❌ Erro ao processar a nota fiscal. Verifique se a imagem está nítida e tente novamente.');
      }
      return;
    }

    const message = payload.text?.message?.trim();
    if (!message) return;

    // Confirmação pendente tem prioridade
    if (this.pendingReceipts.has(phone)) {
      const handled = await this.handleConfirmation(phone, message, user.id);
      if (handled) return;
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
        '📷 *Nota fiscal:* Envie uma foto da NF e eu registro automaticamente!\n\n' +
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
