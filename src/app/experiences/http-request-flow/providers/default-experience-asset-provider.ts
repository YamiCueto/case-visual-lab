import { AssetProvider } from '../../../engine/assets/contracts/asset-provider.interface';
import { HTTP_REQUEST_FLOW_MANIFEST } from '../manifest/http-request-flow.manifest';

export class DefaultExperienceAssetProvider implements AssetProvider {
  private readonly _manifests = new Map<string, unknown>([
    ['default', HTTP_REQUEST_FLOW_MANIFEST],
    ['test', HTTP_REQUEST_FLOW_MANIFEST],
    ['http-request-flow', HTTP_REQUEST_FLOW_MANIFEST],
    ['content/experiences/http-request-flow.experience.json', HTTP_REQUEST_FLOW_MANIFEST],
    ['assets/content/experiences/http-request-flow.experience.json', HTTP_REQUEST_FLOW_MANIFEST],
    ['/content/experiences/http-request-flow.experience.json', HTTP_REQUEST_FLOW_MANIFEST],
  ]);

  async loadJson<T = unknown>(uri: string): Promise<T> {
    const normalized = uri.trim();
    if (this._manifests.has(normalized)) {
      const data = this._manifests.get(normalized);
      return JSON.parse(JSON.stringify(data)) as T;
    }
    throw new Error(`Asset not found: ${uri}`);
  }

  async loadText(uri: string): Promise<string> {
    const data = await this.loadJson(uri);
    return JSON.stringify(data);
  }

  async loadBinary(_uri: string): Promise<ArrayBuffer> {
    void _uri;
    return new ArrayBuffer(0);
  }

  async exists(uri: string): Promise<boolean> {
    return this._manifests.has(uri.trim());
  }
}
