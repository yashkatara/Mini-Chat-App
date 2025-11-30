import React, { useEffect, useRef, useState } from "react";
import { t, type Lang } from "./i18n";

type Message = {
  id: string;
  tenantId: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  metadata?: Record<string, any>;
};

const GATEWAY = import.meta.env.VITE_GATEWAY_URL ?? "http://localhost:4000";

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [tenantId, setTenantId] = useState<string>("tenant-alpha");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    fetch(`${GATEWAY}/history`, { headers: { "X-Tenant-Id": tenantId } })
      .then(r => r.json())
      .then(d => setMessages(d.messages ?? []))
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => {
   
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function addLocalMessage(msg: Message) {
    setMessages(prev => [...prev, msg]);
  }

  async function handleSend() {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      tenantId,
      sender: "user",
      text,

      timestamp: new Date().toISOString()
    };
    addLocalMessage(userMsg);
    const body = { text, provider: undefined, slow: false };
    setText("");
   
    const resp = await fetch(`${GATEWAY}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tenant-Id": tenantId },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    const chatId = data.chatId;
    if (!chatId) return;

    
    setTyping(true);
    const es = new EventSource(`${GATEWAY}/stream/${chatId}`, { withCredentials: false });
    let assistantAccum = "";
    es.addEventListener("chunk", (ev: any) => {
      const d = JSON.parse(ev.data);
      assistantAccum += (assistantAccum ? " " : "") + d;
    
      setMessages(prev => {
       
        const last = prev[prev.length - 1];
        if (last && last.sender === "assistant" && last.metadata?.streaming) {
          const updated = [...prev];
          updated[updated.length - 1] = { ...last, text: assistantAccum, timestamp: new Date().toISOString(), metadata: { streaming: true } };
          return updated;
        } else {
          return [...prev, { id: crypto.randomUUID(), tenantId, sender: "assistant", text: assistantAccum, timestamp: new Date().toISOString(), metadata: { streaming: true } }];
        }
      });
    });
    es.addEventListener("done", () => {
  
      setMessages(prev => {
        const idx = prev.map(m => m.sender).lastIndexOf("assistant");
        if (idx >= 0) {
          const updated = [...prev];
          const m = updated[idx];
          updated[idx] = { ...m, metadata: { ...(m.metadata || {}), streaming: false } };
          return updated;
        }
        return prev;
      });
      setTyping(false);
      es.close();
    });
    es.onerror = () => {
      setTyping(false);
      es.close();
    };
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>{t(lang, "title")}</h1>
          <div className="small">{t(lang, "history")}: <span className="small">{tenantId}</span></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <label className="small" htmlFor="lang">{t(lang, "lang")}</label>
          <select id="lang" value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Language">
            <option value="en">EN</option>
            <option value="es">ES</option>
          </select>

          <label className="small" htmlFor="tenant">{t(lang, "tenantLabel")}</label>
          <select id="tenant" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            <option value="tenant-alpha">tenant-alpha</option>
            <option value="tenant-beta">tenant-beta</option>
            <option value="default">default</option>
          </select>
        </div>
      </div>

      <div className="box" style={{ marginTop: 12 }}>
        <div ref={listRef} className="messageList" role="log" aria-live="polite">
          {messages.map(m => (
            <div key={m.id} className={`msg ${m.sender === "user" ? "user" : "bot"}`} aria-label={`${m.sender} message`}>
              <div style={{ fontSize: 12 }} className="small">{m.sender} • {new Date(m.timestamp).toLocaleTimeString()}</div>
              <div>{m.text}</div>
            </div>
          ))}

          {typing && <div className="small">{t(lang, "typing")}</div>}
        </div>

        <div className="footer" role="form" aria-label="Send message">
          <input
            type="text"
            aria-label="Message input"
            className="focus-visible"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t(lang, "placeholder")}
          />
          <button onClick={handleSend} aria-label="Send button" className="focus-visible">{t(lang, "send")}</button>
        </div>
      </div>
    </div>
  );
}
