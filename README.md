Service A (Gateway) — http://localhost:4000

POST /chat (X-Tenant-Id header) → returns { chatId }

GET /stream/:chatId → SSE streaming of assistant reply (events: chunk, done)

GET /history → per-tenant in-memory messages

Service B (Responder) — http://localhost:4001

POST /respond → returns { reply, metadata? }

Provider selected by provider param or RESPONDER_DEFAULT_PROVIDER env

UI — served by Vite dev server (default http://localhost:5173)
