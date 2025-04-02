import { readFile } from "./fileUtils";
import {
  extractAndCategorizeKeys,
  extractKeyValuePair,
  detectProvider,
  isValidKeyFormat,
} from "./keyExtractor";

/**
 * Simple test function to validate key extraction
 */
export const testKeyExtraction = async () => {
  try {
    // Read the test file
    const content = await readFile("./test-keys.txt");

    // Extract keys
    const keys = extractAndCategorizeKeys(content);

    // Log the results
    console.log("Extracted keys:", keys.length);
    console.log("Keys by provider:");

    // Group by provider
    const keysByProvider: Record<string, number> = {};
    keys.forEach((key) => {
      keysByProvider[key.provider] = (keysByProvider[key.provider] || 0) + 1;
    });

    Object.entries(keysByProvider).forEach(([provider, count]) => {
      console.log(`- ${provider}: ${count} keys`);
    });

    // Print details for each key
    keys.forEach((key) => {
      console.log(`Key: ${key.name}`);
      console.log(`Value: ${key.value.substring(0, 5)}...`);
      console.log(`Provider: ${key.provider}`);
      console.log("---");
    });

    // Verify keys that should be ignored
    const invalidKeys = [
      "INVALID.KEY",
      "INVALID/KEY",
      "COMMENTS_IGNORED",
      "KEY_WITHOUT_VALUE",
      "VALUE_WITHOUT_KEY",
    ];

    const foundInvalidKeys = keys.filter((key) =>
      invalidKeys.includes(key.name)
    );
    if (foundInvalidKeys.length > 0) {
      console.warn(
        "Found keys that should have been ignored:",
        foundInvalidKeys.map((k) => k.name)
      );
    } else {
      console.log("All invalid keys were properly ignored.");
    }

    return keys;
  } catch (error) {
    console.error("Error testing key extraction:", error);
    return [];
  }
};

/**
 * Test individual key-value extraction
 */
export const testKeyValueExtraction = () => {
  const testCases = [
    { line: "KEY=value", expected: { key: "KEY", value: "value" } },
    {
      line: 'KEY="quoted value"',
      expected: { key: "KEY", value: "quoted value" },
    },
    { line: "KEY : value", expected: { key: "KEY", value: "value" } },
    { line: "KEY=", expected: { key: "KEY", value: "" } },
    { line: "=VALUE", expected: null },
    {
      line: "INVALID.KEY=value",
      expected: { key: "INVALID.KEY", value: "value" },
    },
    { line: "# Comment", expected: null },
    { line: "", expected: null },
  ];

  testCases.forEach(({ line, expected }) => {
    const result = extractKeyValuePair(line);
    if (JSON.stringify(result) !== JSON.stringify(expected)) {
      console.error(`Test failed for line "${line}"`);
      console.error(`Expected: ${JSON.stringify(expected)}`);
      console.error(`Got: ${JSON.stringify(result)}`);
    } else {
      console.log(`Test passed for line "${line}"`);
    }
  });
};

/**
 * Test provider detection
 */
export const testProviderDetection = () => {
  const testCases = [
    { key: "OPENAI_API_KEY", value: "sk-123456", expected: "OpenAI" },
    { key: "GPT_KEY", value: "anyvalue", expected: "OpenAI" },
    { key: "GOOGLE_API_KEY", value: "AIza123456", expected: "Google" },
    { key: "ANTHROPIC_API_KEY", value: "sk-ant-123456", expected: "Anthropic" },
    { key: "AZURE_KEY", value: "123456", expected: "Azure" },
    { key: "HUGGINGFACE_KEY", value: "hf_123456", expected: "HuggingFace" },
    { key: "AWS_ACCESS_KEY", value: "AKIAIOSFODNN7EXAMPLE", expected: "AWS" },
    { key: "COHERE_API_KEY", value: "123456", expected: "Cohere" },
    { key: "RANDOM_KEY", value: "123456", expected: "Other" },
  ];

  testCases.forEach(({ key, value, expected }) => {
    const result = detectProvider(key, value);
    if (result !== expected) {
      console.error(`Provider detection failed for ${key}`);
      console.error(`Expected: ${expected}`);
      console.error(`Got: ${result}`);
    } else {
      console.log(`Provider detection passed for ${key}`);
    }
  });
};

/**
 * Test key format validation
 */
export const testKeyFormatValidation = () => {
  const testCases = [
    { key: "VALID_KEY", expected: true },
    { key: "valid_key", expected: true },
    { key: "validKey123", expected: true },
    { key: "INVALID.KEY", expected: false },
    { key: "INVALID/KEY", expected: false },
    { key: "INVALID#KEY", expected: false },
    { key: "INVALID@KEY", expected: false },
    { key: "INVALID[KEY]", expected: false },
  ];

  testCases.forEach(({ key, expected }) => {
    const result = isValidKeyFormat(key);
    if (result !== expected) {
      console.error(`Key format validation failed for "${key}"`);
      console.error(`Expected: ${expected}`);
      console.error(`Got: ${result}`);
    } else {
      console.log(`Key format validation passed for "${key}"`);
    }
  });
};
