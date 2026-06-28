import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ReceiptItemDto {
  productName: string;
  unitPrice: number;
  unit?: string;
  taxes?: number;
  discount?: number;
  quantity: number;
}

export interface CreateReceiptDto {
  qrCodeRaw?: string;
  url?: string;
  accessKey?: string;
  supplierName?: string;
  tradeName?: string;
  documentNumber?: string;
  purchaseDate: string;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  cardLast4?: string;
  createFinancialDebit?: boolean;
  items: ReceiptItemDto[];
}

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  findProducts() {
    return this.prisma.product.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  findReceipts() {
    return this.prisma.fiscalReceipt.findMany({
      include: { items: true, transaction: true },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  findHistory(productName?: string) {
    return this.prisma.purchaseHistoryItem.findMany({
      where: productName ? { productName: { contains: productName, mode: 'insensitive' } } : undefined,
      include: {
        product: true,
        receipt: true,
      },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  async createReceipt(dto: CreateReceiptDto, userId: string) {
    if (!dto.items?.length) {
      throw new BadRequestException('Informe ao menos um item comprado.');
    }

    const purchaseDate = new Date(dto.purchaseDate);
    const totalAmount = new Prisma.Decimal(dto.totalAmount);

    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.fiscalReceipt.create({
        data: {
          qrCodeRaw: dto.qrCodeRaw,
          url: dto.url,
          accessKey: dto.accessKey,
          supplierName: dto.supplierName,
          tradeName: dto.tradeName,
          documentNumber: dto.documentNumber,
          purchaseDate,
          totalAmount,
          paymentMethod: dto.paymentMethod,
          cardLast4: dto.paymentMethod === PaymentMethod.CREDIT_CARD ? dto.cardLast4 : undefined,
          status: 'IMPORTED',
        },
      });

      for (const item of dto.items) {
        const itemTotal = new Prisma.Decimal(item.unitPrice).mul(item.quantity).minus(item.discount ?? 0);
        const product = await tx.product.upsert({
          where: { name: item.productName },
          update: {
            lastUnitPrice: new Prisma.Decimal(item.unitPrice),
            unit: item.unit,
            taxes: item.taxes !== undefined ? new Prisma.Decimal(item.taxes) : undefined,
            lastPurchasedAt: purchaseDate,
            lastSupplierName: dto.tradeName ?? dto.supplierName,
            lastReceiptId: receipt.id,
          },
          create: {
            name: item.productName,
            lastUnitPrice: new Prisma.Decimal(item.unitPrice),
            unit: item.unit,
            taxes: item.taxes !== undefined ? new Prisma.Decimal(item.taxes) : undefined,
            lastPurchasedAt: purchaseDate,
            lastSupplierName: dto.tradeName ?? dto.supplierName,
            lastReceiptId: receipt.id,
          },
        });

        await tx.purchaseHistoryItem.create({
          data: {
            productName: item.productName,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            unit: item.unit,
            taxes: item.taxes !== undefined ? new Prisma.Decimal(item.taxes) : undefined,
            paymentMethod: dto.paymentMethod,
            accessKey: dto.accessKey,
            discount: item.discount !== undefined ? new Prisma.Decimal(item.discount) : undefined,
            quantity: item.quantity,
            purchaseDate,
            cardLast4: dto.paymentMethod === PaymentMethod.CREDIT_CARD ? dto.cardLast4 : undefined,
            totalAmount: itemTotal,
            productId: product.id,
            receiptId: receipt.id,
          },
        });
      }

      let transaction = null;
      if (dto.createFinancialDebit ?? true) {
        transaction = await tx.transaction.create({
          data: {
            description: `Compra - ${dto.tradeName ?? dto.supplierName ?? 'Cupom fiscal'}`,
            supplierName: dto.supplierName,
            tradeName: dto.tradeName,
            documentNumber: dto.documentNumber,
            paymentMethod: dto.paymentMethod,
            amount: totalAmount,
            type: TransactionType.EXPENSE,
            dueDate: purchaseDate,
            isPaid: true,
            paidAt: purchaseDate,
            userId,
            fiscalReceiptId: receipt.id,
          },
        });
      }

      return tx.fiscalReceipt.findUnique({
        where: { id: receipt.id },
        include: { items: true, transaction: true },
      }).then((createdReceipt) => ({ receipt: createdReceipt, transaction }));
    });
  }
}
