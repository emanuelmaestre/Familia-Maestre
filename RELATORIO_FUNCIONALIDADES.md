# Relatório de Funcionalidades - Família Maestre

Data da revisão: 28/06/2026

## Resumo executivo

O sistema está organizado nos módulos definidos para manutenção: Autenticação, Usuários, Lista de Compras, Financeiro, Agenda/Eventos, Notificações, Relatórios, WhatsApp e IA.

O frontend e o backend compilam com sucesso. Também foi feita uma verificação HTTP autenticada nos principais endpoints, todos respondendo `200`.

Status geral: funcional, com pontos parciais em WhatsApp/IA por dependerem de configuração externa e em algumas ações avançadas que existem no backend, mas ainda não possuem interface completa no frontend.

## Validação realizada

- Frontend: `npm run build` em `apps/frontend` passou.
- Backend: `npm run build` em `apps/backend` passou.
- Login admin validado via API com `000000001`.
- Endpoints testados com token autenticado:
  - `GET /auth/me` -> 200
  - `GET /users` -> 200
  - `GET /shopping?status=PENDING` -> 200
  - `GET /finance/categories` -> 200
  - `GET /finance/transactions` -> 200
  - `GET /finance/summary?month=6&year=2026` -> 200
  - `GET /events` -> 200
  - `GET /notifications` -> 200
  - `GET /reports` -> 200

## Módulos

### 1. Autenticação

Status: funcional.

Funcionalidades existentes:
- Login por telefone/WhatsApp e senha.
- JWT de acesso.
- Refresh token.
- Consulta do usuário logado em `/auth/me`.
- Alteração de senha autenticada.
- Proteção de rotas no frontend via store de autenticação.

Frontend:
- Tela `/login`.
- Redirecionamento para dashboard após login.
- Logout no cabeçalho e na sidebar.

Observações:
- Não há tela de recuperação de senha.
- Não há expiração visual de sessão; o interceptor redireciona para login em falha de refresh.

### 2. Usuários

Status: funcional para administração básica.

Funcionalidades existentes:
- Listar usuários.
- Criar usuário.
- Atualizar dados e status ativo/inativo.
- Remoção lógica no backend.
- Perfis `ADMIN` e `MEMBER`.

Frontend:
- Tela `/configuracoes`.
- Alteração de senha.
- Listagem de membros.
- Drawer para adicionar membro.
- Ativar/inativar usuário.

Observações:
- Criação/edição de usuários é restrita a `ADMIN` no backend.
- O frontend ainda não oferece edição completa de nome/telefone após criação, apenas ativar/inativar.

### 3. Lista de Compras

Status: funcional.

Funcionalidades existentes:
- Listar itens por status.
- Criar item.
- Atualizar item no backend.
- Marcar como comprado.
- Cancelar item.
- Remoção lógica.
- Prioridades: baixa, média, alta e urgente.
- Integração com IA para criar item a partir de mensagem do WhatsApp.

Frontend:
- Tela `/lista`.
- Filtros por status.
- Drawer para adicionar item.
- Ações de comprar, cancelar e excluir.

Observações:
- O backend aceita preço estimado/preço comprado, mas a UI ainda não expõe esses campos.
- A edição de item existe no backend, mas não está exposta na tela.

### 4. Financeiro

Status: funcional para controle básico.

Funcionalidades existentes:
- Listar transações.
- Criar receita/despesa.
- Categorias financeiras.
- Resumo mensal com receitas, despesas, saldo e agrupamento por categoria.
- Marcar despesa como paga.
- Atualizar/remover transações no backend.
- Recorrência mensal no backend.
- Cron diário para avisos de vencimento.

Frontend:
- Tela `/financeiro`.
- Filtro por mês e ano.
- Cards de receitas, despesas e saldo.
- Drawer para nova transação.
- Gráfico de gastos por categoria.
- Tabela de transações.

Observações:
- A UI ainda não expõe edição/exclusão de transação.
- O filtro mensal usa `createdAt` no backend; pode não corresponder ao vencimento financeiro real quando a intenção for competência/vencimento.
- Recorrência existe no backend, mas precisa de validação funcional com dados reais.

### 5. Agenda / Eventos

Status: funcional.

Funcionalidades existentes:
- Listar eventos.
- Criar evento.
- Atualizar evento no backend.
- Cancelar evento.
- Confirmar presença no backend.
- Participantes.
- Cron diário para lembrete de eventos do dia seguinte.

Frontend:
- Tela `/agenda`.
- Drawer para novo evento.
- Seleção de participantes.
- Cancelamento de evento quando agendado.
- Estado vazio.

Observações:
- Confirmar presença existe no backend, mas não está exposto na interface.
- Edição/reagendamento existe parcialmente no backend, mas não está exposto na interface.
- Cancelamento é restrito a `ADMIN`.

### 6. Notificações

Status: funcional.

Funcionalidades existentes:
- Listar notificações do usuário.
- Marcar notificação como lida.
- Envio interno por eventos, vencimentos e relatórios.
- Envio por WhatsApp quando Z-API estiver configurada.

Frontend:
- Badge no cabeçalho com não lidas.
- Sino redireciona para `/notificacoes`.
- Tela `/notificacoes`.
- Marcar como lida.

Observações:
- Não há exclusão/arquivamento de notificações.
- Não há preferências por usuário para canais de notificação.

### 7. Relatórios

Status: funcional, com geração interna.

Funcionalidades existentes:
- Listar relatórios.
- Consultar relatório por ID.
- Gerar relatório personalizado para `ADMIN`.
- Relatórios semanais e mensais por cron.
- Payload consolidado de compras, financeiro e eventos.
- Notificação quando relatório fica pronto.

Frontend:
- Tela `/relatorios`.
- Histórico.
- Geração personalizada por data inicial/final para admin.
- Visualização resumida do payload financeiro.

Observações:
- Não há geração real de PDF no backend; `fileUrl` existe no modelo, mas não é produzido.
- A UI mostra botão PDF apenas se `fileUrl` existir.
- Relatórios de compras/eventos são coletados no payload, mas a UI detalha principalmente financeiro.

### 8. WhatsApp

Status: dependente de configuração externa.

Funcionalidades existentes:
- Webhook em `/whatsapp/webhook`.
- Validação opcional por secret `ZAPI_WEBHOOK_SECRET`.
- Comando `/lista`.
- Comando `/ajuda`.
- Mensagens livres podem virar itens de compra via IA.
- Envio de mensagens pela Z-API quando `ZAPI_CLIENT_TOKEN` estiver configurado.

Frontend:
- Não há tela operacional específica de WhatsApp.

Observações:
- Sem credenciais Z-API, o módulo permanece desativado.
- A integração depende de o telefone do usuário no banco bater com o telefone recebido no webhook.

### 9. IA

Status: funcional no backend, dependente de `OPENAI_API_KEY`.

Funcionalidades existentes:
- Extração de item de compra a partir de texto.
- Extração de cupom fiscal por imagem.
- Extração de evento/documento por imagem.
- Registro de logs de uso, custo estimado, tokens, latência e falhas.

Frontend:
- Não há tela própria de IA.
- Uso prático atual aparece via WhatsApp/lista de compras.

Observações:
- Sem `OPENAI_API_KEY`, o backend não quebra na inicialização, mas chamadas de IA retornam indisponibilidade.
- Extração de cupom e documento existe no serviço, mas não está exposta em controller/tela.

## Dashboard

Status: funcional.

Funcionalidades:
- Resumo de compras pendentes.
- Receitas, despesas e saldo do mês.
- Próximos eventos.
- Relatórios recentes.
- Notificações não lidas.
- Links para módulos.

Observações:
- O card de Notificações deve apontar para `/notificacoes`; caso ainda aponte para `/dashboard`, recomenda-se ajustar.

## Lacunas e melhorias recomendadas

Prioridade alta:
- Expor edição/exclusão de transações no frontend.
- Expor edição de itens de compra no frontend.
- Expor edição/reagendamento/confirmação de presença em eventos.
- Ajustar card de Notificações do dashboard para abrir `/notificacoes`.
- Criar feedback visual de erro/sucesso nos drawers de criação.

Prioridade média:
- Criar tela de configuração/status do WhatsApp.
- Criar tela ou painel para recursos de IA e logs.
- Implementar geração real de PDF para relatórios.
- Melhorar relatórios para detalhar compras e eventos, não só financeiro.
- Adicionar preferências de notificação por usuário.

Prioridade baixa:
- Recuperação de senha.
- Perfil do usuário com edição de avatar/dados pessoais.
- Filtros avançados em agenda e financeiro.
- Testes E2E dos fluxos principais.

## Conclusão

O sistema já cobre os módulos essenciais e possui base funcional consistente. As operações principais de autenticação, usuários, compras, financeiro, agenda, notificações e relatórios estão presentes e respondem via API.

Os maiores pontos pendentes estão na experiência de uso: algumas capacidades já existem no backend, mas ainda não possuem botões/telas completos no frontend. WhatsApp e IA estão implementados como integração, mas dependem de credenciais externas e ainda não possuem painel próprio de operação.
