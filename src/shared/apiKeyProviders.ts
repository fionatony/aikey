import { ApiKeyProviderInfo } from "../types/apiKeyGeneration";

// Provider information including generation URLs and instructions
export const API_KEY_PROVIDER_INFO: Record<string, ApiKeyProviderInfo> = {
  OpenAI: {
    provider: "OpenAI",
    name: "OpenAI",
    websiteUrl: "https://openai.com",
    generateUrl: "https://platform.openai.com/api-keys",
    authRequired: true,
    apiSupported: true,
    instructions: [
      "Sign in to your OpenAI account",
      "Click '+ Create new secret key'",
      "Give your key a name (optional)",
      "Copy the key immediately (it won't be shown again)",
    ],
    keyPatterns: [/^sk-[A-Za-z0-9]{48}$/],
  },

  Google: {
    provider: "Google",
    name: "Google AI / Gemini",
    websiteUrl: "https://ai.google.dev/",
    generateUrl: "https://makersuite.google.com/app/apikey",
    authRequired: true,
    apiSupported: true,
    instructions: [
      "Sign in to your Google account",
      "Navigate to the API Keys section",
      "Click 'Create API Key'",
      "Copy your new API key",
    ],
    keyPatterns: [/^AIza[A-Za-z0-9_-]{35}$/],
  },

  Anthropic: {
    provider: "Anthropic",
    name: "Anthropic (Claude)",
    websiteUrl: "https://anthropic.com",
    generateUrl: "https://console.anthropic.com/keys",
    authRequired: true,
    apiSupported: false,
    instructions: [
      "Sign in to your Anthropic account",
      "Go to the API Keys section",
      "Click 'Create Key'",
      "Name your key and set expiration if needed",
      "Copy your new API key",
    ],
    keyPatterns: [/^sk-ant-[A-Za-z0-9]{48}$/],
  },

  AWS: {
    provider: "AWS",
    name: "Amazon Web Services",
    websiteUrl: "https://aws.amazon.com",
    generateUrl:
      "https://console.aws.amazon.com/iam/home#/security_credentials",
    authRequired: true,
    apiSupported: false,
    instructions: [
      "Sign in to your AWS account",
      "Navigate to Security Credentials",
      "Under 'Access keys', click 'Create New Access Key'",
      "Download or copy both the Access Key ID and Secret Access Key",
    ],
    keyPatterns: [/^AKIA[A-Z0-9]{16}$/],
  },

  Azure: {
    provider: "Azure",
    name: "Microsoft Azure",
    websiteUrl: "https://azure.microsoft.com",
    generateUrl:
      "https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/overview",
    authRequired: true,
    apiSupported: false,
    instructions: [
      "Sign in to Azure Portal",
      "Navigate to Cognitive Services or Azure AI services",
      "Select your resource",
      "Go to 'Keys and Endpoint' section",
      "Copy KEY 1 or KEY 2",
    ],
    keyPatterns: [/^[a-f0-9]{32}$/i],
  },

  HuggingFace: {
    provider: "HuggingFace",
    name: "Hugging Face",
    websiteUrl: "https://huggingface.co",
    generateUrl: "https://huggingface.co/settings/tokens",
    authRequired: true,
    apiSupported: false,
    instructions: [
      "Log in to your Hugging Face account",
      "Go to Settings > Access Tokens",
      "Click 'New token'",
      "Name your token and select permissions",
      "Click 'Generate a token' and copy it",
    ],
    keyPatterns: [/^hf_[A-Za-z0-9]{34}$/],
  },

  Other: {
    provider: "Other",
    name: "Other Provider",
    websiteUrl: "",
    generateUrl: "",
    authRequired: false,
    apiSupported: false,
    instructions: [
      "Navigate to your provider's API key management page",
      "Follow their process to generate a new API key",
      "Copy the key when provided",
    ],
    keyPatterns: [/.+/], // Any non-empty string
  },
};
