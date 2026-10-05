/**
 * Standard capability identifiers recognized across the CASE Visual Lab runtime.
 */
export type StandardPluginCapability =
  | 'simulation-provider'
  | 'behavior-handler'
  | 'renderer-port'
  | 'asset-provider'
  | 'camera-adapter'
  | 'evaluation-provider'
  | 'narrative-provider'
  | 'custom-profile';

/**
 * Capability type: supports standard platform capabilities as well as custom extension capabilities.
 */
export type PluginCapability = StandardPluginCapability | string;
