# Gray Art - AI Social Publishing and Operations Platform

Gray Art is a full-stack product exploration for AI-assisted social publishing, media workflows, WhatsApp integration, and operations monitoring.

The repository combines a React/TypeScript frontend, an Express backend-for-frontend layer, and Python service experiments for AI and media processing. It is intended to show how social, AI, dashboard, and automation features can be organized into one operational product.

## What It Demonstrates

- Multi-channel publishing workflows for social platforms
- Social OAuth connection flows and credential management design
- WhatsApp connection and broadcast workflows through Evolution API paths
- AI-assisted copy, video, media, and content planning flows
- Operational dashboards, analytics, scheduling, and activity history
- A componentized React interface for a real business tool
- Express routes for BFF/API orchestration
- Python service experiments for AI/media capabilities
- PWA support through manifest and service worker files

## Stack

Frontend:

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- dnd-kit
- Lucide React

Backend:

- Node.js
- Express
- JWT authentication paths
- SQLite / database layer
- REST route organization
- Rate limiting and security middleware

AI and integrations:

- Gemini-oriented service paths
- Social OAuth flow design
- WhatsApp/Evolution API integration paths
- Media upload and publishing flows
- Python AI service folder

## Repository Structure

```text
src/
  components/
    common/
    content/
    dashboard/
    publisher/
    social/
    video/
    whatsapp/
  context/
  design-system/
  hooks/
  services/
server/
  routes/
  utils/
  database/
  ai-service/
docs/
public/
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Run the Express server:

```bash
npm run server
```

Run both:

```bash
npm run dev:all
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Environment

Use `.env.example` as the reference for local development placeholders.

Production credentials must stay server-side. OAuth client secrets, API keys, publishing tokens, WhatsApp keys, and AI provider keys should not be exposed through browser-readable variables.

Recommended production pattern:

1. Browser talks only to the application backend.
2. Backend stores and rotates sensitive credentials.
3. OAuth exchange happens server-side.
4. AI/video jobs are tracked as backend jobs.
5. Logs include trace IDs, status, duration, and failure reasons.

## Security Notes

This public repository should be treated as a portfolio snapshot, not a production deployment package.

Before using it as a polished public case study:

- Replace the default template README with this project README.
- Remove internal assistant notes that are not useful to external reviewers.
- Remove generated database artifacts and sample uploads unless they are explicitly documented fixtures.
- Add a license.
- Add screenshots or a short demo recording.
- Add a production architecture diagram.
- Keep real credentials out of git.

## Portfolio Summary

Gray Art shows full-stack product engineering around a real operational problem: coordinating AI-assisted content creation, social publishing, WhatsApp communication, and business dashboard visibility in one interface.

The strongest engineering signals are the breadth of integrations, the BFF direction for sensitive workflows, the domain-specific UI components, and the focus on turning marketing operations into repeatable software processes.
