import { Plugin } from '../contracts/plugin.interface';

export interface PluginResolutionError {
  readonly code:
    | 'DUPLICATE_PLUGIN_ID'
    | 'MISSING_DEPENDENCY'
    | 'INCOMPATIBLE_DEPENDENCY_VERSION'
    | 'INCOMPATIBLE_ENGINE_VERSION'
    | 'CIRCULAR_DEPENDENCY';
  readonly pluginId: string;
  readonly message: string;
  readonly details?: unknown;
}

export interface PluginResolutionResult {
  readonly isValid: boolean;
  readonly orderedPlugins: readonly Plugin[];
  readonly errors: readonly PluginResolutionError[];
}

/**
 * Validates whether a version satisfies a semver-like version range.
 * Pure implementation without external npm dependencies.
 */
export function isVersionCompatible(version: string, range: string): boolean {
  const trimmedRange = range.trim();
  if (trimmedRange === '*' || trimmedRange === '' || trimmedRange === 'latest') {
    return true;
  }

  const parseVersion = (v: string): [number, number, number] => {
    const clean = v.replace(/^v/, '').split('-')[0];
    const parts = clean.split('.').map((p) => parseInt(p, 10) || 0);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };

  const [vMaj, vMin, vPatch] = parseVersion(version);

  if (trimmedRange.startsWith('>=')) {
    const [rMaj, rMin, rPatch] = parseVersion(trimmedRange.slice(2).trim());
    if (vMaj > rMaj) return true;
    if (vMaj < rMaj) return false;
    if (vMin > rMin) return true;
    if (vMin < rMin) return false;
    return vPatch >= rPatch;
  }

  if (trimmedRange.startsWith('^')) {
    const [rMaj, rMin, rPatch] = parseVersion(trimmedRange.slice(1).trim());
    if (rMaj > 0) {
      return vMaj === rMaj && (vMin > rMin || (vMin === rMin && vPatch >= rPatch));
    }
    // 0.x.x versions: minor acts like major in semver
    if (rMin > 0) {
      return vMaj === 0 && vMin === rMin && vPatch >= rPatch;
    }
    return vMaj === 0 && vMin === 0 && vPatch === rPatch;
  }

  if (trimmedRange.startsWith('~')) {
    const [rMaj, rMin, rPatch] = parseVersion(trimmedRange.slice(1).trim());
    return vMaj === rMaj && vMin === rMin && vPatch >= rPatch;
  }

  const [rMaj, rMin, rPatch] = parseVersion(trimmedRange.replace(/^=/, '').trim());
  return vMaj === rMaj && vMin === rMin && vPatch === rPatch;
}

/**
 * Universal Plugin Resolver.
 * Validates dependencies, semver ranges, engine compatibility, detects cycles,
 * and performs topological sorting so dependencies are initialized before dependents.
 */
export class PluginResolver {
  private readonly _engineVersion: string;

  constructor(engineVersion = '0.3.0') {
    this._engineVersion = engineVersion;
  }

  /**
   * Validates and orders a collection of plugins according to their dependency graph.
   */
  resolve(plugins: readonly Plugin[]): PluginResolutionResult {
    const errors: PluginResolutionError[] = [];
    const pluginMap = new Map<string, Plugin>();

    // 1. Check for duplicates
    for (const plugin of plugins) {
      const id = plugin.descriptor.id;
      if (pluginMap.has(id)) {
        errors.push({
          code: 'DUPLICATE_PLUGIN_ID',
          pluginId: id,
          message: `Duplicate plugin with ID "${id}" detected in resolution set.`,
        });
      } else {
        pluginMap.set(id, plugin);
      }
    }

    // 2. Validate engine compatibility & dependencies
    for (const plugin of pluginMap.values()) {
      const desc = plugin.descriptor;

      // Engine version compatibility check
      if (desc.engineVersion && !isVersionCompatible(this._engineVersion, desc.engineVersion)) {
        errors.push({
          code: 'INCOMPATIBLE_ENGINE_VERSION',
          pluginId: desc.id,
          message: `Plugin "${desc.id}" requires engine version "${desc.engineVersion}", but runtime is "${this._engineVersion}".`,
          details: { required: desc.engineVersion, current: this._engineVersion },
        });
      }

      // Dependencies check
      if (desc.dependencies) {
        for (const [depId, expectedRange] of Object.entries(desc.dependencies)) {
          const depPlugin = pluginMap.get(depId);
          if (!depPlugin) {
            errors.push({
              code: 'MISSING_DEPENDENCY',
              pluginId: desc.id,
              message: `Plugin "${desc.id}" depends on missing plugin "${depId}".`,
              details: { dependency: depId, requiredVersion: expectedRange },
            });
          } else {
            const actualVersion = depPlugin.descriptor.version;
            if (!isVersionCompatible(actualVersion, expectedRange)) {
              errors.push({
                code: 'INCOMPATIBLE_DEPENDENCY_VERSION',
                pluginId: desc.id,
                message: `Plugin "${desc.id}" requires "${depId}@${expectedRange}", but found version "${actualVersion}".`,
                details: { dependency: depId, required: expectedRange, actual: actualVersion },
              });
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        orderedPlugins: [],
        errors,
      };
    }

    // 3. Cycle detection and topological sort (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    const dependentsMap = new Map<string, string[]>(); // depId -> list of plugins that depend on it

    for (const id of pluginMap.keys()) {
      inDegree.set(id, 0);
      dependentsMap.set(id, []);
    }

    for (const plugin of pluginMap.values()) {
      const id = plugin.descriptor.id;
      const deps = Object.keys(plugin.descriptor.dependencies ?? {});
      inDegree.set(id, deps.length);

      for (const depId of deps) {
        dependentsMap.get(depId)?.push(id);
      }
    }

    const queue: string[] = [];
    for (const [id, count] of inDegree.entries()) {
      if (count === 0) {
        queue.push(id);
      }
    }

    const sortedIds: string[] = [];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      sortedIds.push(currentId);

      const dependents = dependentsMap.get(currentId) ?? [];
      for (const dependentId of dependents) {
        const remaining = (inDegree.get(dependentId) ?? 1) - 1;
        inDegree.set(dependentId, remaining);
        if (remaining === 0) {
          queue.push(dependentId);
        }
      }
    }

    // If not all plugins could be sorted, a circular dependency exists
    if (sortedIds.length !== pluginMap.size) {
      const cyclicIds = Array.from(pluginMap.keys()).filter((id) => !sortedIds.includes(id));
      errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        pluginId: cyclicIds[0] ?? 'unknown',
        message: `Circular dependency detected involving plugins: ${cyclicIds.join(', ')}`,
        details: { cyclicPlugins: cyclicIds },
      });

      return {
        isValid: false,
        orderedPlugins: [],
        errors,
      };
    }

    const orderedPlugins: Plugin[] = [];
    for (const id of sortedIds) {
      const p = pluginMap.get(id);
      if (p) {
        orderedPlugins.push(p);
      }
    }

    return {
      isValid: true,
      orderedPlugins,
      errors: [],
    };
  }
}
