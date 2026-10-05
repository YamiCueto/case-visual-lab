import { PluginCapability } from './plugin-capability.types';
import { PluginMetadata } from './plugin-metadata.interface';

/**
 * Complete manifest descriptor for a runtime plugin.
 */
export interface PluginDescriptor extends PluginMetadata {
  readonly capabilities: readonly PluginCapability[];
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly extensions?: Readonly<Record<string, unknown>>;
}
