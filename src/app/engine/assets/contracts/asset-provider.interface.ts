/**
 * Universal Port interface for retrieving raw asset data.
 * Adheres to Hexagonal Architecture: engine depends on this SPI,
 * infrastructure provides concrete implementations (HTTP, FileSystem, In-Memory).
 * Zero Angular HttpClient, zero DOM fetch.
 */
export interface AssetProvider {
  /**
   * Loads and parses a JSON asset by URI or path.
   */
  loadJson<T = unknown>(uri: string): Promise<T>;

  /**
   * Loads a raw text asset (Markdown, GFM, DSL script, Shader source).
   */
  loadText(uri: string): Promise<string>;

  /**
   * Loads binary content (images, audio buffers, binary scene payloads).
   */
  loadBinary(uri: string): Promise<ArrayBuffer>;

  /**
   * Checks whether an asset exists at the specified URI.
   */
  exists(uri: string): Promise<boolean>;
}
