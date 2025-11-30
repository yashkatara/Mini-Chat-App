import type { ProviderName } from "./types.js";

/**
 * Chat engine abstraction:
 * given text + tenantId produce a reply string.
 */
export interface ChatEngine {
  name: ProviderName;
  reply(text: string, tenantId: string, slow?: boolean): Promise<string>;
}


export class EchoEngine implements ChatEngine {
  name: ProviderName = "echo";
  async reply(text: string): Promise<string> {
 
    const reversed = text.split(" ").reverse().join(" ");
    return `Echo: ${reversed}`;
  }
}

/** Rule-based engine: simple keyword responses */
export class RuleBasedEngine implements ChatEngine {
  name: ProviderName = "rule";
  async reply(text: string, tenantId: string, slow = false): Promise<string> {
    const t = text.toLowerCase();
    if (t.includes("hello") || t.includes("hi"))
      return "Hi! How can I help you today?";
    if (t.includes("time"))
      return `Current server time is ${new Date().toLocaleString()}`;
    if (t.includes("tenant"))
      return `You are talking under tenant: ${tenantId}.`;
    // slow option -> return a longer paragraph to allow Gateway chunking demonstration
    if (slow) {
      return [
        "This is a longer slow-mode reply meant to demonstrate streaming.",
        "It contains multiple sentences so the Gateway can chunk and stream them.",
        "You can use this for testing how client shows 'typing...'",
      ].join(" ");
    }
    
    return "Sorry, I don't have a rule for that. Try saying 'hello' or ask for the time.";
  }
}
