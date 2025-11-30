import express from "express";
import bodyParser from "body-parser";
import { EchoEngine, RuleBasedEngine } from "./engines.js";
import type { ResponderRequest } from "./types.js";

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 4001;


const DEFAULT_PROVIDER = (process.env.RESPONDER_DEFAULT_PROVIDER as any) || "rule";

const engines = {
  echo: new EchoEngine(),
  rule: new RuleBasedEngine(),
};

function selectEngine(name?: string) {
  const n = (name || DEFAULT_PROVIDER) as keyof typeof engines;
  return engines[n] || engines.rule;
}


app.post("/respond", async (req, res) => {
  const body = req.body as ResponderRequest;
  if (!body || !body.tenantId || !body.text) {
    return res.status(400).json({ error: "tenantId and text are required" });
  }

  const engine = selectEngine(body.provider);
  try {
    const reply = await engine.reply(body.text, body.tenantId, !!body.slow);
    
    return res.json({
      provider: engine.name,
      reply,
     
      metadata: { providedBy: engine.name, wordCount: reply.split(/\s+/).length },
    });
  } catch (err) {
    console.error("Responder error:", err);
    return res.status(500).json({ error: "responder error" });
  }
});

app.listen(PORT, () => {
  console.log(`Responder listening on ${PORT}, default provider=${DEFAULT_PROVIDER}`);
});
