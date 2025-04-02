import { ApiKeyProvider } from "../types/apiKey";

/**
 * Default key name suggestions for each provider
 * These are common environment variable names used for these APIs
 */
export const DEFAULT_KEY_NAMES: Record<ApiKeyProvider, string[]> = {
  OpenAI: [
    "OPENAI_API_KEY",
    "OPENAI_KEY",
    "OPENAI_SECRET_KEY",
    "GPT_API_KEY",
    "GPT_KEY",
  ],
  Google: [
    "GOOGLE_API_KEY",
    "GOOGLE_GEMINI_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_KEY",
    "GOOGLE_MAPS_API_KEY",
    "GOOGLE_CLOUD_API_KEY",
  ],
  Anthropic: [
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_KEY",
    "CLAUDE_API_KEY",
    "CLAUDE_KEY",
  ],
  AWS: [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_API_KEY",
    "AWS_BEDROCK_API_KEY",
  ],
  Azure: [
    "AZURE_API_KEY",
    "AZURE_OPENAI_API_KEY",
    "AZURE_COGNITIVE_SERVICES_KEY",
    "MICROSOFT_API_KEY",
    "MICROSOFT_AZURE_API_KEY",
  ],
  HuggingFace: [
    "HUGGINGFACE_API_KEY",
    "HUGGINGFACE_KEY",
    "HF_API_KEY",
    "HF_KEY",
  ],
  Other: ["API_KEY", "SECRET_KEY", "AUTH_TOKEN"],
};

/**
 * Get a default key name for a provider
 * @param provider The API provider
 * @param index Optional index to get a specific name (defaults to first)
 * @returns A default key name
 */
export function getDefaultKeyName(
  provider: ApiKeyProvider,
  index: number = 0
): string {
  const names = DEFAULT_KEY_NAMES[provider];
  return names[index % names.length];
}

/**
 * Get a rotated default key name for a provider
 * This is useful when creating multiple keys for the same provider
 * @param provider The API provider
 * @param existingNames Existing key names to avoid duplicates
 * @returns A key name that doesn't exist in the list
 */
export function getUniqueKeyName(
  provider: ApiKeyProvider,
  existingNames: string[] = []
): string {
  const names = DEFAULT_KEY_NAMES[provider];

  // Try each default name first
  for (const name of names) {
    if (!existingNames.includes(name)) {
      return name;
    }
  }

  // If all default names are taken, append a number
  let counter = 1;
  while (true) {
    const newName = `${names[0]}_${counter}`;
    if (!existingNames.includes(newName)) {
      return newName;
    }
    counter++;
  }
}
