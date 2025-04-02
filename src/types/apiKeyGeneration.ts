import { ApiKeyProvider } from "./apiKey";

export interface ApiKeyProviderInfo {
  provider: ApiKeyProvider;
  name: string;
  websiteUrl: string;
  generateUrl: string;
  logoUrl?: string;
  authRequired: boolean;
  apiSupported: boolean;
  instructions: string[];
  keyPatterns: RegExp[];
}

export interface GenerationSession {
  id: string;
  providerId: ApiKeyProvider;
  startTime: string;
  status: "pending" | "completed" | "failed";
  keyDetected?: string;
  keyName?: string;
}

export type ClipboardMonitorStatus = "idle" | "monitoring" | "detected";
