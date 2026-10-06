import { ExcalidrawScene, ExcalidrawSceneElement } from '../contracts/excalidraw-scene.interface';

/**
 * Result of computing the difference between current scene state
 * and desired element mutations.
 */
export interface SceneDiffResult {
  readonly hasChanges: boolean;
  readonly patches: readonly ExcalidrawSceneElement[];
  readonly touchedIds: readonly string[];
}

/**
 * Compares property values between desired mutation and existing element.
 * Supports primitives and shallow customData comparison.
 */
function isPropertyEqual(valA: unknown, valB: unknown): boolean {
  if (valA === valB) {
    return true;
  }
  if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
    const objA = valA as Record<string, unknown>;
    const objB = valB as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) {
      return false;
    }
    for (const key of keysA) {
      if (objA[key] !== objB[key]) {
        return false;
      }
    }
    return true;
  }
  return false;
}

/**
 * Computes an incremental delta between existing scene elements and target updates.
 * Guarantees idempotency and avoids full-scene reallocations.
 */
export class SceneDiff {
  /**
   * Computes which elements have genuinely changed and produces minimal patches.
   * If all properties match existing state, the patch is discarded (no-op).
   */
  computeDiff(
    desiredElements: readonly ExcalidrawSceneElement[],
    scene: ExcalidrawScene,
  ): SceneDiffResult {
    const patches: ExcalidrawSceneElement[] = [];
    const touchedIds: string[] = [];

    // Deduplicate desired elements in case multiple commands touched the same target in one batch
    const coalesced = new Map<string, ExcalidrawSceneElement>();
    for (const el of desiredElements) {
      const prev = coalesced.get(el.id);
      if (prev) {
        coalesced.set(el.id, {
          ...prev,
          ...el,
          customData: {
            ...(prev.customData ?? {}),
            ...(el.customData ?? {}),
          },
        });
      } else {
        coalesced.set(el.id, el);
      }
    }

    for (const [id, desired] of coalesced.entries()) {
      const existing = scene.getElementById(id);

      if (!existing) {
        // Element does not exist yet in the scene, must be created/added
        patches.push(desired);
        touchedIds.push(id);
        continue;
      }

      // Element exists: verify if any declared property in `desired` differs
      let hasElementChanged = false;
      for (const [key, value] of Object.entries(desired)) {
        if (value === undefined) {
          continue;
        }
        if (!isPropertyEqual(existing[key], value)) {
          hasElementChanged = true;
          break;
        }
      }

      if (hasElementChanged) {
        const merged: ExcalidrawSceneElement = {
          ...existing,
          ...desired,
          customData: {
            ...(existing.customData ?? {}),
            ...(desired.customData ?? {}),
          },
        };
        patches.push(merged);
        touchedIds.push(id);
      }
    }

    return {
      hasChanges: patches.length > 0,
      patches,
      touchedIds,
    };
  }
}
