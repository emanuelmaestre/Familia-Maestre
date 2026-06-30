'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import jsQR from 'jsqr';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
// icons via Material Symbols (globals.css)

type Tab = 'lista' | 'produtos' | 'cupons' | 'historico';
type PaymentMethod = 'PIX' | 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD';

interface Product {
  id: string;
  name: string;
  normalizedName?: string;
  brand?: string;
  category?: string;
  variant?: string;
  lastUnitPrice?: string;
  unit?: string;
  taxes?: string;
  lastPurchasedAt?: string;
  lastSupplierName?: string;
}

interface ReceiptItem {
  id: string;
  productName: string;
  unitPrice: string;
  unit?: string;
  taxes?: string;
  paymentMethod?: PaymentMethod;
  accessKey?: string;
  discount?: string;
  quantity: number;
  purchaseDate: string;
  cardLast4?: string;
  totalAmount: string;
}

interface FiscalReceipt {
  id: string;
  accessKey?: string;
  supplierName?: string;
  tradeName?: string;
  documentNumber?: string;
  purchaseDate: string;
  totalAmount: string;
  paymentMethod?: PaymentMethod;
  cardLast4?: string;
  status: string;
  items: ReceiptItem[];
}

interface ImportedReceipt {
  qrCodeRaw?: string;
  url?: string;
  accessKey?: string;
  supplierName?: string;
  tradeName?: string;
  documentNumber?: string;
  purchaseDate?: string;
  totalAmount?: number;
  paymentMethod?: PaymentMethod;
  items?: Array<{
    productName: string;
    unitPrice: number;
    unit?: string;
    taxes?: number;
    discount?: number;
    quantity: number;
  }>;
  warnings?: string[];
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CASH: 'Dinheiro',
  DEBIT_CARD: 'Cartão de Débito',
  CREDIT_CARD: 'Cartão de Crédito',
};

const tabs: Array<{ key: Tab; label: string; icon: string }> = [
  { key: 'lista',     label: 'Lista de Compras', icon: 'list_alt' },
  { key: 'produtos',  label: 'Produtos',          icon: 'inventory_2' },
  { key: 'cupons',    label: 'Cupons Fiscais',    icon: 'receipt_long' },
  { key: 'historico', label: 'Histórico',         icon: 'history' },
];

function extractAccessKey(rawValue: string) {
  try {
    const url = new URL(rawValue);
    const possibleValues = [
      url.searchParams.get('chNFe'),
      url.searchParams.get('chave'),
      url.searchParams.get('ch'),
      url.searchParams.get('p')?.split('|')[0],
    ].filter(Boolean);

    for (const value of possibleValues) {
      const key = value?.replace(/\D/g, '');
      if (key?.length === 44) return key;
    }
  } catch {
    // QR Codes de NFC-e podem vir como texto puro ou parametros nao padronizados.
  }

  return rawValue.match(/\d{44}/)?.[0] ?? '';
}

export default function ComprasPage() {
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fiscalFileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('lista');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scannerStatus, setScannerStatus] = useState('');
  const [scannedQr, setScannedQr] = useState('');
  const [receiptForm, setReceiptForm] = useState({
    qrCodeRaw: '',
    url: '',
    accessKey: '',
    supplierName: '',
    tradeName: '',
    documentNumber: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    totalAmount: '',
    paymentMethod: 'PIX',
    cardLast4: '',
    createFinancialDebit: true,
  });
  const [itemForm, setItemForm] = useState({
    productName: '',
    unitPrice: '',
    unit: 'un',
    taxes: '',
    discount: '',
    quantity: '1',
  });
  const [items, setItems] = useState<typeof itemForm[]>([]);

  const { data: pendingItems = [] } = useQuery<any[]>({
    queryKey: ['shopping-pending'],
    queryFn: () => api.get('/shopping?status=PENDING').then((r) => r.data),
    enabled: activeTab === 'lista' || activeTab === 'cupons',
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['purchase-products'],
    queryFn: () => api.get('/purchases/products').then((r) => r.data),
    enabled: activeTab === 'produtos',
  });

  const { data: receipts = [] } = useQuery<FiscalReceipt[]>({
    queryKey: ['fiscal-receipts'],
    queryFn: () => api.get('/purchases/receipts').then((r) => r.data),
    enabled: activeTab === 'cupons',
  });

  const { data: history = [] } = useQuery<ReceiptItem[]>({
    queryKey: ['purchase-history'],
    queryFn: () => api.get('/purchases/history').then((r) => r.data),
    enabled: activeTab === 'historico',
  });

  const receiptTotal = useMemo(() => {
    return items.reduce((total, item) => {
      const gross = Number(item.unitPrice || 0) * Number(item.quantity || 0);
      return total + gross - Number(item.discount || 0);
    }, 0);
  }, [items]);

  const createReceipt = useMutation({
    mutationFn: () => api.post('/purchases/receipts', {
      ...receiptForm,
      totalAmount: Number(receiptForm.totalAmount || receiptTotal),
      cardLast4: receiptForm.paymentMethod === 'CREDIT_CARD' ? receiptForm.cardLast4 : undefined,
      paymentMethod: receiptForm.paymentMethod,
      items: items.map((item) => ({
        productName: item.productName,
        unitPrice: Number(item.unitPrice),
        unit: item.unit,
        taxes: item.taxes ? Number(item.taxes) : undefined,
        discount: item.discount ? Number(item.discount) : undefined,
        quantity: Number(item.quantity),
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-products'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-history'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      setItems([]);
      setItemForm({ productName: '', unitPrice: '', unit: 'un', taxes: '', discount: '', quantity: '1' });
      setReceiptForm({
        qrCodeRaw: '',
        url: '',
        accessKey: '',
        supplierName: '',
        tradeName: '',
        documentNumber: '',
        purchaseDate: new Date().toISOString().slice(0, 10),
        totalAmount: '',
        paymentMethod: 'PIX',
        cardLast4: '',
        createFinancialDebit: true,
      });
    },
  });

  const applyImportedReceipt = (data: ImportedReceipt) => {
    setReceiptForm((current) => ({
      ...current,
      qrCodeRaw: data.qrCodeRaw ?? current.qrCodeRaw,
      url: data.url ?? current.url,
      accessKey: data.accessKey || current.accessKey,
      supplierName: data.supplierName || current.supplierName,
      tradeName: data.tradeName || current.tradeName,
      documentNumber: data.documentNumber || current.documentNumber,
      purchaseDate: data.purchaseDate || current.purchaseDate,
      totalAmount: data.totalAmount ? String(data.totalAmount) : current.totalAmount,
      paymentMethod: data.paymentMethod ?? current.paymentMethod,
    }));

    if (data.items?.length) {
      setItems(data.items.map((item) => ({
        productName: item.productName,
        unitPrice: String(item.unitPrice),
        unit: item.unit || 'un',
        taxes: item.taxes !== undefined ? String(item.taxes) : '',
        discount: item.discount !== undefined ? String(item.discount) : '',
        quantity: String(item.quantity || 1),
      })));
    }

    setScannerStatus(data.items?.length ? `${data.items.length} produto(s) importado(s) pela engine fiscal.` : '');
    if (data.warnings?.length) setScannerError(data.warnings[0]);
  };

  const importFiscalDocument = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<ImportedReceipt>('/purchases/import-qr', payload, { timeout: 90000 }).then((r) => r.data),
    onMutate: () => {
      setScannerError('');
      setScannerStatus('Enviando cupom para a engine fiscal...');
    },
    onSuccess: applyImportedReceipt,
    onError: () => {
      setScannerStatus('');
      setScannerError('A engine fiscal nao conseguiu processar este cupom. Tente outra foto/PDF ou preencha manualmente.');
    },
  });

  const addItem = () => {
    if (!itemForm.productName || !itemForm.unitPrice) return;
    setItems((current) => [...current, itemForm]);
    setItemForm({ productName: '', unitPrice: '', unit: 'un', taxes: '', discount: '', quantity: '1' });
  };

  const applyQrCode = (rawValue: string) => {
    const accessKey = extractAccessKey(rawValue);
    const url = rawValue.startsWith('http') ? rawValue : '';

    setScannedQr(rawValue);
    setReceiptForm((current) => ({
      ...current,
      qrCodeRaw: rawValue,
      url,
      accessKey: accessKey || current.accessKey,
    }));
  };

  const captureQrCode = (rawValue: string) => {
    applyQrCode(rawValue);
    importFiscalDocument.mutate({ qrCodeRaw: rawValue });
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const readQrFromImage = async (file: File) => {
    setScannerError('');
    setScannerStatus('Lendo cupom pela engine fiscal...');

    try {
      const dataUrl = await fileToDataUrl(file);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      importFiscalDocument.mutate({
        fileName: file.name,
        ...(isPdf ? { pdfBase64: dataUrl } : { imageBase64: dataUrl }),
      });
      setScannerOpen(false);

      if (isPdf) return;

      const imageUrl = URL.createObjectURL(file);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('image-load-error'));
        image.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (!context || !canvas.width || !canvas.height) {
        throw new Error('canvas-error');
      }

      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(imageUrl);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const rawValue = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' })?.data ?? '';

      if (!rawValue) {
        return;
      }

      applyQrCode(rawValue);
    } catch {
      setScannerStatus('');
      setScannerError('Nao foi possivel ler esta imagem. Tente tirar uma foto mais proxima e com boa luz.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!scannerOpen) return;

    let stream: MediaStream | null = null;
    let cancelled = false;
    let frame = 0;

    const waitForVideo = (video: HTMLVideoElement) =>
      new Promise<void>((resolve, reject) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0) {
          resolve();
          return;
        }

        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error('camera-timeout'));
        }, 8000);

        const cleanup = () => {
          window.clearTimeout(timeout);
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('canplay', onLoaded);
          video.removeEventListener('error', onError);
        };

        const onLoaded = () => {
          cleanup();
          resolve();
        };

        const onError = () => {
          cleanup();
          reject(new Error('camera-video-error'));
        };

        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('canplay', onLoaded);
        video.addEventListener('error', onError);
      });

    const requestCamera = async () => {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        return navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
    };

    const startScanner = async () => {
      setScannerError('');
      setScannerStatus('Solicitando acesso a camera...');

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerStatus('');
        setScannerError('Este navegador nao permite abrir a camera.');
        return;
      }

      try {
        stream = await requestCamera();

        if (!videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          setScannerStatus('');
          setScannerError('A camera foi liberada, mas a tela do leitor ainda nao ficou pronta. Feche e abra novamente.');
          return;
        }
        const video = videoRef.current;

        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('playsinline', 'true');
        video.srcObject = stream;

        setScannerStatus('Abrindo camera...');
        await video.play().catch(() => undefined);
        await waitForVideo(video);

        try {
          await video.play();
        } catch {
          if (video.paused) throw new Error('camera-play-blocked');
        }

        setScannerStatus('Camera aberta. Procurando QR Code...');

        const BarcodeDetectorCtor = (window as any).BarcodeDetector;
        const detector = BarcodeDetectorCtor ? new BarcodeDetectorCtor({ formats: ['qr_code'] }) : null;

        const scan = async () => {
          if (cancelled || !videoRef.current) return;

          try {
            let rawValue = '';

            if (detector) {
              const codes = await detector.detect(videoRef.current);
              rawValue = codes?.[0]?.rawValue ?? '';
            } else if (canvasRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const video = videoRef.current;
              const canvas = canvasRef.current;
              const width = video.videoWidth;
              const height = video.videoHeight;

              if (width > 0 && height > 0) {
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d', { willReadFrequently: true });

                if (context) {
                  context.drawImage(video, 0, 0, width, height);
                  const image = context.getImageData(0, 0, width, height);
                  rawValue = jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? '';
                }
              }
            }

            if (rawValue) {
              captureQrCode(rawValue);
              setScannerOpen(false);
              return;
            }
          } catch {
            setScannerError('Nao foi possivel ler o QR Code. Tente aproximar ou melhorar a iluminacao.');
          }

          frame = requestAnimationFrame(scan);
        };

        frame = requestAnimationFrame(scan);
      } catch {
        setScannerStatus('');
        setScannerError('A permissao foi solicitada, mas a camera nao iniciou. Feche esta tela e tente abrir a camera novamente. No iPhone, confira se Safari/Chrome tem permissao de camera nos ajustes.');
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setScannerStatus('');
    };
  }, [scannerOpen]);

  return (
    <div className="app-page space-y-5">
      <section className="glass-card p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-badge mb-3">
              <span className="material-symbols-outlined text-[12px]">shopping_bag</span>
              Módulo de compras
            </p>
            <h2 className="text-[24px] font-bold text-[#041a3f]" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Compras, produtos e cupons fiscais
            </h2>
            <p className="mt-2 max-w-3xl text-[13.5px] text-[#4c5e86] leading-relaxed">
              Importe cupons fiscais, gerencie produtos e visualize o histórico de compras da família.
            </p>
          </div>
          <button type="button" onClick={() => setActiveTab('cupons')} className="btn-primary w-full lg:w-auto justify-center">
            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
            Importar cupom
          </button>
        </div>
      </section>

      <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-1">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all whitespace-nowrap flex-shrink-0 min-h-[44px] ${
              activeTab === key
                ? 'bg-[#0057D9] text-white shadow-[0_4px_14px_rgba(0,87,217,0.3)]'
                : 'glass-card text-[#4c5e86] hover:text-[#041a3f]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'lista' && (
        <section className="glass-card p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[16px] font-bold text-[#041a3f]">Lista de Compras</h3>
              <p className="mt-1 text-[13px] text-[#4c5e86]">
                Você tem {pendingItems.length} item(ns) pendente(s).
              </p>
            </div>
            <Link href="/lista" className="btn-primary no-underline">
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              Abrir lista
            </Link>
          </div>
        </section>
      )}

      {activeTab === 'produtos' && (
        <section className="glass-card">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead style={{ borderBottom: '1px solid rgba(195,198,215,0.4)' }}>
              <tr>
                {['Produto','Marca','Categoria','Valor unitário','Unidade','Impostos','Última compra','Fornecedor'].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#4c5e86]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-white/50 transition-colors" style={{ borderBottom: '1px solid rgba(195,198,215,0.25)' }}>
                  <td className="px-4 py-3.5 font-semibold text-[#191c1e]">
                    {product.normalizedName ?? product.name}
                    {product.variant && <span className="ml-1 text-[11px] text-[#737686]">{product.variant}</span>}
                  </td>
                  <td className="px-4 py-3.5 text-[#4c5e86]">{product.brand ?? '-'}</td>
                  <td className="px-4 py-3.5 text-[#4c5e86]">{product.category ?? '-'}</td>
                  <td className="px-4 py-3.5 text-[#4c5e86]">{product.lastUnitPrice ? formatCurrency(Number(product.lastUnitPrice)) : '-'}</td>
                  <td className="px-4 py-3.5 text-[#4c5e86]">{product.unit ?? '-'}</td>
                  <td className="px-4 py-3.5 text-[#4c5e86]">{product.taxes ? formatCurrency(Number(product.taxes)) : '-'}</td>
                  <td className="px-4 py-3.5 text-[#4c5e86]">{product.lastPurchasedAt ? formatDate(product.lastPurchasedAt) : '-'}</td>
                  <td className="px-4 py-3.5 text-[#4c5e86]">{product.lastSupplierName ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {products.length === 0 && (
            <p className="py-10 text-center text-[13px] font-medium text-[#737686]">Nenhum produto importado ainda.</p>
          )}
        </section>
      )}

      {activeTab === 'cupons' && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="surface p-5">
            <h3 className="font-semibold text-gray-950">Escanear ou importar cupom fiscal</h3>
            <p className="mt-1 text-sm text-gray-500">
              Use a câmera para capturar o QR Code da NFC-e. A análise automática foi removida e será substituída por uma nova engine fiscal.
            </p>

            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-medium text-gray-950">Leitor de QR Code</h4>
                  <p className="mt-1 text-sm text-gray-600">
                    Captura o código no navegador. A importação dos produtos ficará a cargo da nova engine fiscal.
                  </p>
                </div>
                <button type="button" onClick={() => setScannerOpen(true)} className="btn-primary">
                  <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                  Abrir câmera
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <textarea
                  placeholder="QR Code / URL da NFC-e"
                  value={receiptForm.qrCodeRaw}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    setReceiptForm({
                      ...receiptForm,
                      qrCodeRaw: rawValue,
                      url: rawValue.startsWith('http') ? rawValue : receiptForm.url,
                      accessKey: extractAccessKey(rawValue) || receiptForm.accessKey,
                    });
                  }}
                  rows={2}
                  className="input-control"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fiscalFileInputRef.current?.click()}
                    disabled={importFiscalDocument.isPending}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {importFiscalDocument.isPending ? 'Processando cupom...' : 'Enviar imagem/PDF do cupom'}
                  </button>
                  <input
                    ref={fiscalFileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void readQrFromImage(file);
                      event.currentTarget.value = '';
                    }}
                  />
                </div>
                {scannerStatus && !scannerOpen && (
                  <p className="rounded-lg bg-white px-3 py-2 text-xs text-blue-700">
                    {scannerStatus}
                  </p>
                )}
                {scannedQr && (
                  <p className="rounded-lg bg-white px-3 py-2 text-xs text-gray-500">
                    QR Code lido e aplicado ao formulário.
                  </p>
                )}
              </div>
            </div>

            {scannerOpen && (
              <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
                <header className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-300">Cupons Fiscais</p>
                    <h3 className="text-lg font-semibold">Escanear QR Code</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScannerOpen(false)}
                    className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20"
                  >
                    Fechar
                  </button>
                </header>

                <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
                  <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                    <video ref={videoRef} className="aspect-video w-full bg-black object-cover" muted autoPlay playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-blue-400/80 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]" />
                  </div>
                  {scannerStatus && <p className="text-center text-xs font-medium text-blue-200">{scannerStatus}</p>}
                  <p className="max-w-xl text-center text-sm text-slate-300">
                    Aponte a câmera para o QR Code do cupom fiscal. A leitura fecha automaticamente quando encontrar o código.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                    >
                      Tirar foto do QR Code
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerOpen(false);
                        window.setTimeout(() => setScannerOpen(true), 150);
                      }}
                      className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20"
                    >
                      Reiniciar camera
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void readQrFromImage(file);
                    }}
                  />
                  {scannerError && (
                    <div className="max-w-xl rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-center text-sm text-red-100">
                      {scannerError}
                    </div>
                  )}
                </main>
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input placeholder="Chave de acesso" value={receiptForm.accessKey} onChange={(e) => setReceiptForm({ ...receiptForm, accessKey: e.target.value })} className="input-control sm:col-span-2" />
              <input placeholder="Fornecedor / Razão social" value={receiptForm.supplierName} onChange={(e) => setReceiptForm({ ...receiptForm, supplierName: e.target.value })} className="input-control" />
              <input placeholder="Nome fantasia" value={receiptForm.tradeName} onChange={(e) => setReceiptForm({ ...receiptForm, tradeName: e.target.value })} className="input-control" />
              <input placeholder="CPF/CNPJ" value={receiptForm.documentNumber} onChange={(e) => setReceiptForm({ ...receiptForm, documentNumber: e.target.value })} className="input-control" />
              <input type="date" value={receiptForm.purchaseDate} onChange={(e) => setReceiptForm({ ...receiptForm, purchaseDate: e.target.value })} className="input-control" />
              <select value={receiptForm.paymentMethod} onChange={(e) => setReceiptForm({ ...receiptForm, paymentMethod: e.target.value })} className="input-control">
                <option value="PIX">PIX</option>
                <option value="CASH">Dinheiro</option>
                <option value="DEBIT_CARD">Cartão de Débito</option>
                <option value="CREDIT_CARD">Cartão de Crédito</option>
              </select>
              {receiptForm.paymentMethod === 'CREDIT_CARD' && (
                <input maxLength={4} placeholder="4 últimos dígitos" value={receiptForm.cardLast4} onChange={(e) => setReceiptForm({ ...receiptForm, cardLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="input-control" />
              )}
              <input type="number" placeholder={`Total ${receiptTotal ? formatCurrency(receiptTotal) : ''}`} value={receiptForm.totalAmount} onChange={(e) => setReceiptForm({ ...receiptForm, totalAmount: e.target.value })} className="input-control" />
              <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
                <input type="checkbox" checked={receiptForm.createFinancialDebit} onChange={(e) => setReceiptForm({ ...receiptForm, createFinancialDebit: e.target.checked })} className="rounded" />
                Criar débito no financeiro
              </label>
            </div>

            <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h4 className="font-medium text-gray-900">Adicionar produto do cupom</h4>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input placeholder="Nome do produto" value={itemForm.productName} onChange={(e) => setItemForm({ ...itemForm, productName: e.target.value })} className="input-control sm:col-span-2" />
                <input type="number" placeholder="Valor unitário" value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })} className="input-control" />
                <input placeholder="Unidade" value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} className="input-control" />
                <input type="number" placeholder="Impostos" value={itemForm.taxes} onChange={(e) => setItemForm({ ...itemForm, taxes: e.target.value })} className="input-control" />
                <input type="number" placeholder="Desconto" value={itemForm.discount} onChange={(e) => setItemForm({ ...itemForm, discount: e.target.value })} className="input-control" />
                <input type="number" placeholder="Quantidade" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} className="input-control" />
              </div>
              <button type="button" onClick={addItem} className="mt-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100">
                <span className="material-symbols-outlined mr-1 inline text-[16px] align-middle">add</span>
                Adicionar item
              </button>
            </div>

            <button
              type="button"
              onClick={() => createReceipt.mutate()}
              disabled={items.length === 0 || createReceipt.isPending}
              className="btn-primary mt-5"
            >
              {createReceipt.isPending ? 'Importando...' : 'Salvar cupom e gerar débito'}
            </button>
          </div>

          <div className="surface p-5">
            <h3 className="font-semibold text-gray-950">Itens deste cupom</h3>
            <div className="mt-4 space-y-2">
              {items.map((item, index) => (
                <div key={`${item.productName}-${index}`} className="rounded-xl border border-gray-100 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-900">{item.productName}</span>
                    <span className="text-gray-600">{formatCurrency(Number(item.unitPrice || 0))} x {item.quantity} {item.unit}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Impostos: {item.taxes ? formatCurrency(Number(item.taxes)) : '-'} | Desconto: {item.discount ? formatCurrency(Number(item.discount)) : '-'}
                  </p>
                </div>
              ))}
              {items.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Nenhum item adicionado.</p>}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'historico' && (
        <section className="glass-card">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Produto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Valor unitário</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Unidade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Impostos</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Pagamento</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Chave de acesso</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Desconto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Quantidade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cartão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.productName}</td>
                  <td className="px-4 py-3 text-gray-500">{formatCurrency(Number(item.unitPrice))}</td>
                  <td className="px-4 py-3 text-gray-500">{item.unit ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{item.taxes ? formatCurrency(Number(item.taxes)) : '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{item.paymentMethod ? PAYMENT_METHOD_LABELS[item.paymentMethod] : '-'}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-gray-500" title={item.accessKey}>{item.accessKey ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{item.discount ? formatCurrency(Number(item.discount)) : '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{item.quantity}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(item.purchaseDate)}</td>
                  <td className="px-4 py-3 text-gray-500">{item.cardLast4 ? `**** ${item.cardLast4}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {history.length === 0 && <p className="py-8 text-center text-[13px] font-medium text-[#737686]">Nenhuma compra importada ainda.</p>}
        </section>
      )}

      {activeTab === 'cupons' && receipts.length > 0 && (
        <section className="glass-card">
          <h3 className="px-5 pt-5 font-semibold text-[#041a3f]">Cupons importados</h3>
          <div className="overflow-x-auto">
          <table className="mt-4 w-full min-w-[900px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Fornecedor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">CPF/CNPJ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Pagamento</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Itens</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{receipt.tradeName ?? receipt.supplierName ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{receipt.documentNumber ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(receipt.purchaseDate)}</td>
                  <td className="px-4 py-3 text-gray-500">{receipt.paymentMethod ? PAYMENT_METHOD_LABELS[receipt.paymentMethod] : '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{receipt.items.length}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(Number(receipt.totalAmount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      )}
    </div>
  );
}
