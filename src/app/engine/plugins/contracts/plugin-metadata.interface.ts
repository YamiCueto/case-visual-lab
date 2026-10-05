/**
 * Static metadata identifying a plugin in the ecosystem.
 */
export interface PluginMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly engineVersion: string;
  readonly author?: string;
  readonly description?: string;
  readonly homepage?: string;
  readonly license?: string;
}
