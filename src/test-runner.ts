// Simple test runner for API key extraction functionality
import {
  testKeyExtraction,
  testKeyValueExtraction,
  testProviderDetection,
  testKeyFormatValidation,
} from "./utils/keyExtractor.test";

// Run tests sequentially
const runTests = async () => {
  console.log("=== Testing Key Value Extraction ===");
  testKeyValueExtraction();

  console.log("\n=== Testing Key Format Validation ===");
  testKeyFormatValidation();

  console.log("\n=== Testing Provider Detection ===");
  testProviderDetection();

  console.log("\n=== Testing Full Key Extraction ===");
  await testKeyExtraction();

  console.log("\n=== All tests completed ===");
};

// Export for use with Tauri commands
export { runTests };
