/**
 * Read-only extensions accessor exposed to plugins during lifecycle phases.
 */
export interface IExtensionAccessor {
  get<T>(namespace: string, key: string): T | null;
  has(namespace: string, key?: string): boolean;
  register<T>(namespace: string, key: string, value: T): void;
}

/**
 * Execution context supplied to plugins on initialize, start, and stop.
 */
export interface PluginExecutionContext {
  readonly pluginId: string;
  readonly engineVersion: string;
  readonly extensions: IExtensionAccessor;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
