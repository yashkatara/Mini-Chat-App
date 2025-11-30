export type ProviderName = "echo" | "rule";

export interface ResponderRequest {
  tenantId: string;
  text: string;
  provider?: ProviderName;
  slow?: boolean; 
}
