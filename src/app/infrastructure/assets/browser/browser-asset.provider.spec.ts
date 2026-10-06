import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { BrowserAssetProvider } from './browser-asset.provider';

describe('BrowserAssetProvider', () => {
  it('instantiates via Angular Dependency Injection', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: BrowserAssetProvider,
          useFactory: () => new BrowserAssetProvider(),
        },
      ],
    });
    const provider = TestBed.inject(BrowserAssetProvider);
    expect(provider).toBeInstanceOf(BrowserAssetProvider);
  });

  describe('resolveUrl', () => {
    it('normalizes relative paths and prefixes with base path', () => {
      const provider = new BrowserAssetProvider({ basePath: '/' });
      expect(provider.resolveUrl('content/lessons/01-clean-architecture.json')).toBe(
        '/content/lessons/01-clean-architecture.json',
      );
      expect(provider.resolveUrl('/content/lessons/01-clean-architecture.json')).toBe(
        '/content/lessons/01-clean-architecture.json',
      );
      expect(provider.resolveUrl('./content/lessons/01-clean-architecture.json')).toBe(
        '/content/lessons/01-clean-architecture.json',
      );
      expect(provider.resolveUrl('public/content/lessons/01-clean-architecture.json')).toBe(
        '/content/lessons/01-clean-architecture.json',
      );
    });

    it('preserves absolute URLs', () => {
      const provider = new BrowserAssetProvider();
      expect(provider.resolveUrl('https://example.com/assets/data.json')).toBe(
        'https://example.com/assets/data.json',
      );
      expect(provider.resolveUrl('http://example.com/assets/data.json')).toBe(
        'http://example.com/assets/data.json',
      );
    });

    it('resolves relative paths with absolute base path', () => {
      const provider = new BrowserAssetProvider({
        basePath: 'https://cdn.casevisuallab.dev/v1/',
      });
      expect(provider.resolveUrl('content/experiences/http-request-flow.experience.json')).toBe(
        'https://cdn.casevisuallab.dev/v1/content/experiences/http-request-flow.experience.json',
      );
    });

    it('throws error when URI is empty or whitespace', () => {
      const provider = new BrowserAssetProvider();
      expect(() => provider.resolveUrl('')).toThrow('Asset URI cannot be empty');
      expect(() => provider.resolveUrl('   ')).toThrow('Asset URI cannot be empty');
    });
  });

  describe('loadJson', () => {
    it('fetches and returns parsed JSON content', async () => {
      const mockData = { id: 'test-manifest', title: 'Test Lesson' };
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const provider = new BrowserAssetProvider({ fetchFn: mockFetch, basePath: '/' });
      const result = await provider.loadJson<typeof mockData>(
        'content/lessons/01-clean-architecture.json',
      );

      expect(mockFetch).toHaveBeenCalledWith('/content/lessons/01-clean-architecture.json');
      expect(result).toEqual(mockData);
    });

    it('throws error when response is not ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Not Found', {
          status: 404,
          statusText: 'Not Found',
        }),
      );

      const provider = new BrowserAssetProvider({ fetchFn: mockFetch, basePath: '/' });
      await expect(provider.loadJson('content/lessons/non-existent.json')).rejects.toThrow(
        'Asset not found: "content/lessons/non-existent.json" (HTTP 404 Not Found)',
      );
    });

    it('throws error when JSON parsing fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('invalid-json-{', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const provider = new BrowserAssetProvider({ fetchFn: mockFetch, basePath: '/' });
      await expect(provider.loadJson('content/lessons/corrupted.json')).rejects.toThrow(
        'Failed to parse JSON asset',
      );
    });

    it('throws error on network failure', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const provider = new BrowserAssetProvider({ fetchFn: mockFetch, basePath: '/' });
      await expect(provider.loadJson('content/lessons/test.json')).rejects.toThrow(
        'Failed to fetch asset from "content/lessons/test.json"',
      );
    });
  });

  describe('loadText', () => {
    it('fetches and returns text content', async () => {
      const rawText = '# Clean Architecture Overview';
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(rawText, {
          status: 200,
        }),
      );

      const provider = new BrowserAssetProvider({ fetchFn: mockFetch, basePath: '/' });
      const text = await provider.loadText('content/narratives/intro.md');

      expect(mockFetch).toHaveBeenCalledWith('/content/narratives/intro.md');
      expect(text).toBe(rawText);
    });

    it('throws error when text asset is not found', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Not Found', {
          status: 404,
          statusText: 'Not Found',
        }),
      );

      const provider = new BrowserAssetProvider({ fetchFn: mockFetch, basePath: '/' });
      await expect(provider.loadText('content/narratives/missing.md')).rejects.toThrow(
        'Asset not found',
      );
    });
  });

  describe('loadBinary', () => {
    it('fetches and returns ArrayBuffer content', async () => {
      const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(buffer, {
          status: 200,
        }),
      );

      const provider = new BrowserAssetProvider({ fetchFn: mockFetch, basePath: '/' });
      const result = await provider.loadBinary('content/audio/bell.mp3');

      expect(mockFetch).toHaveBeenCalledWith('/content/audio/bell.mp3');
      expect(result.byteLength).toBe(4);
    });

    it('throws error when binary asset fails to load', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      );

      const provider = new BrowserAssetProvider({ fetchFn: mockFetch, basePath: '/' });
      await expect(provider.loadBinary('content/audio/missing.mp3')).rejects.toThrow(
        'Asset not found: "content/audio/missing.mp3" (HTTP 500 Internal Server Error)',
      );
    });
  });

  describe('exists', () => {
    it('returns true when HEAD request succeeds with 200', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
        }),
      );

      const provider = new BrowserAssetProvider({ fetchFn: mockFetch, basePath: '/' });
      const exists = await provider.exists('content/lessons/01-clean-architecture.json');

      expect(exists).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/content/lessons/01-clean-architecture.json', {
        method: 'HEAD',
      });
    });

    it('returns false when HEAD request returns 404', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(null, {
          status: 404,
        }),
      );

      const provider = new BrowserAssetProvider({ fetchFn: mockFetch, basePath: '/' });
      const exists = await provider.exists('content/lessons/missing.json');

      expect(exists).toBe(false);
    });

    it('falls back to GET if HEAD responds with 405 Method Not Allowed', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 405 }))
        .mockResolvedValueOnce(new Response('content', { status: 200 }));

      const provider = new BrowserAssetProvider({ fetchFn: mockFetch, basePath: '/' });
      const exists = await provider.exists('content/lessons/static-asset.json');

      expect(exists).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/content/lessons/static-asset.json', {
        method: 'HEAD',
      });
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/content/lessons/static-asset.json', {
        method: 'GET',
      });
    });

    it('returns false when fetch throws network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const provider = new BrowserAssetProvider({ fetchFn: mockFetch, basePath: '/' });
      const exists = await provider.exists('content/lessons/unreachable.json');

      expect(exists).toBe(false);
    });

    it('returns false when uri is empty or whitespace', async () => {
      const provider = new BrowserAssetProvider();
      expect(await provider.exists('')).toBe(false);
      expect(await provider.exists('   ')).toBe(false);
    });
  });
});
