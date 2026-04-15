# Central IA Backend (Layout B)

Backend implementado no BFF (`server/routes/agents-hub.ts`) para suportar o layout B:

- Coluna de conversa em grupo dos agentes
- Conversa 1:1 por agente
- Trilha de falhas/erros e correções
- Tarefas entre agentes com ciclo `queued -> running -> done/failed`
- Relatórios e aprendizado persistente
- Eventos em tempo real via SSE

## Base URL

- `http://localhost:3060/api/agents-hub`

## Endpoints principais

### Visão geral

- `GET /overview`
- `GET /agents`
- `POST /agents`
- `PATCH /agents/:agentKey/status`
- `POST /agents/:agentKey/heartbeat`

### Conversas (Grupo + 1:1)

- `GET /threads`
- `POST /threads`
- `GET /messages?threadId=...|threadKey=...&limit=...&beforeId=...`
- `POST /messages`
- `POST /messages/mark-read`

### Tarefas entre agentes

- `GET /tasks?status=&priority=&agentKey=&limit=`
- `POST /tasks`
- `POST /tasks/:id/claim`
- `POST /tasks/:id/complete`
- `POST /tasks/:id/fail`
- `PATCH /tasks/:id`

### Falhas / Incidentes

- `GET /failures?status=&severity=&agentKey=&limit=`
- `POST /failures`
- `PATCH /failures/:id`

### Relatórios

- `GET /reports?reportType=&agentKey=&limit=`
- `POST /reports`

### Aprendizado

- `GET /learning?agentKey=&topic=&q=&limit=`
- `POST /learning`

### Tempo real

- `GET /events?afterId=&limit=`
- `GET /stream?afterId=` (SSE)

## Regras operacionais importantes

- Tudo é escopado por `user_id` do JWT.
- `GET /agents` garante seed de 11 agentes padrão automaticamente para bootstrap.
- `POST /messages` pode criar tarefa automaticamente (`createTask=true`).
- `POST /tasks/:id/fail` cria incidente automaticamente em `ai_failures`.
- `POST /tasks/:id/complete` pode gerar relatório e mensagem de retorno no thread.

## Contrato mínimo recomendado para o frontend (layout B)

1. Carregar `GET /overview`, `GET /agents`, `GET /threads`.
2. Abrir stream em `GET /stream` para atualizar painel em tempo real.
3. Grupo usa `threadKey=group:main`.
4. 1:1 usa `POST /threads` com `scope=direct,targetAgentKey=...`.
5. Mensagens do chat via `POST /messages`.
6. Painel de erros via `GET /failures` + `PATCH /failures/:id`.
