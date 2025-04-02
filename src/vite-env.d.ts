/// <reference types="vite/client" />

interface Window {
  __TAURI__?: {
    shell: {
      open: (url: string) => Promise<void>;
    };
    clipboard: {
      readText: () => Promise<string>;
      writeText: (text: string) => Promise<void>;
    };
  };
}
