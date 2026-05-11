import { Injectable, Logger, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { AiProvider, Priority } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface ShoppingExtraction {
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  priority: Priority;
}

interface ReceiptExtraction {
  items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  total: number;
  date?: string;
  storeName?: string;
}

interface InventoryExtraction {
  name: string;
  quantity: number;
  unit: string;
  expiresAt?: string;
  category?: string;
}

@Injectable()
export class AiService {
  private openai: OpenAI;
  private model: string;
  private timeout: number;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.openai = new OpenAI({ apiKey: config.get<string>('OPENAI_API_KEY') });
    this.model = config.get<string>('OPENAI_MODEL', 'gpt-4o');
    this.timeout = config.get<number>('OPENAI_TIMEOUT_MS', 15000);
  }

  private async callWithLog<T>(
    module: string,
    operation: string,
    userId: string | undefined,
    fn: () => Promise<{ result: T; promptTokens: number; completionTokens: number }>,
  ): Promise<T> {
    const start = Date.now();
    try {
      const { result, promptTokens, completionTokens } = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new RequestTimeoutException('OpenAI timeout')), this.timeout),
        ),
      ]);

      const latencyMs = Date.now() - start;
      const totalTokens = promptTokens + completionTokens;
      const estimatedCostUsd = (promptTokens * 0.005 + completionTokens * 0.015) / 1000;

      await this.prisma.aiLog.create({
        data: {
          provider: AiProvider.OPENAI,
          model: this.model,
          module,
          operation,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCostUsd: new Decimal(estimatedCostUsd),
          latencyMs,
          success: true,
          userId,
        },
      });

      return result;
    } catch (err) {
      await this.prisma.aiLog.create({
        data: {
          provider: AiProvider.OPENAI,
          model: this.model,
          module,
          operation,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostUsd: new Decimal(0),
          latencyMs: Date.now() - start,
          success: false,
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          userId,
        },
      });
      throw err;
    }
  }

  async extractShoppingItem(message: string, userId: string): Promise<ShoppingExtraction> {
    return this.callWithLog('shopping', 'extract_item', userId, async () => {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Você é um assistente de lista de compras familiar brasileiro. Extraia informações de itens de compra de mensagens em português.
Responda APENAS com JSON válido no formato:
{
  "name": "nome do produto",
  "quantity": 1,
  "unit": "kg|unidade|litro|pacote|etc (ou null)",
  "category": "Grãos|Laticínios|Carnes|Frutas e Verduras|Bebidas|Limpeza|Higiene|Condimentos|Padaria|Outros",
  "priority": "MEDIUM|HIGH|URGENT"
}
Palavras como "urgente", "acabou", "faltou", "está acabando" indicam prioridade HIGH ou URGENT.`,
          },
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content ?? '{}';
      return {
        result: JSON.parse(content) as ShoppingExtraction,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      };
    });
  }

  async extractReceipt(imageUrl: string, userId: string): Promise<ReceiptExtraction> {
    return this.callWithLog('finance', 'extract_receipt', userId, async () => {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Extraia informações do cupom fiscal. Responda em JSON:
{
  "items": [{"name": "...", "quantity": 1, "unitPrice": 0.00, "total": 0.00}],
  "total": 0.00,
  "date": "YYYY-MM-DD ou null",
  "storeName": "nome da loja ou null"
}`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extraia os dados deste cupom fiscal:' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content ?? '{}';
      return {
        result: JSON.parse(content) as ReceiptExtraction,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      };
    });
  }

  async extractInventoryLabel(imageUrl: string, userId: string): Promise<InventoryExtraction> {
    return this.callWithLog('inventory', 'extract_label', userId, async () => {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Extraia informações do produto ou etiqueta. Responda em JSON:
{
  "name": "nome do produto",
  "quantity": 1,
  "unit": "unidade|kg|g|litro|ml|pacote",
  "expiresAt": "YYYY-MM-DD ou null",
  "category": "categoria do produto ou null"
}`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extraia os dados desta etiqueta/embalagem:' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content ?? '{}';
      return {
        result: JSON.parse(content) as InventoryExtraction,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      };
    });
  }

  async extractEventFromDocument(imageUrl: string, userId: string) {
    return this.callWithLog('events', 'extract_document', userId, async () => {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Extraia informações de consultas médicas, documentos ou receitas. Responda em JSON:
{
  "title": "título do evento",
  "date": "YYYY-MM-DD",
  "time": "HH:MM ou null",
  "location": "local ou null",
  "doctor": "nome do médico ou null",
  "notes": "observações relevantes ou null"
}`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extraia os dados deste documento:' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content ?? '{}';
      return {
        result: JSON.parse(content),
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      };
    });
  }
}
