import { API_KEY_PROVIDER_INFO } from "../shared/apiKeyProviders";
import { ApiKeyProvider } from "../types/apiKey";

/**
 * Monitors clipboard for API keys
 */
export class ClipboardMonitor {
  private intervalId: number | null = null;
  private lastClipboardValue: string = "";
  private providerFilter: ApiKeyProvider | null = null;
  private onKeyDetectedCallback:
    | ((text: string, provider: ApiKeyProvider) => void)
    | null = null;

  /**
   * Start monitoring clipboard for API keys
   * @param provider Optional provider to filter key patterns
   * @param onKeyDetected Callback for when a key is detected
   * @param intervalMs How often to check clipboard (ms)
   */
  public start(
    provider: ApiKeyProvider | null,
    onKeyDetected: (text: string, provider: ApiKeyProvider) => void,
    intervalMs: number = 1000
  ): void {
    this.providerFilter = provider;
    this.onKeyDetectedCallback = onKeyDetected;

    // Read current clipboard value to avoid detecting pre-existing content
    this.readClipboard().then((value) => {
      this.lastClipboardValue = value || "";

      // Start monitoring interval
      this.intervalId = window.setInterval(() => {
        this.checkClipboard();
      }, intervalMs);
    });
  }

  /**
   * Stop monitoring clipboard
   */
  public stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.onKeyDetectedCallback = null;
  }

  /**
   * Get clipboard text content
   */
  private async readClipboard(): Promise<string> {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.error("Failed to read clipboard:", error);
      return "";
    }
  }

  /**
   * Check clipboard for API keys
   */
  private async checkClipboard(): Promise<void> {
    const clipboardText = await this.readClipboard();

    // Skip if clipboard is empty or unchanged
    if (!clipboardText || clipboardText === this.lastClipboardValue) {
      return;
    }

    this.lastClipboardValue = clipboardText;

    // Check if the clipboard content matches any API key pattern
    const matchedProvider = this.detectApiKey(clipboardText);
    if (matchedProvider && this.onKeyDetectedCallback) {
      this.onKeyDetectedCallback(clipboardText, matchedProvider);
    }
  }

  /**
   * Detect if text contains an API key
   * @param text Text to check for API key patterns
   * @returns Provider if a key is detected, null otherwise
   */
  private detectApiKey(text: string): ApiKeyProvider | null {
    // Clean up the text (remove whitespace, quotes, etc.)
    const cleanText = text.trim().replace(/["']/g, "");

    // If a provider filter is set, only check patterns for that provider
    if (this.providerFilter) {
      const providerInfo = API_KEY_PROVIDER_INFO[this.providerFilter];
      if (
        providerInfo &&
        this.matchesAnyPattern(cleanText, providerInfo.keyPatterns)
      ) {
        return this.providerFilter;
      }
      return null;
    }

    // Otherwise, check patterns for all providers
    for (const [providerKey, providerInfo] of Object.entries(
      API_KEY_PROVIDER_INFO
    )) {
      if (this.matchesAnyPattern(cleanText, providerInfo.keyPatterns)) {
        return providerKey as ApiKeyProvider;
      }
    }

    return null;
  }

  /**
   * Check if text matches any of the given patterns
   */
  private matchesAnyPattern(text: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
  }
}
