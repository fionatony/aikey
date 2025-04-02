# AI Key Manager - Tauri Version

A desktop application for managing AI API keys built with Tauri, Vite, and React.

## Features

- Import API keys from various formats (.env, .json, .csv)
- Export API keys to different formats
- Securely store and manage your API keys
- Light and dark mode support
- Cross-platform (Windows, macOS, Linux)

## API Key Detection and Categorization

The application can extract and categorize API keys from various file formats (.txt, .env, .json, etc.). It uses the following rules:

### Key Extraction Rules

Valid Key-Value formats that are detected:
- `key = value`
- `key = "value"` (including quoted values)
- `key : value`

Invalid formats that are ignored:
- Lines without `=` or `:` as a key-value separator
- Lines missing a key or value
- Lines using dots (`.`) as separators (e.g., `key.value`)
- Lines with special characters in the key name

### Provider Auto-Detection

The system can automatically detect and categorize API keys based on patterns in the key name or value:

- **OpenAI**: Keys containing "openai", "gpt", or values starting with "sk-"
- **Google**: Keys containing "google", "gcp", "gemini", or "api_key"
- **Anthropic**: Keys containing "claude" or "anthropic"
- **Microsoft Azure**: Keys containing "azure", "microsoft", or "cognitive"
- **Hugging Face**: Keys containing "huggingface" or values starting with "hf_"
- **AWS**: Keys containing "aws" or values matching AWS key patterns
- **Cohere**: Keys containing "cohere"

Keys that don't match any of these patterns are categorized as "Other".

### Testing

To test the API key extraction functionality:
1. Create a text file with sample API keys
2. Import the file using the "Import" button
3. Review the detected keys and their categorization in the table

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

### Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run tauri dev
```

### Building

To build the application for production:

```bash
npm run tauri build
```

## Technologies Used

- [Tauri](https://tauri.app/) - Lightweight, secure desktop apps with web frontend
- [React](https://reactjs.org/) - UI framework
- [Vite](https://vitejs.dev/) - Frontend build tool
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Material-UI](https://mui.com/) - React components
- [AG Grid](https://www.ag-grid.com/) - Data grid component
