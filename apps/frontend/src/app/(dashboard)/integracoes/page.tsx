'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  MessageCircle,
  PackageCheck,
  Plug,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface CorreiosStatus {
  provider: string;
  cepLookup: string;
  pricingAndTracking: string;
  contract: string;
  postingCard: string;
  requiredEnv: string[];
}

interface CepAddress {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  ibge?: string;
  source: string;
}

const nextSteps = [
  'Criar painel de status real das credenciais Z-API e OpenAI.',
  'Adicionar teste de envio de WhatsApp pela interface.',
  'Exibir logs de IA com custo, tokens, latencia e falhas.',
  'Permitir configurar comandos ativos do WhatsApp.',
  'Adicionar fila de reenvio para mensagens com erro.',
];

export default function IntegracoesPage() {
  const [cep, setCep] = useState('');
  const [cepError, setCepError] = useState('');
  const [address, setAddress] = useState<CepAddress | null>(null);

  const { data: correiosStatus } = useQuery<CorreiosStatus>({
    queryKey: ['correios-status'],
    queryFn: () => api.get('/integrations/correios/status').then((r) => r.data),
  });

  const integrations = [
    {
      title: 'WhatsApp',
      description: 'Recebe mensagens, comandos e pode criar itens de compra com apoio da IA.',
      status: 'Base pronta',
      icon: MessageCircle,
      color: 'bg-green-50 text-green-700',
      items: ['Webhook /whatsapp/webhook', 'Comandos /lista e /ajuda', 'Envio via Z-API quando configurado'],
    },
    {
      title: 'Correios',
      description: 'Consulta CEP e prepara a base para preco, prazo e rastreamento com credenciais.',
      status: correiosStatus?.cepLookup === 'enabled' ? 'CEP ativo' : 'Pendente',
      icon: PackageCheck,
      color: 'bg-yellow-50 text-yellow-700',
      items: [
        'Consulta de endereco por CEP',
        correiosStatus?.pricingAndTracking === 'credentials_configured'
          ? 'Credenciais de preco/rastreamento configuradas'
          : 'Preco e rastreamento aguardando credenciais',
        correiosStatus?.contract === 'configured' ? 'Contrato configurado' : 'Contrato nao configurado',
      ],
    },
    {
      title: 'Inteligencia Artificial',
      description: 'Extrai dados de textos, cupons e documentos para acelerar os lancamentos.',
      status: 'Servico pronto',
      icon: Bot,
      color: 'bg-blue-50 text-blue-700',
      items: ['Itens de compra por texto', 'Cupom fiscal por imagem', 'Evento/documento por imagem'],
    },
    {
      title: 'Notificacoes',
      description: 'Centraliza avisos internos e prepara envio externo por WhatsApp.',
      status: 'Ativo',
      icon: Sparkles,
      color: 'bg-purple-50 text-purple-700',
      items: ['Avisos de vencimento', 'Lembretes de eventos', 'Relatorios prontos'],
    },
    {
      title: 'Relatorios automaticos',
      description: 'Rotinas semanais e mensais para consolidar informacoes familiares.',
      status: 'Agendado',
      icon: FileText,
      color: 'bg-orange-50 text-orange-700',
      items: ['Relatorio semanal', 'Relatorio mensal', 'Geracao personalizada por periodo'],
    },
  ];

  const lookupCep = async () => {
    setCepError('');
    setAddress(null);

    try {
      const { data } = await api.get<CepAddress>(`/integrations/correios/cep?cep=${encodeURIComponent(cep)}`);
      setAddress(data);
    } catch (error: any) {
      setCepError(error.response?.data?.message ?? 'Nao foi possivel consultar o CEP.');
    }
  };

  return (
    <div className="app-page space-y-6">
      <section className="surface-soft p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">Central de conexoes</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-950">Integração do sistema</h2>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Acompanhe os servicos conectados ao Familia Maestre e organize os proximos ajustes de
              WhatsApp, IA, notificacoes e rotinas automaticas.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
            <Plug className="h-4 w-4" />
            Modulo operacional
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {integrations.map((integration) => (
          <article key={integration.title} className="interactive-card p-5">
            <div className={`mb-4 inline-flex rounded-xl p-3 ${integration.color}`}>
              <integration.icon className="h-5 w-5" />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-950">{integration.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{integration.description}</p>
              </div>
              <span className="status-pill bg-blue-50 text-blue-700">{integration.status}</span>
            </div>
            <ul className="mt-4 space-y-2">
              {integration.items.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="surface p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-yellow-50 p-2 text-yellow-700">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-950">Correios</h3>
              <p className="text-sm text-gray-500">Modulo implantado para consultas postais e futuras entregas.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatusBox label="Consulta CEP" value={correiosStatus?.cepLookup === 'enabled' ? 'Ativa' : 'Pendente'} />
            <StatusBox
              label="Preco e prazo"
              value={correiosStatus?.pricingAndTracking === 'credentials_configured' ? 'Configurado' : 'Sem credenciais'}
            />
            <StatusBox label="Contrato" value={correiosStatus?.contract === 'configured' ? 'Configurado' : 'Pendente'} />
            <StatusBox label="Cartao postagem" value={correiosStatus?.postingCard === 'configured' ? 'Configurado' : 'Pendente'} />
          </div>

          <div className="mt-4 rounded-xl border border-yellow-100 bg-yellow-50/70 p-4 text-sm text-yellow-800">
            Para habilitar preco, prazo e rastreamento oficial, configure as variaveis
            {' '}<strong>CORREIOS_USERNAME</strong>, <strong>CORREIOS_ACCESS_CODE</strong>,
            {' '}<strong>CORREIOS_CONTRACT</strong> e <strong>CORREIOS_POSTING_CARD</strong>.
          </div>
        </div>

        <div className="surface p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-950">Consultar CEP</h3>
              <p className="text-sm text-gray-500">Busque um endereco brasileiro pelo CEP.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={cep}
              onChange={(event) => setCep(event.target.value)}
              className="input-control flex-1"
              placeholder="Digite o CEP"
              inputMode="numeric"
            />
            <button type="button" onClick={lookupCep} className="btn-primary">
              Consultar
            </button>
          </div>

          {cepError && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {cepError}
            </div>
          )}

          {address && (
            <div className="mt-4 grid gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4 sm:grid-cols-2">
              <Info label="CEP" value={address.cep} />
              <Info label="Cidade/UF" value={`${address.city}/${address.state}`} />
              <Info label="Logradouro" value={address.street || 'Nao informado'} />
              <Info label="Bairro" value={address.neighborhood || 'Nao informado'} />
              <Info label="IBGE" value={address.ibge ?? 'Nao informado'} />
              <Info label="Fonte" value={address.source.toUpperCase()} />
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-gray-100 p-2 text-gray-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-950">Checklist de configuracao</h3>
              <p className="text-sm text-gray-500">Itens importantes para deixar as integracoes prontas para uso real.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              'ZAPI_CLIENT_TOKEN configurado',
              'ZAPI_WEBHOOK_SECRET configurado',
              'OPENAI_API_KEY configurada',
              'Credenciais dos Correios configuradas',
              'Telefones dos usuarios normalizados',
              'Permissoes de administrador revisadas',
              'Rotinas automaticas monitoradas',
            ].map((item) => (
              <div key={item} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-sm text-gray-700">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="surface p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-950">Proximas funcoes</h3>
              <p className="text-sm text-gray-500">Melhorias recomendadas para este modulo.</p>
            </div>
          </div>
          <ul className="space-y-3">
            {nextSteps.map((step) => (
              <li key={step} className="rounded-xl border border-gray-100 p-3 text-sm text-gray-600">
                {step}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="surface p-5">
        <h3 className="font-semibold text-gray-950">Atalhos relacionados</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/notificacoes" className="btn-primary">
            Ver notificacoes
          </Link>
          <Link href="/relatorios" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100">
            Relatorios
          </Link>
          <Link href="/lista" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100">
            Lista de Compras
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}
