import { PluginExecutionContext } from './plugin-context.interface';
import { PluginDescriptor } from './plugin-descriptor.interface';

/**
 * Universal Plugin interface in CASE Visual Lab.
 * Plugins can provide simulation providers, behavior handlers, renderers, asset providers, etc.
 */
export interface Plugin {
  readonly descriptor: PluginDescriptor;

  /**
   * Called during system initialization after dependency resolution.
   */
  initialize?(context: PluginExecutionContext): Promise<void> | void;

  /**
   * Called when runtime transitions to active or running state.
   */
  start?(context: PluginExecutionContext): Promise<void> | void;

  /**
   * Called when runtime pauses, stops, or unloads.
   */
  stop?(context: PluginExecutionContext): Promise<void> | void;

  /**
   * Called when the plugin is unregistered or the engine is torn down.
   */
  dispose?(): Promise<void> | void;
}
