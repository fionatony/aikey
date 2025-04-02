// Application-wide constants

// Default window dimensions
export const DEFAULT_WINDOW_WIDTH = 1200;
export const DEFAULT_WINDOW_HEIGHT = 800;

// API Key providers
export const API_KEY_PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "Google",
  "AWS",
  "Azure",
  "HuggingFace",
  "Other",
] as const;

// File formats
export const FILE_FORMATS = [
  { name: "Key File", extension: ".key", mimeType: "application/json" },
  { name: "Environment File", extension: ".env", mimeType: "text/plain" },
  { name: "JSON", extension: ".json", mimeType: "application/json" },
  { name: "CSV", extension: ".csv", mimeType: "text/csv" },
  { name: "Text File", extension: ".txt", mimeType: "text/plain" },
  { name: "Any File", extension: "*", mimeType: "text/plain" },
] as const;

// Application name
export const APP_NAME = "AI Key Manager";
