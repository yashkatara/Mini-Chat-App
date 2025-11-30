import axios from "axios";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { addListener, appendChunk, createChat, deleteChat } from "./chatManager.js";
import type { Message } from "./types.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const RESPONDER_URL = process.env.RESPONDER_URL || "http://localhost:4001/respond";
const MAX_HISTORY = Number(process.env.MAX_HISTORY || 50);

// In-memory per-tenant history: Map<tenantId, Message[]>
const history = new Map<string, Message[]>();

function logWithTenant(tenantId: string, ...args: any[]) {
  console.log(`[tenant=${tenantId}]`, ...args);
}

function pushMessage(msg: Message) {
  const arr = history.get(msg.tenantId) || [];
  
  arr.push(msg);
  // keep last N
  if (arr.length > MAX_HISTORY) arr.splice(0, arr.length - MAX_HISTORY);
  history.set(msg.tenantId, arr);
}


app.post("/chat", async (req, res) => {
  const tenantId = (req.header("X-Tenant-Id") || "default").toString();
  const { text, provider, slow } = req.body as { text: string; provider?: string; slow?: boolean };

  if (!text || typeof text !== "string") return res.status(400).json({ error: "text required" });

  logWithTenant(tenantId, "received chat:", text);

  // store user message
  const userMsg: Message = {
    id: uuidv4(),
    tenantId,
    sender: "user",
    text,
    timestamp: new Date().toISOString(),
  };
  pushMessage(userMsg);

  // create job
  const chatId = uuidv4();
  createChat(chatId);

 
  res.json({ chatId });

  
  (async () => {
    try {
      const r = await axios.post(RESPONDER_URL, { tenantId, text, provider, slow });
      const { reply, metadata } = r.data as { reply: string; metadata?: Record<string, any> };

      
      const assistantMsg: Message = {
        id: uuidv4(),
        tenantId,
        sender: "assistant",
        text: reply,
        timestamp: new Date().toISOString(),
        metadata, 
      };

      
      const chunks = chunkTextForStreaming(reply);

      for (const c of chunks) {
        appendChunk(chatId, { type: "chunk", data: c });
        
        await sleep(150 + Math.random() * 150);
      }
      // mark done
      appendChunk(chatId, { type: "done" });
      // store assistant message after full streaming
      pushMessage(assistantMsg);
      // cleanup job a little later
      setTimeout(() => deleteChat(chatId), 1000 * 60 * 5);
    } catch (err) {
      console.error("Gateway error calling responder:", err || err);
      appendChunk(chatId, { type: "chunk", data: "[error from responder]" });
      appendChunk(chatId, { type: "done" });
    }
  })();
});


app.get("/stream/:chatId", (req, res) => {
  const { chatId } = req.params;
  const tenantId = (req.header("X-Tenant-Id") || "default").toString();
  logWithTenant(tenantId, `SSE connect for chat ${chatId}`);
 res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Tenant-Id");
  
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  
  addListener(chatId, res);

  
  req.on("close", () => {
    logWithTenant(tenantId, `SSE connection closed for chat ${chatId}`);
  });
});


app.get("/history", (req, res) => {
  const tenantId = (req.header("X-Tenant-Id") || "default").toString();
  const arr = history.get(tenantId) || [];
  res.json({ tenantId, messages: arr });
});

/** Helpers */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunkTextForStreaming(text: string): string[] {
  // Prefer sentence splitting
  const sentences = text.match(/[^.!?]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) ?? [];
  if (sentences.length >= 2) return sentences;
  // fallback: split into small word groups (e.g., 6 words)
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  const group = 6;
  for (let i = 0; i < words.length; i += group) {
    chunks.push(words.slice(i, i + group).join(" "));
  }
  return chunks.length ? chunks : [text];
}

app.listen(PORT, () => {
  console.log(`Gateway listening on ${PORT}, responder=${RESPONDER_URL}`);
  console.log(`Use X-Tenant-Id header to separate tenants (default if missing)`);
});
