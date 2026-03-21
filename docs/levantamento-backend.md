# Levantamento de Processos do Backend

## Escopo

Este repositório não contém um backend implementado. O que existe aqui é um frontend React/Vite que consome serviços externos e, em alguns pontos, simula comportamento operacional no cliente.

Este documento foi montado a partir dos fluxos encontrados no frontend, principalmente em:

- `src/services/FlowAPIService.ts`
- `src/services/GeminiService.ts`
- `src/services/SocialOAuthService.ts`
- `src/components/WhatsAppConnect.tsx`
- `src/components/MultiChannelPublisher.tsx`
- `src/components/InstagramIntegrations.tsx`
- `src/components/AIVideoLab.tsx`
- `src/components/PlatformMonitor.tsx`

## Resumo Executivo

Hoje a aplicação depende de quatro blocos de backend/integracão:

1. `Flow Backend`
Responsável por autenticação interna, agendamento, publicação, estatísticas, credenciais sociais e troca OAuth.

2. `Google Gemini / Veo`
Usado diretamente pelo frontend para geração de copy e geração de vídeo.

3. `Evolution API`
Usado diretamente pelo frontend para conexão WhatsApp via QR Code e envio de mensagens.

4. `APIs sociais`
Instagram, Facebook, LinkedIn, TikTok, YouTube e Pinterest, acessadas indiretamente via Flow Backend em parte do fluxo OAuth/publicação.

O cenário atual funciona como um frontend "orquestrador", mas com responsabilidades sensíveis demais no cliente. O principal problema estrutural é que segredos, tokens, autenticação e regras de integração estão distribuídos no frontend. Isso reduz segurança, auditabilidade, resiliência e capacidade de operação.

## Arquitetura Atual

### 1. Flow Backend

Arquivo principal: `src/services/FlowAPIService.ts`

Fluxos mapeados:

- Login técnico em `/flow/auth/login`
- Cache local de token em memória
- Publicação em `/flow/grayart/publish`
- Agendamento em `/flow/grayart/schedule`
- Estatísticas em `/flow/grayart/stats`
- Gestão de credenciais sociais em `/flow/grayart/social/credentials`
- Status de contas sociais em `/flow/grayart/social/status`
- Configuração social em `/flow/grayart/social/config`
- Troca de código OAuth em `/flow/grayart/social/oauth/exchange`
- Busca de perfil social em `/flow/grayart/social/profile`
- Publicação social em `/flow/grayart/social/publish`

Pontos positivos:

- Existe um backend central para parte relevante das integrações.
- Já há separação conceitual por domínio: social, agendamento, stats.
- O frontend consegue operar em modo degradado quando o backend não está configurado em alguns módulos.

Problemas:

- Usuário e senha do Flow estão expostos no `.env` do frontend.
- O token do Flow é obtido diretamente pelo browser.
- Não há camada de retry, timeout, circuit breaker ou observabilidade no cliente.
- Não há contrato tipado validado de resposta.
- O frontend trata backend offline como caso "silencioso" em vários pontos.
- O token fica apenas em memória, sem estratégia robusta de renovação e sem tratamento de concorrência.

Melhorias recomendadas:

- Remover autenticação técnica do frontend.
- Colocar um backend BFF próprio entre frontend e integrações.
- Substituir login técnico por sessão de aplicação, JWT de usuário ou token server-to-server interno.
- Padronizar respostas com formato único: `success`, `data`, `error`, `traceId`.
- Implementar timeout, retry controlado e logs estruturados.
- Adicionar health endpoints reais e contratos versionados.

### 2. Gemini / Veo

Arquivo principal: `src/services/GeminiService.ts`

Fluxos mapeados:

- Geração de copy com `gemini-2.5-flash`
- Geração de prompt cinematográfico
- Disparo de geração de vídeo com Veo
- Polling manual de operação assíncrona
- Verificação de quota/acesso

Pontos positivos:

- O produto já tem uma cadeia funcional copy -> prompt -> vídeo.
- Existe fallback local quando a IA falha em alguns cenários.
- Há polling e estado visual para operações longas.

Problemas:

- `VITE_GEMINI_API_KEY` está no frontend.
- Consumo da API é feito diretamente do navegador.
- Polling é controlado pelo cliente, sem fila nem persistência.
- Não há rastreabilidade por job.
- Não existe controle de custo por usuário, divisão ou operação.
- Falhas de quota viram fallback de interface, mas não geram processo operacional real.
- Resultado de vídeo não é persistido em backend.

Melhorias recomendadas:

- Mover chamadas Gemini/Veo para backend.
- Criar tabela ou coleção de `ai_jobs`.
- Persistir: prompt, divisão, custo estimado, status, erro, duração, usuário, artefato final.
- Substituir polling do browser por fila assíncrona com webhook ou polling em endpoint interno.
- Adicionar controle de orçamento e limites por divisão.
- Salvar ativos gerados em storage central.

### 3. OAuth Social e Publicação Social

Arquivo principal: `src/services/SocialOAuthService.ts`

Fluxos mapeados:

- Geração de URL OAuth por plataforma
- Abertura de popup OAuth
- Recebimento de `code` via callback
- Troca do `code` por token no Flow Backend
- Busca de perfil social
- Publicação em múltiplas redes
- Armazenamento local de tokens e contas no `localStorage`

Pontos positivos:

- O fluxo funcional está relativamente completo para MVP.
- O backend já faz a troca do `code` por token.
- O frontend consegue mostrar status por conta e publicação multi-rede.

Problemas:

- O frontend ainda conhece segredos demais de integração.
- `appSecret` aparece nas configs de plataforma do lado cliente.
- Tokens sociais são armazenados em `localStorage`.
- Não existe refresh centralizado e auditável por plataforma.
- Não há reconciliação entre estado local e estado real do servidor.
- Não há idempotência de publicação.
- Publicação em lote usa `Promise.allSettled`, mas sem fila, sem compensação e sem rastreio transacional.

Melhorias recomendadas:

- Tirar completamente `client secret`, `access_token` e `refresh_token` do frontend.
- Salvar tokens sociais apenas no backend, com criptografia em repouso.
- Criar entidade `social_connections`.
- Criar entidade `publish_jobs`.
- Implementar fila por plataforma com status:
  `pending`, `processing`, `success`, `failed`, `retrying`, `expired`.
- Adicionar idempotency key por publicação.
- Salvar payload, resposta da plataforma, URL final do post e erro padronizado.
- Implementar rotina de refresh de tokens por scheduler.

### 4. WhatsApp / Evolution API

Arquivo principal: `src/components/WhatsAppConnect.tsx`

Fluxos mapeados:

- Criação de instância
- Geração e leitura de QR Code
- Polling de estado da conexão
- Logout da instância
- Envio de mensagem de texto
- Consulta de instâncias

Pontos positivos:

- O módulo cobre o fluxo operacional principal de conexão.
- A UI já contempla expiração de QR e polling de estado.

Problemas:

- `VITE_EVOLUTION_API_KEY` está exposta ao frontend.
- O frontend fala diretamente com a Evolution API.
- Não existe camada interna para governar sessões, filas, templates e opt-in.
- Disparo de mensagens parece síncrono e orientado por interface.
- Não há trilha de auditoria, deduplicação ou controle de limite.
- Não há gestão formal de consentimento, blacklist ou compliance.

Melhorias recomendadas:

- Colocar a Evolution API atrás do backend.
- Criar serviço interno de WhatsApp com:
  `instances`, `contacts`, `groups`, `campaigns`, `messages`, `delivery_logs`.
- Persistir QR/session status no backend.
- Implementar fila de envio e rate limiting.
- Separar mensagem transacional de campanha.
- Criar trilha de consentimento LGPD e opt-out.

### 5. Monitoramento e Métricas

Arquivo principal: `src/components/PlatformMonitor.tsx`

Fluxos mapeados:

- Health check de Flow, Evolution, Gemini e Veo
- Carregamento de stats do Flow
- Simulação de atividades e parte das métricas

Pontos positivos:

- Já existe intenção de observabilidade operacional.
- O painel ajuda a visualizar dependências externas.

Problemas:

- O monitor mistura dado real e dado simulado.
- Health checks dependem de `VITE_FLOW_API_URL`.
- Não há fonte única de verdade para métricas.
- Não há logs centralizados, traces, nem indicadores SLO/SLA.

Melhorias recomendadas:

- Separar explicitamente dados simulados de dados reais.
- Criar endpoint backend de observabilidade consolidada.
- Adotar logs estruturados com `traceId`.
- Expor métricas como:
  latência, erro por serviço, jobs pendentes, taxa de publicação, taxa de refresh de token, custo IA.
- Adotar alertas reais por e-mail/Slack/WhatsApp interno.

## Mapa dos Processos Atuais

### Processo 1. Geração de Copy

Origem:
`ReelsGenerator.tsx`

Fluxo atual:

1. Usuário escolhe divisão e plataforma.
2. Frontend chama Gemini diretamente.
3. Retorna JSON com hook, body, CTA e tags.
4. Em falha, o frontend usa templates locais.

Melhorias:

- Persistir histórico de prompts e resultados.
- Versionar prompts por divisão.
- Medir taxa de aceitação e uso da copy.
- Permitir aprovação editorial antes de publicar.

### Processo 2. Geração de Vídeo IA

Origem:
`AIVideoLab.tsx`

Fluxo atual:

1. Usuário fornece script.
2. Frontend gera prompt com Gemini.
3. Frontend inicia job no Veo.
4. Frontend faz polling.
5. Se sucesso, vídeo fica disponível na UI.
6. Se quota falha, entra em modo simulado.

Melhorias:

- Orquestrar tudo no backend.
- Persistir jobs.
- Gerar callback/webhook interno.
- Integrar storage de mídia.
- Rastrear custo por vídeo.

### Processo 3. Agendamento de Publicação

Origem:
`MultiChannelPublisher.tsx`

Fluxo atual:

1. Usuário escolhe plataformas e conteúdo.
2. Frontend chama `schedulePost`.
3. Backend registra agendamento.
4. UI lista fila via `listScheduledPosts`.

Melhorias:

- Validar janela de publicação, timezone e conflitos.
- Suportar mídia, thumbnail, CTA, primeiro comentário e metadados por rede.
- Adicionar fila real de execução com worker.
- Registrar tentativas e reprocessamento.

### Processo 4. Publicação Imediata

Origem:
`MultiChannelPublisher.tsx` e `InstagramIntegrations.tsx`

Fluxo atual:

1. Usuário envia conteúdo.
2. Frontend chama backend para publicar ou registrar.
3. Em publicação social multi-canal, o cliente dispara várias requisições.

Melhorias:

- Centralizar lote no backend.
- Criar job transacional por campanha/publicação.
- Aplicar idempotência.
- Implementar retries por plataforma.
- Retornar status detalhado por destino.

### Processo 5. Conexão de Contas Sociais

Origem:
`InstagramIntegrations.tsx`

Fluxo atual:

1. Usuário inicia OAuth.
2. Frontend abre popup.
3. Callback retorna `code`.
4. Backend troca o `code`.
5. Token e conta ficam salvos localmente.

Melhorias:

- Persistir tudo no backend.
- Fazer sync periódico de contas.
- Tratar expiração de token como processo automático.
- Criar painel administrativo de credenciais e permissões.

### Processo 6. WhatsApp Operacional

Origem:
`WhatsAppConnect.tsx`

Fluxo atual:

1. Frontend cria instância.
2. Frontend recebe QR.
3. Frontend verifica conexão por polling.
4. Frontend envia mensagens diretamente.

Melhorias:

- Mover a sessão para backend.
- Criar campanhas com aprovação.
- Controlar templates, grupos e frequência.
- Salvar status de entrega e falha.

## Principais Riscos Atuais

### Segurança

- Chaves e credenciais expostas no frontend.
- Tokens em `localStorage`.
- Segredos operacionais em `.env` do cliente.

### Confiabilidade

- Ausência de filas e workers para tarefas assíncronas.
- Falta de retry estruturado e DLQ.
- Forte dependência de polling no browser.

### Governança

- Sem trilha de auditoria por ação.
- Sem separação clara entre ambiente real e simulado.
- Sem ownership explícito de processos backend.

### Escalabilidade

- Frontend concentra orquestração demais.
- Ausência de modelo de domínio persistente para jobs, contas e campanhas.
- Baixa capacidade de observação e diagnóstico.

## Modelo de Backend Recomendado

### Serviços sugeridos

1. `api-gateway` ou `bff`
Ponto único de entrada do frontend.

2. `auth-service`
Sessão de usuário, permissões e auditoria.

3. `social-service`
OAuth, refresh de token, publicação, status de conta, webhooks.

4. `content-service`
Templates, copy, assets, campanhas, calendário editorial.

5. `ai-service`
Gemini, Veo, prompts, jobs, custos, storage de artefatos.

6. `messaging-service`
WhatsApp/Evolution, campanhas, grupos, filas, delivery logs.

7. `monitoring-service`
Health, métricas, alertas, eventos operacionais.

### Entidades mínimas

- `users`
- `divisions`
- `social_credentials`
- `social_connections`
- `publish_jobs`
- `scheduled_posts`
- `ai_jobs`
- `media_assets`
- `whatsapp_instances`
- `whatsapp_campaigns`
- `message_deliveries`
- `audit_logs`

## Priorização de Melhorias

### Prioridade Alta

- Remover segredos do frontend.
- Mover Gemini/Veo para backend.
- Mover Evolution API para backend.
- Parar de armazenar tokens sociais em `localStorage`.
- Criar logs e auditoria mínima.
- Criar jobs persistidos para publicação e IA.

### Prioridade Média

- Criar fila assíncrona com worker.
- Implementar retry/idempotência.
- Criar dashboard real de observabilidade.
- Normalizar métricas e health checks.
- Padronizar contratos de API.

### Prioridade Baixa

- Multi-tenant mais formal por divisão.
- A/B test de prompts e copies.
- Motor de recomendação de melhor horário.
- Analytics avançado por campanha.

## Roadmap Proposto

### Fase 1. Contenção de risco

- Tirar credenciais do frontend.
- Introduzir BFF.
- Centralizar chamadas sensíveis no backend.
- Criar documentação de contratos e erros.

### Fase 2. Operação confiável

- Implementar filas para publicação, IA e WhatsApp.
- Persistir jobs e histórico.
- Adicionar retries, timeouts e idempotência.

### Fase 3. Observabilidade e governança

- Logs estruturados.
- Métricas reais por serviço.
- Alertas operacionais.
- Auditoria por usuário/divisão.

### Fase 4. Escala de produto

- Aprovação editorial.
- Campanhas multi-canal.
- Analytics real por canal.
- Gestão de custos de IA.

## Ações Imediatas Recomendadas

1. Revogar e rotacionar as chaves reais que hoje aparecem no `.env`.
2. Criar um backend BFF simples para Flow, Gemini/Veo e Evolution.
3. Mover armazenamento de tokens sociais para o servidor.
4. Criar tabela de jobs para publicação e IA.
5. Separar claramente o que é mock e o que é dado real no monitor.

## Conclusão

O projeto já tem um bom desenho funcional de produto, mas a camada backend ainda está distribuída e parcialmente embutida no frontend. O maior ganho agora não é adicionar mais tela, e sim consolidar segurança, orquestração, persistência e observabilidade.

Se a intenção é operar isso em produção com múltiplas divisões, contas sociais, campanhas e IA paga, a recomendação é transformar o frontend em cliente fino e mover a inteligência operacional para um backend centralizado.
