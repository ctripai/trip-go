Vue SPA for /chat

- Dev: cd vue-chat && npm install && npm run dev
- Build (output -> Next public): cd vue-chat && npm install && npm run build

Notes:
- Build output is placed in `public/chat` so the chat is accessible at `/chat` when served by Next.js or Vercel static hosting.
- Uses the existing Next API endpoints `/api/stream` and `/api/deepseek` for streaming and fallback.
