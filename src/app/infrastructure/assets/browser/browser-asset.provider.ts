import { AssetProvider } from '../../../engine/assets/contracts/asset-provider.interface';

export interface BrowserAssetProviderOptions {
  readonly basePath?: string;
  readonly fetchFn?: typeof fetch;
}

export class BrowserAssetProvider implements AssetProvider {
  private readonly _basePath?: string;
  private readonly _fetchFn: typeof fetch;

  constructor(options?: BrowserAssetProviderOptions) {
    this._basePath = options?.basePath;
    this._fetchFn =
      options?.fetchFn ??
      (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
        ? globalThis.fetch.bind(globalThis)
        : () => {
            throw new Error('Global fetch is not available in the current environment.');
          });
  }

  resolveUrl(uri: string): string {
    const trimmed = uri.trim();
    if (!trimmed) {
      throw new Error('Asset URI cannot be empty');
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    const cleanPath = trimmed.replace(/^\.?\/+/, '').replace(/^public\/+/, '');
    const base =
      this._basePath ??
      (typeof document !== 'undefined' && document.baseURI ? document.baseURI : '/');

    if (/^https?:\/\//i.test(base)) {
      return new URL(cleanPath, base).href;
    }

    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${normalizedBase}${cleanPath}`;
  }

  async loadJson<T = unknown>(uri: string): Promise<T> {
    const url = this.resolveUrl(uri);
    let response: Response;
    try {
      response = await this._fetchFn(url);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch asset from "${uri}" (${url}): ${msg}`, { cause: error });
    }

    if (!response.ok) {
      throw new Error(`Asset not found: "${uri}" (HTTP ${response.status} ${response.statusText})`);
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse JSON asset from "${uri}": ${msg}`, { cause: error });
    }
  }

  async loadText(uri: string): Promise<string> {
    const url = this.resolveUrl(uri);
    let response: Response;
    try {
      response = await this._fetchFn(url);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch asset from "${uri}" (${url}): ${msg}`, { cause: error });
    }

    if (!response.ok) {
      throw new Error(`Asset not found: "${uri}" (HTTP ${response.status} ${response.statusText})`);
    }

    return await response.text();
  }

  async loadBinary(uri: string): Promise<ArrayBuffer> {
    const url = this.resolveUrl(uri);
    let response: Response;
    try {
      response = await this._fetchFn(url);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch asset from "${uri}" (${url}): ${msg}`, { cause: error });
    }

    if (!response.ok) {
      throw new Error(`Asset not found: "${uri}" (HTTP ${response.status} ${response.statusText})`);
    }

    return await response.arrayBuffer();
  }

  async exists(uri: string): Promise<boolean> {
    if (!uri || !uri.trim()) {
      return false;
    }
    try {
      const url = this.resolveUrl(uri);
      try {
        const headResponse = await this._fetchFn(url, { method: 'HEAD' });
        if (headResponse.ok) {
          return true;
        }
        if (headResponse.status !== 405 && headResponse.status !== 501) {
          return false;
        }
      } catch {
        void 0;
      }

      const getResponse = await this._fetchFn(url, { method: 'GET' });
      return getResponse.ok;
    } catch {
      return false;
    }
  }
}
