import { config } from 'dotenv';
config({ path: '.env' });

import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('familia@2024', 10);

  const admin = await prisma.user.upsert({
    where: { phone: '000000001' },
    update: {},
    create: {
      name: 'Admin Família',
      phone: '000000001',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const member = await prisma.user.upsert({
    where: { phone: '000000002' },
    update: {},
    create: {
      name: 'Membro Família',
      phone: '000000002',
      passwordHash,
      role: Role.MEMBER,
    },
  });

  const categories = [
    { name: 'Grãos e Cereais', icon: '🌾' },
    { name: 'Laticínios', icon: '🥛' },
    { name: 'Carnes e Aves', icon: '🥩' },
    { name: 'Frutas e Verduras', icon: '🥦' },
    { name: 'Bebidas', icon: '🥤' },
    { name: 'Limpeza', icon: '🧹' },
    { name: 'Higiene', icon: '🧼' },
    { name: 'Condimentos', icon: '🧂' },
    { name: 'Padaria', icon: '🍞' },
    { name: 'Outros', icon: '📦' },
  ];

  for (const cat of categories) {
    await prisma.inventoryCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  const txCategories = [
    { name: 'Alimentação', type: 'EXPENSE' as const, color: '#f97316' },
    { name: 'Saúde', type: 'EXPENSE' as const, color: '#ef4444' },
    { name: 'Educação', type: 'EXPENSE' as const, color: '#3b82f6' },
    { name: 'Transporte', type: 'EXPENSE' as const, color: '#8b5cf6' },
    { name: 'Moradia', type: 'EXPENSE' as const, color: '#6b7280' },
    { name: 'Lazer', type: 'EXPENSE' as const, color: '#ec4899' },
    { name: 'Salário', type: 'INCOME' as const, color: '#22c55e' },
    { name: 'Outros (Receita)', type: 'INCOME' as const, color: '#10b981' },
  ];

  for (const cat of txCategories) {
    await prisma.transactionCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  await prisma.shoppingList.upsert({
    where: { id: 'lista-principal' },
    update: {},
    create: { id: 'lista-principal', name: 'Lista Principal', isActive: true },
  });

  console.log('✅ Seed concluído:', { admin: admin.name, member: member.name });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
