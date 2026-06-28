import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { spawn } from 'node:child_process';

export interface FiscalEngineInput {
  qrCodeRaw?: string;
  url?: string;
  fileName?: string;
  imageBase64?: string;
  pdfBase64?: string;
  text?: string;
}

export interface FiscalEngineItem {
  productName: string;
  unitPrice: number;
  unit?: string;
  taxes?: number;
  discount?: number;
  quantity: number;
}

export interface FiscalEngineResult {
  qrCodeRaw?: string;
  url?: string;
  accessKey?: string;
  supplierName?: string;
  tradeName?: string;
  documentNumber?: string;
  purchaseDate?: string;
  totalAmount?: number;
  paymentMethod?: 'PIX' | 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD';
  items: FiscalEngineItem[];
  warnings?: string[];
}

export class FiscalEngineNotConfiguredError extends Error {
  constructor() {
    super('Fiscal engine is not configured.');
    this.name = 'FiscalEngineNotConfiguredError';
  }
}

interface OcrEngineDocument {
  issuer_cnpj?: string;
  invoice_number?: string;
  issue_date?: string;
  items?: Array<{
    description?: string;
    quantity?: string;
    unit?: string;
    unit_price?: string;
    total?: string;
  }>;
  totals?: {
    subtotal?: string;
    discount?: string;
    total?: string;
  };
  raw_text?: string;
  warnings?: string[];
}

const DEFAULT_ENGINE_ROOT = 'C:\\Users\\Windows\\Familia Maestre - Fiscal';

function getEngineRoot() {
  return process.env.FISCAL_ENGINE_ROOT || DEFAULT_ENGINE_ROOT;
}

function getPythonExecutable(engineRoot: string) {
  return process.env.FISCAL_ENGINE_PYTHON || join(engineRoot, '.venv', 'Scripts', 'python.exe');
}

function normalizeBase64(value: string) {
  return value.includes(',') ? value.split(',').pop() ?? '' : value;
}

function toNumber(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toIsoDate(value?: string) {
  if (!value) return undefined;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return value;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function extractAccessKey(text = '') {
  return text.replace(/\s/g, '').match(/\d{44}/)?.[0] ?? undefined;
}

function detectPaymentMethod(text = ''): FiscalEngineResult['paymentMethod'] {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (normalized.includes('credito')) return 'CREDIT_CARD';
  if (normalized.includes('debito')) return 'DEBIT_CARD';
  if (normalized.includes('dinheiro')) return 'CASH';
  return 'PIX';
}

function extractSupplierName(text = '') {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const cnpjIndex = lines.findIndex((line) => /cnp[jy]\s*:/i.test(line));
  if (cnpjIndex >= 0) {
    return lines.slice(cnpjIndex + 1).find((line) => !/endere|av |rua |qtde|codigo/i.test(line));
  }
  return undefined;
}

function mapEngineOutput(document: OcrEngineDocument, input: FiscalEngineInput): FiscalEngineResult {
  const rawText = document.raw_text ?? '';
  const items = (document.items ?? [])
    .map((item) => ({
      productName: item.description?.trim() ?? '',
      unitPrice: toNumber(item.unit_price) ?? 0,
      unit: item.unit ?? 'un',
      taxes: undefined,
      discount: undefined,
      quantity: toNumber(item.quantity) ?? 1,
    }))
    .filter((item) => item.productName && item.unitPrice > 0);

  return {
    qrCodeRaw: input.qrCodeRaw,
    url: input.url,
    accessKey: extractAccessKey(`${input.qrCodeRaw ?? ''}\n${rawText}`),
    supplierName: extractSupplierName(rawText),
    tradeName: extractSupplierName(rawText),
    documentNumber: document.issuer_cnpj,
    purchaseDate: toIsoDate(document.issue_date) ?? new Date().toISOString().slice(0, 10),
    totalAmount: toNumber(document.totals?.total) ?? toNumber(document.totals?.subtotal) ?? 0,
    paymentMethod: detectPaymentMethod(rawText),
    items,
    warnings: document.warnings ?? [],
  };
}

function runProcess(command: string, args: string[], cwd: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `Fiscal engine exited with code ${code}`));
    });
  });
}

async function createInputFile(input: FiscalEngineInput) {
  const tempDir = await mkdtemp(join(tmpdir(), 'familia-fiscal-'));

  if (input.text?.trim()) {
    const filePath = join(tempDir, `${randomUUID()}.txt`);
    await writeFile(filePath, input.text, 'utf8');
    return { tempDir, filePath, inputKind: 'text' as const };
  }

  const base64 = input.pdfBase64 || input.imageBase64;
  if (!base64) {
    await rm(tempDir, { recursive: true, force: true });
    throw new FiscalEngineNotConfiguredError();
  }

  const fallbackExt = input.pdfBase64 ? '.pdf' : '.png';
  const extension = extname(input.fileName ?? '') || fallbackExt;
  const filePath = join(tempDir, `${randomUUID()}${extension}`);
  await writeFile(filePath, Buffer.from(normalizeBase64(base64), 'base64'));
  return { tempDir, filePath, inputKind: 'auto' as const };
}

export async function runFiscalEngine(input: FiscalEngineInput): Promise<FiscalEngineResult> {
  const engineRoot = getEngineRoot();
  const python = getPythonExecutable(engineRoot);
  const created = await createInputFile(input);

  try {
    const args = ['-m', 'nf_ocr_engine.cli', created.filePath];
    if (created.inputKind === 'text') args.push('--input-kind', 'text');
    const output = await runProcess(python, args, engineRoot);
    const document = JSON.parse(output) as OcrEngineDocument;
    return mapEngineOutput(document, input);
  } finally {
    await rm(created.tempDir, { recursive: true, force: true });
  }
}
