# Deploy - Supabase e Vercel

Este guia prepara o projeto Familia Maestre para producao usando:

- Supabase: banco PostgreSQL e credenciais.
- Vercel: frontend Next.js.
- Backend NestJS: servidor Node separado, recomendado em Railway, Render, Fly.io ou VPS. O backend atual e um processo persistente, nao uma funcao serverless pura.

## 1. Supabase

### 1.1 Criar/validar projeto

No Supabase, confirme:

- Project URL.
- Anon key.
- Service role key.
- Database password.
- Connection string pooler.
- Connection string direta.

### 1.2 Variaveis do backend

Use `apps/backend/.env.production.example` como base.

Obrigatorias:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<senha>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:<senha>@db.<project-ref>.supabase.co:5432/postgres"
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_ANON_KEY="..."
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
FRONTEND_URL="https://seu-frontend.vercel.app"
```

### 1.3 Aplicar migrations no Supabase

No ambiente local, com o `.env` do backend apontando para o Supabase:

```bash
cd "C:\Users\Windows\Familia Maestre\apps\backend"
npm run prisma:deploy
npm run prisma:seed
```

`prisma:deploy` aplica as migrations existentes.
`prisma:seed` cria admin, membro base, familiares e categorias financeiras.

## 2. Backend

O backend atual fica em:

```text
apps/backend
```

Comandos:

```bash
cd "C:\Users\Windows\Familia Maestre\apps\backend"
npm ci
npm run build
npm run start
```

Em producao, configure:

```env
NODE_ENV=production
PORT=3003
FRONTEND_URL=https://seu-frontend.vercel.app
```

Depois de publicar o backend, copie a URL publica. Exemplo:

```text
https://familia-maestre-api.seudominio.com
```

Essa URL sera usada no frontend como `NEXT_PUBLIC_API_URL`.

## 3. Vercel - Frontend

O frontend fica em:

```text
apps/frontend
```

### 3.1 Criar projeto na Vercel

No painel da Vercel:

- Importar o repositorio.
- Definir Root Directory como `apps/frontend`.
- Framework: Next.js.

O arquivo `apps/frontend/vercel.json` ja define:

- install command
- build command
- output directory

### 3.2 Variaveis de ambiente na Vercel

Configure em Production, Preview e Development conforme necessario:

```env
NEXT_PUBLIC_API_URL=https://sua-api-producao.com
NEXT_PUBLIC_SUPABASE_URL=https://sxdvibcwrtmdetjvfltk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SEU_ANON_KEY_AQUI
```

Importante:

- `NEXT_PUBLIC_*` aparece no navegador.
- Nunca coloque `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `JWT_SECRET` ou `OPENAI_API_KEY` no frontend.

### 3.3 Deploy via CLI

```bash
cd "C:\Users\Windows\Familia Maestre\apps\frontend"
vercel link
vercel env pull .env.local --yes
vercel build --prod
vercel deploy --prebuilt --prod
```

Ou deploy automatico:

```text
push no GitHub -> Vercel builda automaticamente
```

## 4. Checklist de variaveis

### Frontend Vercel

```text
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Backend

```text
DATABASE_URL
DIRECT_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
JWT_SECRET
JWT_REFRESH_SECRET
FRONTEND_URL
OPENAI_API_KEY
ZAPI_INSTANCE_ID
ZAPI_CLIENT_TOKEN
ZAPI_WEBHOOK_SECRET
CORREIOS_USERNAME
CORREIOS_ACCESS_CODE
CORREIOS_CONTRACT
CORREIOS_POSTING_CARD
SENTRY_DSN
```

## 5. Ordem recomendada de producao

1. Criar/validar projeto Supabase.
2. Configurar `apps/backend/.env` com Supabase.
3. Rodar `npm run prisma:deploy`.
4. Rodar `npm run prisma:seed`.
5. Publicar backend.
6. Copiar URL publica do backend.
7. Configurar `NEXT_PUBLIC_API_URL` na Vercel.
8. Publicar frontend na Vercel.
9. Testar login, financeiro, compras e cupons fiscais.

## 6. Observacao sobre backend na Vercel

O backend NestJS atual usa servidor HTTP persistente com `app.listen(port)`.

Isso funciona bem em:

- Railway
- Render
- Fly.io
- VPS
- Docker

Para rodar esse backend dentro da Vercel, o ideal seria uma fase tecnica separada para adaptar o NestJS para serverless functions. Nao recomendo fazer isso junto com o deploy inicial, porque aumenta risco e muda o modelo de execucao da API.

## 7. Teste final

Depois do deploy:

```bash
curl https://sua-api-producao.com/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"phone\":\"000000001\",\"password\":\"familia@2024\"}"
```

No navegador:

```text
https://seu-frontend.vercel.app/login
```

Credencial seed:

```text
Telefone / WhatsApp: 000000001
Senha: familia@2024
```
