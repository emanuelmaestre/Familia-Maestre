import { Injectable, Logger, RequestTimeoutException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { AiProvider, Prisma, Priority } from '@prisma/client';

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

export interface ProductNormalization {
  normalizedName: string;
  brand: string | null;
  category: string;
  variant: string | null;
}

@Injectable()
export class AiService {
  private openai?: OpenAI;
  private apiKey?: string;
  private model: string;
  private timeout: number;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = config.get<string>('OPENAI_API_KEY');
    this.model = config.get<string>('OPENAI_MODEL', 'gpt-4o');
    this.timeout = config.get<number>('OPENAI_TIMEOUT_MS', 15000);
  }

  private client() {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY nao configurada');
    }

    this.openai ??= new OpenAI({ apiKey: this.apiKey });
    return this.openai;
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
          estimatedCostUsd: new Prisma.Decimal(estimatedCostUsd),
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
          estimatedCostUsd: new Prisma.Decimal(0),
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
      const response = await this.client().chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Você é um assistente de lista de compras familiar brasileiro. Extraia informações de itens de compra de mensagens em português.
Responda APENAS com JSON válido no formato:
{
  "name": "nome do produto",
  "quantity": 1,
  "unit": "uma destas unidades, quando aplicável: un, unidade, peça, par, kit, jogo, dúzia, pacote, caixa, fardo, saco, sacola, embalagem, refil, kg, g, mg, tonelada, arroba, L, ml, m³, galão, m, cm, mm, m², cm², lata, garrafa, pote, frasco, vidro, bisnaga, tubo, sachê, envelope, cartela, blister, barra, tablete, rolo, bobina, folha, maço, molho, ramo, cabeça, pé, bandeja, comprimido, cápsula, ampola, dose, porção, fatias, xícara, colher, pitada; use null se não houver unidade",
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

  async normalizeProduct(rawName: string): Promise<ProductNormalization> {
    return this.callWithLog('purchases', 'normalize_product', undefined, async () => {
      const response = await this.client().chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Você interpreta nomes de produtos de cupons fiscais brasileiros (abreviados, em caixa alta) e retorna informações organizadas.
Responda APENAS com JSON válido:
{
  "normalizedName": "nome legível do produto em português (ex: Hamburguer Bovino)",
  "brand": "marca do produto ou null se não identificável (ex: Friboi, Heinz, null)",
  "category": "uma destas categorias: Carnes|Laticínios|Grãos e Cereais|Frutas e Verduras|Bebidas|Limpeza|Higiene|Padaria|Congelados|Frios e Embutidos|Condimentos e Temperos|Conservas|Massas e Molhos|Snacks|Outros",
  "variant": "variante/tamanho/formato do produto ou null (ex: 36x56g, 400g, 1,033kg, null)"
}

Exemplos:
- "HAMB BOV FRIB 36X56G" → {"normalizedName":"Hamburguer Bovino","brand":"Friboi","category":"Congelados","variant":"36x56g"}
- "10G NAT ITA 170G INT" → {"normalizedName":"Iogurte Natural Integral","brand":"Itambé","category":"Laticínios","variant":"170g"}
- "CATCH HEINZ 1,033KG" → {"normalizedName":"Catchup","brand":"Heinz","category":"Condimentos e Temperos","variant":"1,033kg"}
- "MAION HEINZ 400G" → {"normalizedName":"Maionese","brand":"Heinz","category":"Condimentos e Temperos","variant":"400g"}
- "PATINHO BOV FC KG" → {"normalizedName":"Patinho Bovino","brand":null,"category":"Carnes","variant":null}`,
          },
          { role: 'user', content: rawName },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content ?? '{}';
      return {
        result: JSON.parse(content) as ProductNormalization,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      };
    });
  }

  async extractReceipt(imageUrl: string, userId: string): Promise<ReceiptExtraction> {
    return this.callWithLog('finance', 'extract_receipt', userId, async () => {
      const response = await this.client().chat.completions.create({
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

  async extractEventFromDocument(imageUrl: string, userId: string) {
    return this.callWithLog('events', 'extract_document', userId, async () => {
      const response = await this.client().chat.completions.create({
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
