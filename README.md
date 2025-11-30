# Mini Chat

This repo contains three parts:

* `/serviceA-gateway` — Gateway (Node + TypeScript + Express). Exposes HTTP API for UI and SSE streaming, keeps per-tenant in-memory history, orchestrates calls to Responder.
* `/serviceB-responder` — Responder (Node + TypeScript + Express). Implements ChatEngine abstraction with two providers (EchoEngine, RuleBasedEngine), supports optional slow mode.
* `/ui` — React + TypeScript + Vite single-page UI. Shows tenant, i18n toggle, accessible controls, message list, and SSE streaming of assistant replies.

---

## Quick start (development)

Requirements: Node 18+, npm/yarn.

1. From repository root:

```bash
# install top-level dependencies if you want (not required)
# start service-b first
cd service-b-responder
npm install
npm run dev

# in another terminal
cd ../service-a-gateway
npm install
npm run dev

# in another terminal
cd ../ui
npm install
npm run dev
```

* Gateway default: [http://localhost:4000](http://localhost:4000)
* Responder default: [http://localhost:4001](http://localhost:4001)
* UI default (Vite): [http://localhost:5173](http://localhost:5173)



---

## Architecture (short)

* UI → Service A (Gateway)

  * Sends message POST (with header `x-tenant-id`), receives immediate 200, and opens SSE `/stream/:tenantId/:conversationId` to receive assistant chunks.
* Service A → Service B (Responder)

  * Gateway calls Responder `/respond` with `{ message, tenantId, conversationId }`. Responder returns the full reply string. Gateway chunks it and emits SSE events to the browser while saving history per tenant (in-memory).

This keeps clear boundaries: Gateway owns HTTP + SSE + multi-tenant history; Responder owns reply-generation engines.

---

## Multi-tenant design

* Tenant is passed in header `X-Tenant-Id` from UI (hard-coded in UI for demo). Gateway stores `Map<string, Message[]>` in memory.
* Message model initially: `{ id, tenantId, role: 'user' | 'assistant', text, timestamp }`.
* Evolved model adds optional `metadata?: Record<string, any>` while keeping all existing fields optional or present. Gateway & UI handle missing metadata gracefully.

---


