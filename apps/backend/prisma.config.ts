import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: path.join(__dirname, '.env') });

const directUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: directUrl,
  },
});
