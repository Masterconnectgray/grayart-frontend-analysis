# GrayArt — Plataforma Social Media

## O que é
Central de marketing e social media do Grupo Gray. Dashboard unificado para gestão de conteúdo, analytics, e publicação multi-canal.

## Stack
- React 19 + TypeScript + Vite
- Tailwind CSS
- Recharts (gráficos)
- dnd-kit (drag-n-drop)
- QRCode generation
- Proxy para Flow API (flowgray.com.br) e Evolution API

## Componentes principais (src/components/)
- AIVideoLab.tsx — laboratório de vídeo IA (Veo 3 + Kokoro TTS narração)
- PhotoAnalyzer.tsx — análise de foto com IA (MoonDream3 + Gemini laudo retoque)
- ContentCalendar.tsx — calendário de conteúdo
- FeedPreview.tsx — preview de feed Instagram
- InstagramIntegrations.tsx — integração Instagram
- MultiChannelPublisher.tsx — publicação multi-canal
- OperationsDashboard.tsx — dashboard operacional
- PlatformMonitor.tsx — monitor de plataformas
- SocialAnalytics.tsx — analytics social
- WhatsAppConnect.tsx — integração WhatsApp
- ReelsGenerator.tsx — gerador de reels

## Services (src/services/)
- FlowAPIService.ts — comunicação com Flow API
- GeminiService.ts — integração Gemini IA
- SocialOAuthService.ts — OAuth para redes sociais
- BFFClient.ts — cliente HTTP com auth JWT

## Backend (server/)
- Express.js porta 3065 (BFF principal)
- server/ai-service/ — microserviço Python FastAPI porta 3066 (Kokoro TTS + MoonDream3)
- server/routes/ai-service.ts — proxy Express → Python AI service

## Comandos
- `npm run dev` — dev server frontend
- `npm run server` — backend Express
- `npm run dev:all` — ambos em paralelo
- `cd server/ai-service && python main.py` — serviço IA Python (porta 3066)
- `npm run build` — tsc + vite build (gera dist/)

## Deploy
- Build com base '/grayart/'
- Deploy: flowgray.com.br/grayart no VPS

## Convenções
- Componentes React em PascalCase
- Services em camelCase
- Sem docstrings extras
