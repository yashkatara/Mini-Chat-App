export type Sender = "user" | "assistant";

export interface Message {
  id: string;
  tenantId: string;
  sender: Sender;
  text: string;
  timestamp: string;

  metadata?: Record<string, any> | undefined;
}
