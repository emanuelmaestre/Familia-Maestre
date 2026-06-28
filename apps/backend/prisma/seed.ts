import { config } from 'dotenv';
config({ path: '.env' });

import { PrismaClient, Role, TransactionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const txCategories: Array<{ name: string; type: TransactionType; color: string }> = [
  { name: 'Alimentação', type: TransactionType.EXPENSE, color: '#f97316' },
  { name: 'Supermercado', type: TransactionType.EXPENSE, color: '#fb923c' },
  { name: 'Padaria', type: TransactionType.EXPENSE, color: '#f59e0b' },
  { name: 'Feira / Hortifruti', type: TransactionType.EXPENSE, color: '#84cc16' },
  { name: 'Moradia', type: TransactionType.EXPENSE, color: '#6b7280' },
  { name: 'Aluguel / Condomínio', type: TransactionType.EXPENSE, color: '#64748b' },
  { name: 'Água', type: TransactionType.EXPENSE, color: '#06b6d4' },
  { name: 'Energia elétrica', type: TransactionType.EXPENSE, color: '#eab308' },
  { name: 'Internet / Telefone', type: TransactionType.EXPENSE, color: '#0ea5e9' },
  { name: 'Gás', type: TransactionType.EXPENSE, color: '#facc15' },
  { name: 'Transporte', type: TransactionType.EXPENSE, color: '#8b5cf6' },
  { name: 'Combustível', type: TransactionType.EXPENSE, color: '#7c3aed' },
  { name: 'Estacionamento / Pedágio', type: TransactionType.EXPENSE, color: '#a855f7' },
  { name: 'Saúde', type: TransactionType.EXPENSE, color: '#ef4444' },
  { name: 'Farmácia', type: TransactionType.EXPENSE, color: '#f43f5e' },
  { name: 'Plano de saúde', type: TransactionType.EXPENSE, color: '#dc2626' },
  { name: 'Educação', type: TransactionType.EXPENSE, color: '#3b82f6' },
  { name: 'Escola / Curso', type: TransactionType.EXPENSE, color: '#2563eb' },
  { name: 'Material escolar', type: TransactionType.EXPENSE, color: '#60a5fa' },
  { name: 'Lazer', type: TransactionType.EXPENSE, color: '#ec4899' },
  { name: 'Viagens', type: TransactionType.EXPENSE, color: '#db2777' },
  { name: 'Assinaturas', type: TransactionType.EXPENSE, color: '#be185d' },
  { name: 'Vestuário', type: TransactionType.EXPENSE, color: '#14b8a6' },
  { name: 'Cuidados pessoais', type: TransactionType.EXPENSE, color: '#2dd4bf' },
  { name: 'Pets', type: TransactionType.EXPENSE, color: '#a3e635' },
  { name: 'Impostos / Taxas', type: TransactionType.EXPENSE, color: '#475569' },
  { name: 'Manutenção da casa', type: TransactionType.EXPENSE, color: '#78716c' },
  { name: 'Presentes / Doações', type: TransactionType.EXPENSE, color: '#f472b6' },
  { name: 'Serviços domésticos', type: TransactionType.EXPENSE, color: '#94a3b8' },
  { name: 'Cartão de crédito', type: TransactionType.EXPENSE, color: '#991b1b' },
  { name: 'Empréstimos / Financiamentos', type: TransactionType.EXPENSE, color: '#7f1d1d' },
  { name: 'Seguros', type: TransactionType.EXPENSE, color: '#1f2937' },
  { name: 'Outros (Despesa)', type: TransactionType.EXPENSE, color: '#9ca3af' },

  { name: 'Salário', type: TransactionType.INCOME, color: '#22c55e' },
  { name: '13º / Bonificação', type: TransactionType.INCOME, color: '#16a34a' },
  { name: 'Freelance', type: TransactionType.INCOME, color: '#10b981' },
  { name: 'Reembolso', type: TransactionType.INCOME, color: '#14b8a6' },
  { name: 'Rendimentos / Investimentos', type: TransactionType.INCOME, color: '#059669' },
  { name: 'Aluguel recebido', type: TransactionType.INCOME, color: '#15803d' },
  { name: 'Venda de itens', type: TransactionType.INCOME, color: '#65a30d' },
  { name: 'Pensão / Benefício', type: TransactionType.INCOME, color: '#0d9488' },
  { name: 'Presente recebido', type: TransactionType.INCOME, color: '#34d399' },
  { name: 'Outros (Receita)', type: TransactionType.INCOME, color: '#10b981' },
];

const familyMembers: Array<{ name: string; phone: string; role: Role }> = [
  { name: 'Emanuel', phone: '16994578922', role: Role.MEMBER },
  { name: 'Samuel', phone: '16996049177', role: Role.MEMBER },
  { name: 'Lucas', phone: '16996496677', role: Role.MEMBER },
  { name: 'Davi', phone: '16991136111', role: Role.MEMBER },
];

async function main() {
  const passwordHash = await bcrypt.hash('familia@2024', 10);
  const adminPasswordHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { phone: '01' },
    update: {
      name: 'Admin Família',
      passwordHash: adminPasswordHash,
      isActive: true,
      deletedAt: null,
    },
    create: {
      name: 'Admin Família',
      phone: '01',
      passwordHash: adminPasswordHash,
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

  for (const familyMember of familyMembers) {
    await prisma.user.upsert({
      where: { phone: familyMember.phone },
      update: {
        name: familyMember.name,
        role: familyMember.role,
        isActive: true,
        deletedAt: null,
      },
      create: {
        ...familyMember,
        passwordHash,
      },
    });
  }

  for (const cat of txCategories) {
    await prisma.transactionCategory.upsert({
      where: { name: cat.name },
      update: { type: cat.type, color: cat.color, deletedAt: null },
      create: cat,
    });
  }

  await prisma.shoppingList.upsert({
    where: { id: 'lista-principal' },
    update: {},
    create: { id: 'lista-principal', name: 'Lista Principal', isActive: true },
  });

  console.log('Seed concluído:', {
    admin: admin.name,
    member: member.name,
    familiares: familyMembers.length,
    categorias: txCategories.length,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
