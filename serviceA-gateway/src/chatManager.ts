

import { type Response } from "express";

type Chunk = { type: "chunk" | "done"; data?: string };

interface chat {
  chunks: Chunk[];
  listeners: Set<Response>;
}

const chats = new Map<string, chat>();

export function createChat(chatId: string) {
  chats.set(chatId, { chunks: [], listeners: new Set() });
}

export function appendChunk(chatId: string, chunk: Chunk) {
  const chat = chats.get(chatId);
  if (!chat) return;
  chat.chunks.push(chunk);
  
  for (const res of chat.listeners) {
    res.write(`event: ${chunk.type}\n`);
    res.write(`data: ${JSON.stringify(chunk.data ?? "")}\n\n`);
    if (chunk.type === "done") {
     
      try { res.end(); } catch (e) {}
      chat.listeners.delete(res);
    }
  }
}

export function addListener(chatId: string, res: Response) {
  const chat = chats.get(chatId);
  if (!chat) return;

  chat.listeners.add(res);

  for (const chunk of chat.chunks) {
    res.write(`event: ${chunk.type}\n`);
    res.write(`data: ${JSON.stringify(chunk.data ?? "")}\n\n`);
    if (chunk.type === "done") {
      try { res.end(); } catch (e) {}
      chat.listeners.delete(res);
      return;
    }
  }
}

export function deleteChat(chatId: string) {
  chats.delete(chatId);
}
