/**
 * Opens a URL in the system's default browser
 * This leverages Tauri's shell open capability
 *
 * @param url The URL to open
 * @returns Promise that resolves when the URL is opened
 */
export async function openInBrowser(url: string): Promise<void> {
  try {
    // If using Tauri, use its shell open capability
    // This requires the shell capability to be configured
    if (window.__TAURI__) {
      await window.__TAURI__.shell.open(url);
    } else {
      // Fallback for non-Tauri environments (like browser testing)
      window.open(url, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    console.error("Failed to open URL:", url, error);
    throw error;
  }
}
