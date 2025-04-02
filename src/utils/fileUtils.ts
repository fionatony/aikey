import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  appConfigDir,
  appLocalDataDir,
  resolve,
  join,
} from "@tauri-apps/api/path";
import { ApiKey } from "../types/apiKey";
import { FILE_FORMATS } from "../shared/constants";
import { extractKeysFromFile, extractAndCategorizeKeys } from "./keyExtractor";

// Get the file extension
export const getFileExtension = (filePath: string): string => {
  const parts = filePath.split(".");
  if (parts.length < 2) return "";
  return `.${parts[parts.length - 1].toLowerCase()}`;
};

// Detect file format based on extension
export const detectFileFormat = (filePath: string) => {
  const extension = getFileExtension(filePath);
  const matchedFormat = FILE_FORMATS.find(
    (format) => format.extension === extension
  );

  // If no specific format is found, return the "Any File" format as fallback
  if (!matchedFormat) {
    return FILE_FORMATS.find((format) => format.extension === "*");
  }

  return matchedFormat;
};

// Open file dialog and return the selected file path
export const openFileDialog = async (): Promise<string[]> => {
  const filters = [
    { name: "Key Files", extensions: ["key"] },
    { name: "All Files", extensions: ["*"] },
    ...FILE_FORMATS.map((format) => ({
      name: format.name,
      extensions: [format.extension.substring(1)],
    })),
  ];

  const selected = await open({
    filters,
    multiple: false,
  });

  return selected ? (Array.isArray(selected) ? selected : [selected]) : [];
};

// Open key file dialog specifically for .key files
export const openKeyFileDialog = async (): Promise<string[]> => {
  const filters = [{ name: "Key Files", extensions: ["key"] }];

  const selected = await open({
    filters,
    multiple: false,
  });

  return selected ? (Array.isArray(selected) ? selected : [selected]) : [];
};

// Read file content
export const readFile = async (filePath: string): Promise<string> => {
  return await invoke<string>("read_file", { filePath });
};

// Save file dialog
export const saveFileDialog = async (
  content: string,
  defaultDir?: string
): Promise<boolean> => {
  const filters = FILE_FORMATS.map((format) => ({
    name: format.name,
    extensions: [format.extension.substring(1)],
  }));

  const filePath = await save({
    filters,
    defaultPath: defaultDir ? `${defaultDir}\\` : undefined,
  });

  if (filePath) {
    return await invoke<boolean>("save_file", { filePath, content });
  }
  return false;
};

// Get path to the executable directory
export const getAppDirectory = async (): Promise<string> => {
  try {
    // For Tauri 2.0, we'll use the app config directory
    const dir = await appConfigDir();
    return dir;
  } catch (error) {
    console.error("Error getting app directory:", error);
    return ".";
  }
};

// Get the default key file path
export const getDefaultKeyFilePath = async (): Promise<string> => {
  const appDir = await appLocalDataDir();
  return await join(appDir, "default.key");
};

// Save keys to the default key file
export const saveToDefaultKeyFile = async (
  keys: ApiKey[]
): Promise<boolean> => {
  try {
    const defaultKeyPath = await getDefaultKeyFilePath();
    const content = JSON.stringify(keys, null, 2);
    return await invoke<boolean>("save_file", {
      filePath: defaultKeyPath,
      content,
    });
  } catch (error) {
    console.error("Error saving to default key file:", error);
    return false;
  }
};

// Save keys to a specific key file path
export const saveToKeyFile = async (
  keys: ApiKey[],
  filePath: string
): Promise<boolean> => {
  try {
    const content = JSON.stringify(keys, null, 2);
    return await invoke<boolean>("save_file", {
      filePath,
      content,
    });
  } catch (error) {
    console.error(`Error saving to key file ${filePath}:`, error);
    return false;
  }
};

// Load keys from a key file
export const loadFromKeyFile = async (filePath: string): Promise<ApiKey[]> => {
  try {
    const content = await readFile(filePath);
    return parseKeyFile(content);
  } catch (error) {
    console.error(`Error loading from key file ${filePath}:`, error);
    return [];
  }
};

// Load keys from the default key file
export const loadFromDefaultKeyFile = async (): Promise<ApiKey[]> => {
  try {
    const defaultKeyPath = await getDefaultKeyFilePath();
    const fileExists = await invoke<boolean>("file_exists", {
      filePath: defaultKeyPath,
    });

    if (!fileExists) {
      console.log("Default key file does not exist yet");
      return [];
    }

    return await loadFromKeyFile(defaultKeyPath);
  } catch (error) {
    console.error("Error loading from default key file:", error);
    return [];
  }
};

// Parse .env file content into ApiKey objects
export const parseEnvFile = (content: string): ApiKey[] => {
  return extractKeysFromFile(content, ".env");
};

// Parse JSON file content into ApiKey objects
export const parseJsonFile = (content: string): ApiKey[] => {
  return extractKeysFromFile(content, ".json");
};

// Parse .key file content into ApiKey objects
export const parseKeyFile = (content: string): ApiKey[] => {
  try {
    const parsed = JSON.parse(content);

    // If it's already in the right format (array of ApiKey objects)
    if (Array.isArray(parsed) && parsed.length > 0 && "id" in parsed[0]) {
      return parsed;
    }

    // Otherwise, treat it as a regular JSON file
    return parseJsonFile(content);
  } catch (error) {
    console.error("Error parsing key file:", error);
    return [];
  }
};

// Parse CSV file content into ApiKey objects
export const parseCsvFile = (content: string): ApiKey[] => {
  const lines = content.split("\n");
  const keys: ApiKey[] = [];

  if (lines.length < 2) return keys;

  // Assume first line is header
  const header = lines[0].split(",").map((h) => h.trim());
  const nameIndex = header.findIndex(
    (h) => h.toLowerCase() === "name" || h.toLowerCase() === "key"
  );
  const valueIndex = header.findIndex(
    (h) => h.toLowerCase() === "value" || h.toLowerCase() === "secret"
  );
  const providerIndex = header.findIndex(
    (h) => h.toLowerCase() === "provider" || h.toLowerCase() === "service"
  );

  if (nameIndex === -1 || valueIndex === -1) return keys;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim());

    if (values.length > Math.max(nameIndex, valueIndex)) {
      const name = values[nameIndex];
      const value = values[valueIndex];
      const explicitProvider =
        providerIndex !== -1 && values[providerIndex]
          ? values[providerIndex]
          : null;

      // Use the extractAndCategorizeKeys logic to determine provider if not explicitly defined
      const detectedProvider =
        explicitProvider ||
        (name && value
          ? extractAndCategorizeKeys(`${name}=${value}`)[0]?.provider
          : "Other");

      keys.push({
        id: crypto.randomUUID(),
        name,
        value,
        provider: detectedProvider as any,
        dateAdded: new Date().toISOString(),
        description: "", // Empty description instead of isActive
      });
    }
  }

  return keys;
};

// Parse plain text file content into ApiKey objects
export const parseTxtFile = (content: string): ApiKey[] => {
  return extractKeysFromFile(content, ".txt");
};

// Format API keys for export
export const formatApiKeysForExport = (
  keys: ApiKey[],
  format: (typeof FILE_FORMATS)[number]
): string => {
  switch (format.extension) {
    case ".key":
      return JSON.stringify(keys, null, 2);

    case ".env":
      return keys.map((key) => `${key.name}=${key.value}`).join("\n");

    case ".json":
      return JSON.stringify(keys, null, 2);

    case ".csv":
      const header = "name,value,provider,description,dateAdded,lastUsed";
      const rows = keys.map(
        (key) =>
          `${key.name},${key.value},${key.provider},${key.description || ""},${
            key.dateAdded
          },${key.lastUsed || ""}`
      );
      return [header, ...rows].join("\n");

    case ".txt":
      return keys.map((key) => `${key.name}: ${key.value}`).join("\n");

    default:
      return "";
  }
};

// Export file formats
export const fileFormats = FILE_FORMATS;

// Generate a unique filename for a new key file
export const generateUniqueKeyFilename = async (
  baseDir: string
): Promise<string> => {
  let counter = 1;
  let filename = `new_keys_${counter}.key`;
  let filePath = await join(baseDir, filename);

  while (await invoke<boolean>("file_exists", { filePath })) {
    counter++;
    filename = `new_keys_${counter}.key`;
    filePath = await join(baseDir, filename);
  }

  return filePath;
};
