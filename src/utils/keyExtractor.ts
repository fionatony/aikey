import { ApiKey, ApiKeyProvider } from "../types/apiKey";

/**
 * Pattern type for key matching
 */
type PatternRule = {
  key?: RegExp;
  value?: RegExp;
};

/**
 * Provider identification patterns for categorizing API keys
 */
export const PROVIDER_PATTERNS: Record<string, PatternRule[]> = {
  OpenAI: [
    { key: /openai/i, value: /^sk-[^a-z]/ },
    { key: /gpt/i },
    { key: /^OPENAI_API_KEY$/i },
  ],
  Google: [
    { key: /google/i },
    { key: /gcp/i },
    { key: /gemini/i },
    { key: /^GOOGLE_API_KEY$/i },
    { key: /^API_KEY$/i },
  ],
  Anthropic: [
    { key: /anthropic/i },
    { key: /claude/i },
    { value: /^sk-ant-/ },
    { key: /^ANTHROPIC_API_KEY$/i },
  ],
  Azure: [
    { key: /azure/i },
    { key: /microsoft/i },
    { key: /cognitive/i },
    { key: /^AZURE_/i },
  ],
  HuggingFace: [
    { key: /hugg?ingface/i },
    { key: /hf_/i },
    { key: /^HF_API_KEY$/i },
  ],
  AWS: [
    { key: /aws/i },
    { key: /amazon/i },
    { key: /^AWS_/i },
    { value: /^AKIA[0-9A-Z]{16}$/ },
  ],
};

/**
 * Determines the likely provider of an API key based on key name and value
 */
export const detectProvider = (
  keyName: string,
  keyValue: string
): ApiKeyProvider => {
  for (const [provider, patterns] of Object.entries(PROVIDER_PATTERNS)) {
    for (const pattern of patterns) {
      if (
        (pattern.key && pattern.key.test(keyName)) ||
        (pattern.value && pattern.value.test(keyValue))
      ) {
        return provider as ApiKeyProvider;
      }
    }
  }
  return "Other";
};

/**
 * Extract key-value pairs from a line of text
 */
export const extractKeyValuePair = (
  line: string
): { key: string; value: string } | null => {
  line = line.trim();

  // Skip comments and empty lines
  if (!line || line.startsWith("#") || line.startsWith("//")) {
    return null;
  }

  // Skip URLs with http:// or https://
  if (line.match(/^https?:\/\//i)) {
    return null;
  }

  // Try key = value format
  let match = line.match(/^([^=:]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();

    // Handle quoted values
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }

    return { key, value };
  }

  // Try key : value format
  match = line.match(/^([^:]+):(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();

    // Skip if this looks like a URL (http://, https://, or //example.com format)
    if (
      key.toLowerCase() === "http" ||
      key.toLowerCase() === "https" ||
      value.startsWith("//")
    ) {
      return null;
    }

    // Handle quoted values
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }

    return { key, value };
  }

  return null;
};

/**
 * Validates if a key is in an acceptable format
 */
export const isValidKeyFormat = (key: string): boolean => {
  // Reject keys with dot notation
  if (key.includes(".")) {
    return false;
  }

  // Reject keys with special characters that might indicate invalid formats
  if (/[\/\\#$%^&*()!@<>{}[\]|]/.test(key)) {
    return false;
  }

  return true;
};

/**
 * Extract and categorize API keys from file content
 */
export const extractAndCategorizeKeys = (content: string): ApiKey[] => {
  const lines = content.split(/\r?\n/);
  const keys: ApiKey[] = [];

  for (const line of lines) {
    const pair = extractKeyValuePair(line);

    if (pair && pair.key && pair.value) {
      // Skip keys with invalid formats
      if (!isValidKeyFormat(pair.key)) {
        continue;
      }

      const provider = detectProvider(pair.key, pair.value);

      keys.push({
        id: crypto.randomUUID(),
        name: pair.key,
        value: pair.value,
        provider,
        dateAdded: new Date().toISOString(),
        description: "",
      });
    }
  }

  return keys;
};

/**
 * Extract keys from multiple file formats
 */
export const extractKeysFromFile = (
  content: string,
  fileExtension: string
): ApiKey[] => {
  // For .env, .txt, and other simple formats, use the standard extractor
  if (
    [".env", ".txt", ".properties", ".conf", ".cfg", ".ini"].includes(
      fileExtension
    )
  ) {
    return extractAndCategorizeKeys(content);
  }

  // For JSON format, parse it first
  if (fileExtension === ".json") {
    try {
      const parsed = JSON.parse(content);

      // Handle array format
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "object" && item.name && item.value) {
              return {
                id: item.id || crypto.randomUUID(),
                name: item.name,
                value: item.value,
                provider:
                  item.provider || detectProvider(item.name, item.value),
                description: item.description || "",
                dateAdded: item.dateAdded || new Date().toISOString(),
                lastUsed: item.lastUsed,
              };
            }
            return null;
          })
          .filter(Boolean) as ApiKey[];
      }

      // Handle object format with key-value pairs
      return Object.entries(parsed).map(([key, value]) => {
        const strValue =
          typeof value === "string" ? value : JSON.stringify(value);
        return {
          id: crypto.randomUUID(),
          name: key,
          value: strValue,
          provider: detectProvider(key, strValue),
          dateAdded: new Date().toISOString(),
          description: "",
        };
      });
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return [];
    }
  }

  // Fallback to standard extractor for unknown formats
  return extractAndCategorizeKeys(content);
};
