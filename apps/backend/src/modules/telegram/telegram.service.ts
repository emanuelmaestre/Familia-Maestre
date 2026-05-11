import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { PrismaService } from '../prisma/prisma.service';
import { ShoppingService } from '../shopping/shopping.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf | null = null;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private shopping: ShoppingService,
    private ai: AiService,
  ) {}

  async onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN não configurado — bot desativado');
      return;
    }

    this.bot = new Telegraf(token);
    this.setupHandlers();

    const webhookUrl = this.config.get<string>('TELEGRAM_WEBHOOK_URL');
    if (webhookUrl && this.config.get('NODE_ENV') === 'production') {
      await this.bot.telegram.setWebhook(`${webhookUrl}`);
      this.logger.log(`Webhook configurado: ${webhookUrl}`);
    } else {
      this.bot.launch().catch((err) => this.logger.error('Bot launch error:', err));
      this.logger.log('Bot iniciado em modo polling (dev)');
    }
  }

  private setupHandlers() {
    if (!this.bot) return;

    this.bot.command('start', (ctx) => {
      ctx.reply(
        '👋 Olá! Sou o assistente da família.\n\n' +
        'Comandos disponíveis:\n' +
        '/lista — Ver lista de compras\n' +
        '/estoque — Ver estoque\n' +
        '/financeiro — Resumo financeiro\n' +
        '/agenda — Próximos eventos\n' +
        '/tarefas — Minhas tarefas\n' +
        '/relatorio — Relatório semanal\n\n' +
        'Você também pode enviar mensagens como:\n' +
        '"Acabou o arroz" para adicionar à lista 🛒',
      );
    });

    this.bot.command('lista', async (ctx) => {
      const items = await this.shopping.findAll({ status: 'PENDING' });
      if (items.length === 0) {
        return ctx.reply('✅ A lista de compras está vazia!');
      }
      const text = items
        .map((i) => `• ${i.name} (${i.quantity}${i.unit ? ' ' + i.unit : ''}) — ${i.priority}`)
        .join('\n');
      ctx.reply(`🛒 *Lista de compras:*\n${text}`, { parse_mode: 'Markdown' });
    });

    this.bot.command('tarefas', async (ctx) => {
      const user = await this.getUserByTelegramId(ctx.from?.id?.toString());
      if (!user) return ctx.reply('❌ Usuário não encontrado. Cadastre-se no sistema.');

      ctx.reply('📋 Acesse o dashboard para ver suas tarefas: ' + (this.config.get('FRONTEND_URL') ?? 'http://localhost:3000'));
    });

    this.bot.command('financeiro', async (ctx) => {
      ctx.reply('💰 Acesse o dashboard para ver o financeiro: ' + (this.config.get('FRONTEND_URL') ?? 'http://localhost:3000'));
    });

    this.bot.command('agenda', async (ctx) => {
      ctx.reply('📅 Acesse o dashboard para ver a agenda: ' + (this.config.get('FRONTEND_URL') ?? 'http://localhost:3000'));
    });

    this.bot.on('text', async (ctx) => {
      const telegramId = ctx.from?.id?.toString();
      const user = await this.getUserByTelegramId(telegramId);

      if (!user) {
        return ctx.reply('❌ Você não está cadastrado no sistema. Peça ao administrador para te adicionar.');
      }

      const message = ctx.message.text;
      if (message.startsWith('/')) return;

      try {
        const result = await this.shopping.createFromMessage(message, user);

        if ('alreadyExists' in result && result.alreadyExists) {
          ctx.reply(`ℹ️ ${result.message}`);
        } else if ('name' in result) {
          ctx.reply(
            `✓ *${result.name}* adicionado à lista ` +
            `(${result.quantity}${result.unit ? ' ' + result.unit : ''}${result.category ? ` — ${result.category}` : ''})`,
            { parse_mode: 'Markdown' },
          );
        }
      } catch (err) {
        this.logger.error('Erro ao processar mensagem Telegram:', err);
        ctx.reply('❌ Não consegui processar sua mensagem. Tente novamente.');
      }
    });

    this.bot.on('callback_query', async (ctx) => {
      const data = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';

      if (data?.startsWith('confirm_event:')) {
        const [, eventId, confirmed] = data.split(':');
        ctx.reply(confirmed === 'true' ? '✅ Presença confirmada!' : '❌ Presença recusada. Obrigado por informar!');
        await ctx.answerCbQuery();
      }
    });
  }

  private async getUserByTelegramId(telegramId?: string) {
    if (!telegramId) return null;
    return this.prisma.user.findUnique({
      where: { telegramId, deletedAt: null, isActive: true },
    });
  }

  async handleWebhookUpdate(update: unknown) {
    if (this.bot) {
      await this.bot.handleUpdate(update as Parameters<typeof this.bot.handleUpdate>[0]);
    }
  }
}
