# Relatorio de Lacunas Funcionais - Familia Maestre

Data da revisao: 28/06/2026

## Objetivo

Este documento revisa o que existe dentro de cada modulo mantido no sistema e lista o que ainda falta adicionar para transformar o produto em uma administracao familiar mais completa.

Modulos considerados:
- Autenticacao
- Usuarios
- Lista de Compras
- Financeiro
- Agenda / Eventos
- Notificacoes
- Relatorios
- WhatsApp
- IA

## Visao geral

O sistema ja possui uma base funcional nos modulos principais. A maior parte das entidades tem backend com operacoes completas, mas varias capacidades ainda nao aparecem na interface. O principal trabalho restante esta em:
- expor no frontend funcoes que ja existem no backend;
- adicionar telas de configuracao para WhatsApp, IA, categorias e preferencias;
- completar fluxos de edicao, exclusao, historico, exportacao e auditoria;
- melhorar relatorios com PDF real, filtros e visualizacoes por modulo.

## 1. Autenticacao

### O que existe

- Login por telefone/WhatsApp e senha.
- Token JWT de acesso.
- Refresh token.
- Consulta do usuario logado em `/auth/me`.
- Alteracao de senha autenticada.
- Logout no cabecalho e na sidebar.
- Protecao das rotas internas no frontend.

### O que falta adicionar

- Recuperacao de senha por WhatsApp, e-mail ou fluxo administrativo.
- Tela de primeiro acesso para usuario convidado criar senha.
- Politica visual de senha forte.
- Bloqueio temporario por muitas tentativas de login.
- Registro de tentativas de acesso e auditoria de login.
- Controle de sessoes ativas, com opcao de encerrar outros acessos.
- 2FA/OTP por WhatsApp para contas administrativas.

### Prioridade sugerida

Alta: recuperacao de senha, primeiro acesso e bloqueio por tentativas.

## 2. Usuarios

### O que existe

- Listagem de usuarios.
- Criacao de usuarios.
- Atualizacao de dados no backend.
- Ativar/inativar usuario na interface.
- Remocao logica no backend.
- Perfis `ADMIN` e `MEMBER`.
- Alteracao da propria senha.

### O que falta adicionar

- Edicao completa de usuario na interface: nome, telefone, papel e dados de perfil.
- Botao de remover usuario na interface, com confirmacao.
- Busca e filtros por nome, telefone, papel e status.
- Tela de perfil do usuario logado.
- Foto/avatar do membro.
- Permissoes mais granulares por modulo, nao apenas `ADMIN` e `MEMBER`.
- Historico de acoes por usuario.
- Convite de novo membro com link ou codigo temporario.

### Prioridade sugerida

Alta: edicao completa, remocao com confirmacao e busca/filtros.

## 3. Lista de Compras

### O que existe

- Listar itens por status.
- Criar item.
- Atualizar item no backend.
- Marcar item como comprado.
- Cancelar item.
- Excluir item por remocao logica.
- Prioridades.
- Lista ampla de unidades de medida.
- Criacao de item via WhatsApp usando IA.

### O que falta adicionar

- Edicao de item na interface.
- Campos de preco estimado e preco pago na tela.
- Fluxo de compra com confirmacao de quantidade final, preco final e mercado/local.
- Integracao real para criar lancamento financeiro ao marcar item como comprado.
- Categorias especificas de compras, separadas das categorias financeiras.
- Acoes em massa: comprar, cancelar ou excluir varios itens.
- Historico de compras concluidas por periodo.
- Repetir compra anterior.
- Exportar ou compartilhar lista.
- Anexar foto de cupom fiscal.
- Leitura de codigo de barras ou entrada por voz, se for desejado no futuro.

### Prioridade sugerida

Alta: edicao, preco pago e criacao opcional de despesa no financeiro.

## 4. Financeiro

### O que existe

- Lista de transacoes.
- Criacao de receita e despesa.
- Separacao visual de `A pagar` e `A receber`.
- Marcacao de lancamento como pago/recebido.
- Categorias financeiras ampliadas.
- Resumo mensal.
- Grafico por categoria.
- Atualizacao e exclusao no backend.
- Recorrencia mensal no backend.
- Avisos de vencimento por rotina agendada.

### O que falta adicionar

- Edicao de lancamento na interface.
- Exclusao de lancamento na interface.
- Gestao visual de categorias: criar, editar, desativar, cor e tipo.
- Data de pagamento/recebimento separada da data de vencimento.
- Filtros por vencimento, competencia, categoria, tipo e status.
- Status de vencido, vence hoje e vencendo em breve.
- Pagamentos parciais.
- Anexos de comprovante ou nota fiscal.
- Tela para controlar recorrencias.
- Separar valores previstos de valores realizados.
- Conciliacao simples: conferir contas pagas e recebidas.
- Exportacao CSV/PDF.

### Prioridade sugerida

Alta: editar/excluir, data de pagamento, filtros por vencimento e status de vencido.

## 5. Agenda / Eventos

### O que existe

- Listagem de eventos.
- Criacao de evento.
- Atualizacao de evento no backend.
- Cancelamento de evento.
- Participantes.
- Confirmacao de presenca no backend.
- Lembretes de eventos do dia seguinte por rotina agendada.

### O que falta adicionar

- Edicao/reagendamento de evento na interface.
- Confirmacao de presenca na interface.
- Visualizacao em calendario mensal/semanal/diario.
- Filtros por tipo, status, participante e periodo.
- Evento recorrente.
- Detalhe do evento em drawer ou pagina propria.
- Configuracao de lembretes por evento.
- Anexos ou documentos do evento.
- Check-in ou registro de presenca.
- Integracao de evento com notificacao manual para participantes.

### Prioridade sugerida

Alta: editar/reagendar, confirmar presenca e calendario visual.

## 6. Notificacoes

### O que existe

- Listar notificacoes do usuario.
- Badge de notificacoes nao lidas no cabecalho.
- Tela de notificacoes.
- Marcar notificacao como lida.
- Envio interno por eventos, vencimentos e relatorios.
- Envio por WhatsApp quando configurado.

### O que falta adicionar

- Marcar todas como lidas.
- Arquivar ou excluir notificacoes.
- Filtros por lidas, nao lidas, tipo e data.
- Preferencias de notificacao por usuario.
- Preferencias de canal: sistema, WhatsApp e e-mail se for adicionado.
- Tela administrativa para enviar comunicado para todos.
- Detalhe da notificacao.
- Controle de tentativas e falhas de envio externo.

### Prioridade sugerida

Media: marcar todas como lidas, filtros e preferencias por usuario.

## 7. Relatorios

### O que existe

- Listar relatorios.
- Gerar relatorio personalizado para admin.
- Relatorios semanais e mensais por rotina agendada.
- Payload com dados de compras, financeiro e eventos.
- Visualizacao resumida do relatorio.
- Campo `fileUrl` previsto para arquivo do relatorio.

### O que falta adicionar

- Geracao real de PDF.
- Download de PDF e CSV.
- Selecao visual dos modulos incluidos no relatorio.
- Relatorio detalhado de compras.
- Relatorio detalhado de agenda/eventos.
- Graficos financeiros mais completos.
- Filtros por periodo, modulo e usuario.
- Status de processamento com erro/sucesso.
- Envio automatico do relatorio por WhatsApp.
- Agendamento configuravel de relatorios.
- Comparativo mensal e anual.

### Prioridade sugerida

Alta: PDF real, selecao de modulos e detalhamento por compras/financeiro/eventos.

## 8. WhatsApp

### O que existe

- Webhook em `/whatsapp/webhook`.
- Validacao opcional por secret.
- Comando `/lista`.
- Comando `/ajuda`.
- Mensagens livres podem virar item de compra via IA.
- Envio de mensagens pela Z-API quando configurada.

### O que falta adicionar

- Tela de configuracao/status do WhatsApp.
- Indicador de conexao com Z-API.
- Historico de mensagens recebidas e enviadas.
- Logs de erro de envio.
- Retentativa de mensagens com falha.
- Mais comandos: financeiro, agenda, notificacoes e relatorios.
- Fluxos com confirmacao antes de criar dados importantes.
- Templates de mensagem.
- Normalizacao e validacao mais robusta de telefone.
- Painel para testar envio de mensagem.

### Prioridade sugerida

Media/Alta: tela de status, logs e comandos para financeiro/agenda.

## 9. IA

### O que existe

- Extracao de item de compra por texto.
- Extracao de cupom fiscal por imagem no servico.
- Extracao de evento/documento por imagem no servico.
- Registro de logs de uso, tokens, latencia, custo estimado e falhas.
- Integracao pratica atual via WhatsApp para lista de compras.

### O que falta adicionar

- Endpoints/telas para usar extracao de cupom fiscal.
- Endpoints/telas para usar extracao de evento por documento.
- Painel de logs de IA.
- Monitoramento de custo por periodo.
- Configuracao de modelo/provedor.
- Tela de teste de prompts.
- Fallback visual quando a chave de IA nao estiver configurada.
- Permissao para limitar uso de IA por perfil.
- Confirmacao humana antes de salvar dados extraidos por IA.

### Prioridade sugerida

Media: telas para cupom, evento por documento e painel de uso/custos.

## 10. Dashboard

### O que existe

- Cards de resumo financeiro.
- Compras pendentes.
- Proximos eventos.
- Relatorios recentes.
- Notificacoes nao lidas.
- Links para os modulos.

### O que falta adicionar

- Acoes rapidas: nova compra, novo lancamento, novo evento.
- Bloco de urgencias: contas vencidas, eventos hoje, compras urgentes.
- Linha do tempo familiar.
- Grafico de tendencia financeira mensal.
- Atividade recente por usuario.
- Indicadores de WhatsApp e IA configurados ou pendentes.

### Prioridade sugerida

Media: acoes rapidas e bloco de urgencias.

## Lacunas tecnicas transversais

- Validacao runtime mais forte nos DTOs do backend.
- Testes automatizados de fluxos principais.
- Testes E2E: login, criar compra, criar financeiro, criar evento e gerar relatorio.
- Tratamento visual padronizado para erro, carregamento e sucesso.
- Auditoria de acoes sensiveis.
- Upload/storage de arquivos para comprovantes, cupons e documentos.
- Controle de permissoes por acao no frontend, alinhado ao backend.
- Melhor suporte a acessibilidade: foco, labels, atalhos e contraste.

## Ordem recomendada de implementacao

1. Completar CRUD visual onde o backend ja existe: usuarios, compras, financeiro e agenda.
2. Adicionar funcionalidades criticas do financeiro: vencidos, data de pagamento, filtros e comprovantes.
3. Criar PDF real de relatorios e selecao de modulos.
4. Adicionar configuracoes e status de WhatsApp.
5. Expor recursos de IA para cupom fiscal e documento de evento.
6. Criar preferencias de notificacao por usuario.
7. Implementar testes automatizados dos fluxos principais.

## Conclusao

O projeto esta bem encaminhado como MVP funcional. A estrutura dos modulos esta correta, mas o sistema ainda precisa completar muitos fluxos de uso diario, principalmente edicao, exclusao, filtros, historico, comprovantes, PDF e configuracoes operacionais. A melhor estrategia agora e evoluir primeiro o que ja tem backend pronto, porque isso entrega valor rapido sem alterar profundamente a arquitetura.
