import { API_KEY_PROVIDERS } from "../shared/constants";

export type ApiKeyProvider = (typeof API_KEY_PROVIDERS)[number];

export interface ApiKey {
  id: string;
  name: string;
  value: string;
  provider: ApiKeyProvider;
  description: string;
  dateAdded: string; // ISO date string
  lastUsed?: string; // ISO date string
}
