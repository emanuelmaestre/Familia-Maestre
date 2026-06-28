import {
  getCategoriesByIds,
  getUsersByIds,
  methodNotAllowed,
  monthRange,
  requireUser,
  supabase,
  withCors,
} from './_lib/fast-api';
import { FiscalEngineNotConfiguredError, runFiscalEngine } from './_lib/fiscal-engine';

async function users(res: any) {
  const { data, error } = await supabase
    .from('users')
    .select('id,name,phone,role,avatarUrl,isActive,createdAt,updatedAt')
    .is('deletedAt', null)
    .order('name', { ascending: true });

  if (error) throw error;
  res.status(200).json(data ?? []);
}

async function notifications(user: any, res: any) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('userId', user.id)
    .order('createdAt', { ascending: false })
    .limit(30);

  if (error) throw error;
  res.status(200).json(data ?? []);
}

async function shopping(req: any, res: any) {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const listResult = await supabase
    .from('shopping_lists')
    .select('id')
    .eq('isActive', true)
    .is('deletedAt', null)
    .limit(1)
    .maybeSingle();

  if (listResult.error) throw listResult.error;
  if (!listResult.data?.id) return res.status(200).json([]);

  let query = supabase
    .from('shopping_items')
    .select('*')
    .eq('listId', listResult.data.id)
    .is('deletedAt', null)
    .order('createdAt', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;

  const userMap = await getUsersByIds((data ?? []).flatMap((item) => [item.requestedById, item.purchasedById]));
  res.status(200).json((data ?? []).map((item) => ({
    ...item,
    requestedBy: userMap.get(item.requestedById) ?? null,
    purchasedBy: item.purchasedById ? userMap.get(item.purchasedById) ?? null : null,
  })));
}

async function financeCategories(res: any) {
  const { data, error } = await supabase
    .from('transaction_categories')
    .select('*')
    .is('deletedAt', null)
    .order('name', { ascending: true });

  if (error) throw error;
  res.status(200).json(data ?? []);
}

async function financeTransactions(req: any, user: any, res: any) {
  const { start, end } = monthRange(req.query.month, req.query.year);
  let query = supabase
    .from('transactions')
    .select('*')
    .is('deletedAt', null)
    .gte('createdAt', start)
    .lte('createdAt', end)
    .order('createdAt', { ascending: false });

  if (user.role !== 'ADMIN') query = query.eq('userId', user.id);
  if (typeof req.query.type === 'string') query = query.eq('type', req.query.type);
  if (typeof req.query.isPaid === 'string') query = query.eq('isPaid', req.query.isPaid === 'true');

  const { data, error } = await query;
  if (error) throw error;

  const [categories, users] = await Promise.all([
    getCategoriesByIds((data ?? []).map((tx) => tx.categoryId)),
    getUsersByIds((data ?? []).map((tx) => tx.userId)),
  ]);

  res.status(200).json((data ?? []).map((tx) => ({
    ...tx,
    category: tx.categoryId ? categories.get(tx.categoryId) ?? null : null,
    user: users.get(tx.userId) ?? null,
  })));
}

async function financeSummary(req: any, user: any, res: any) {
  const { start, end } = monthRange(req.query.month, req.query.year);
  let query = supabase
    .from('transactions')
    .select('amount,type,categoryId')
    .is('deletedAt', null)
    .gte('createdAt', start)
    .lte('createdAt', end);

  if (user.role !== 'ADMIN') query = query.eq('userId', user.id);

  const { data, error } = await query;
  if (error) throw error;

  const categories = await getCategoriesByIds((data ?? []).map((tx) => tx.categoryId));
  const income = (data ?? []).filter((tx) => tx.type === 'INCOME').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const expense = (data ?? []).filter((tx) => tx.type === 'EXPENSE').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const byCategory = (data ?? []).reduce<Record<string, number>>((acc, tx) => {
    const categoryName = tx.categoryId ? categories.get(tx.categoryId)?.name ?? 'Sem categoria' : 'Sem categoria';
    acc[categoryName] = (acc[categoryName] ?? 0) + Number(tx.amount);
    return acc;
  }, {});

  res.status(200).json({ income, expense, balance: income - expense, byCategory, count: data?.length ?? 0 });
}

async function events(res: any) {
  const { data: eventsData, error } = await supabase
    .from('events')
    .select('*')
    .is('deletedAt', null)
    .order('startsAt', { ascending: true });

  if (error) throw error;
  const eventIds = (eventsData ?? []).map((event) => event.id);
  if (!eventIds.length) return res.status(200).json([]);

  const { data: attendees, error: attendeesError } = await supabase
    .from('event_attendees')
    .select('*')
    .in('eventId', eventIds);

  if (attendeesError) throw attendeesError;
  const userMap = await getUsersByIds((attendees ?? []).map((attendee) => attendee.userId));

  res.status(200).json((eventsData ?? []).map((event) => ({
    ...event,
    attendees: (attendees ?? [])
      .filter((attendee) => attendee.eventId === event.id)
      .map((attendee) => ({ ...attendee, user: userMap.get(attendee.userId) ?? null })),
  })));
}

async function reports(res: any) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(30);

  if (error) throw error;
  res.status(200).json(data ?? []);
}

async function readJsonBody(req: any) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function importQr(req: any, res: any) {
  const body = await readJsonBody(req);
  const qrCodeRaw = String(body.qrCodeRaw ?? body.url ?? '').trim();
  const hasFiscalInput = qrCodeRaw || body.imageBase64 || body.pdfBase64 || body.text;
  if (!hasFiscalInput) return res.status(400).json({ message: 'Informe QR Code, imagem, PDF ou texto da nota fiscal.' });

  try {
    const result = await runFiscalEngine({
      qrCodeRaw: qrCodeRaw || undefined,
      url: qrCodeRaw.startsWith('http') ? qrCodeRaw : undefined,
      fileName: body.fileName,
      imageBase64: body.imageBase64,
      pdfBase64: body.pdfBase64,
      text: body.text,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof FiscalEngineNotConfiguredError) {
      return res.status(501).json({
        code: 'FISCAL_ENGINE_NOT_CONFIGURED',
        message: 'A engine fiscal foi removida deste fluxo. Conecte uma nova engine para importar e analisar cupons.',
        engine: {
          adapter: 'api/_lib/fiscal-engine.ts',
          expectedInput: ['qrCodeRaw', 'url', 'imageBase64', 'pdfBase64', 'text'],
          expectedOutput: ['supplierName', 'tradeName', 'documentNumber', 'purchaseDate', 'totalAmount', 'paymentMethod', 'items'],
        },
      });
    }

    throw error;
  }
}

async function purchases(path: string, req: any, res: any) {
  if (path === '/purchases/import-qr') {
    if (req.method !== 'POST') return methodNotAllowed(res);
    return importQr(req, res);
  }

  if (path === '/purchases/products') {
    const { data, error } = await supabase.from('products').select('*').order('updatedAt', { ascending: false });
    if (error) throw error;
    return res.status(200).json(data ?? []);
  }

  if (path === '/purchases/history') {
    let query = supabase.from('purchase_history_items').select('*').order('purchaseDate', { ascending: false }).limit(100);
    if (typeof req.query.productName === 'string' && req.query.productName.trim()) {
      query = query.ilike('productName', `%${req.query.productName.trim()}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json(data ?? []);
  }

  const { data: receipts, error } = await supabase
    .from('fiscal_receipts')
    .select('*')
    .order('purchaseDate', { ascending: false });

  if (error) throw error;
  const receiptIds = (receipts ?? []).map((receipt) => receipt.id);
  if (!receiptIds.length) return res.status(200).json([]);

  const [{ data: items, error: itemsError }, { data: transactions, error: txError }] = await Promise.all([
    supabase.from('purchase_history_items').select('*').in('receiptId', receiptIds),
    supabase.from('transactions').select('*').in('fiscalReceiptId', receiptIds),
  ]);

  if (itemsError) throw itemsError;
  if (txError) throw txError;

  res.status(200).json((receipts ?? []).map((receipt) => ({
    ...receipt,
    items: (items ?? []).filter((item) => item.receiptId === receipt.id),
    transaction: (transactions ?? []).find((tx) => tx.fiscalReceiptId === receipt.id) ?? null,
  })));
}

async function correios(path: string, req: any, res: any) {
  if (path === '/integrations/correios/status') {
    return res.status(200).json({
      enabled: true,
      provider: 'Correios',
      mode: 'CEP via ViaCEP',
      configured: Boolean(process.env.CORREIOS_USERNAME || process.env.CORREIOS_TOKEN),
    });
  }

  const cep = String(req.query.cep ?? '').replace(/\D/g, '');
  if (cep.length !== 8) return res.status(400).json({ message: 'CEP inválido' });

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: 'force-cache' });
  const data = await response.json();
  return res.status(data?.erro ? 404 : 200).json(data);
}

export default async function handler(req: any, res: any) {
  if (withCors(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') return methodNotAllowed(res);

  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const path = req.url.split('?')[0];
    if (req.method === 'POST' && path === '/purchases/import-qr') return purchases(path, req, res);
    if (req.method !== 'GET') return methodNotAllowed(res);
    if (path === '/users') return users(res);
    if (path === '/notifications') return notifications(user, res);
    if (path === '/shopping') return shopping(req, res);
    if (path === '/finance/categories') return financeCategories(res);
    if (path === '/finance/transactions') return financeTransactions(req, user, res);
    if (path === '/finance/summary') return financeSummary(req, user, res);
    if (path === '/events') return events(res);
    if (path === '/reports') return reports(res);
    if (path.startsWith('/purchases/')) return purchases(path, req, res);
    if (path.startsWith('/integrations/correios/')) return correios(path, req, res);

    return res.status(404).json({ message: 'Rota rápida não encontrada' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erro interno' });
  }
}
