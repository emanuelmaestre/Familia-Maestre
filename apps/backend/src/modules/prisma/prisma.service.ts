import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const envPath = resolve(process.cwd(), 'apps/backend/.env');
config({ path: existsSync(envPath) ? envPath : resolve(process.cwd(), '.env') });

function normalizeConnectionString(connectionString: string) {
  return connectionString.replace('@@', '%40@');
}

const adapter = new PrismaPg({
  connectionString: normalizeConnectionString(process.env.DIRECT_URL ?? process.env.DATABASE_URL!),
});

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
