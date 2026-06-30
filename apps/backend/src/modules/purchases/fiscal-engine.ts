import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { spawn } from 'node:child_process';

export interface FiscalEngineInput {
  qrCodeRaw?: unknown;
  url?: unknown;
  fileName?: unknown;
  imageBase64?: unknown;
  pdfBase64?: unknown;
  text?: unknown;
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

function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join('\n');
  if (value === undefined || value === null) return '';
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.value === 'string') return record.value;
    if (typeof record.text === 'string') return record.text;
    return JSON.stringify(value);
  }
  return String(value);
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

function cleanSupplierName(raw: string): string {
  // Remove prefixos de ruído de OCR: dígitos isolados, siglas de 1-3 letras, pontuação solta
  return raw.replace(/^[\d\s]+/, '').replace(/^[a-z]{1,3}\s+/i, '').trim();
}

function extractSupplierName(text = '') {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const cnpjIndex = lines.findIndex((line) => /cnp[jy]\s*:/i.test(line));
  if (cnpjIndex >= 0) {
    const line = lines.slice(cnpjIndex + 1).find((line) => !/endere|av |rua |qtde|codigo/i.test(line));
    return line ? cleanSupplierName(line) : undefined;
  }
  return undefined;
}

function mapEngineOutput(document: OcrEngineDocument, input: FiscalEngineInput): FiscalEngineResult {
  const rawText = document.raw_text ?? '';
  const qrCodeRaw = toText(input.qrCodeRaw).trim() || undefined;
  const url = toText(input.url).trim() || undefined;
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
    qrCodeRaw,
    url,
    accessKey: extractAccessKey(`${qrCodeRaw ?? ''}\n${rawText}`),
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
  const text = [
    toText(input.text),
    toText(input.qrCodeRaw),
    toText(input.url),
  ].map((value) => value.trim()).filter(Boolean).join('\n');

  if (text) {
    const filePath = join(tempDir, `${randomUUID()}.txt`);
    await writeFile(filePath, text, 'utf8');
    return { tempDir, filePath, inputKind: 'text' as const };
  }

  const pdfBase64 = toText(input.pdfBase64).trim();
  const imageBase64 = toText(input.imageBase64).trim();
  const base64 = pdfBase64 || imageBase64;
  if (!base64) {
    await rm(tempDir, { recursive: true, force: true });
    throw new FiscalEngineNotConfiguredError();
  }

  const fallbackExt = pdfBase64 ? '.pdf' : '.png';
  const extension = extname(toText(input.fileName)) || fallbackExt;
  const filePath = join(tempDir, `${randomUUID()}${extension}`);
  await writeFile(filePath, Buffer.from(normalizeBase64(base64), 'base64'));
  return { tempDir, filePath, inputKind: 'auto' as const };
}

function getOutputsDir(engineRoot: string) {
  return process.env.FISCAL_ENGINE_OUTPUTS_DIR || join(engineRoot, 'data', 'outputs');
}

function sanitizeOutputName(input: FiscalEngineInput) {
  const fileName = toText(input.fileName);
  const sourceName = fileName ? basename(fileName, extname(fileName)) : '';
  return (sourceName || `cupom-${new Date().toISOString().replace(/[:.]/g, '-')}`)
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function runFiscalEngine(input: FiscalEngineInput): Promise<FiscalEngineResult> {
  const engineRoot = getEngineRoot();
  const python = getPythonExecutable(engineRoot);
  const outputsDir = getOutputsDir(engineRoot);
  const created = await createInputFile(input);

  try {
    await mkdir(outputsDir, { recursive: true });
    const outputPath = join(outputsDir, `${sanitizeOutputName(input)}-${randomUUID()}.json`);
    const args = ['-m', 'nf_ocr_engine.cli', created.filePath];
    if (created.inputKind === 'text') args.push('--input-kind', 'text');
    args.push('--output', outputPath, '--pretty');

    await runProcess(python, args, engineRoot);
    const output = await readFile(outputPath, 'utf8');
    const document = JSON.parse(output) as OcrEngineDocument;
    return mapEngineOutput(document, input);
  } finally {
    await rm(created.tempDir, { recursive: true, force: true });
  }
}
