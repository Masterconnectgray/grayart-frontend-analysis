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
- AIVideoLab.tsx — laboratório de vídeo IA
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

## Comandos
- `npm run dev` — dev server
- `npm run build` — tsc + vite build (gera dist/)

## Deploy
- Build com base '/grayart/'
- Deploy: flowgray.com.br/grayart no VPS

## Convenções
- Componentes React em PascalCase
- Services em camelCase
- Sem docstrings extras
