import { RendererCommand } from '../../../../engine/behaviors/commands/renderer-command.types';
import { ExcalidrawScene, ExcalidrawSceneElement } from '../contracts/excalidraw-scene.interface';

/**
 * Standard palette for semantic intents when coloring elements.
 */
const INTENT_COLORS: Readonly<Record<string, string>> = {
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  busy: '#F59E0B',
  default: '#6366F1',
};

/**
 * Supported command types for Excalidraw adapter.
 */
export const SUPPORTED_EXCALIDRAW_COMMANDS = new Set<string>([
  'HIGHLIGHT_NODE',
  'UPDATE_BADGE',
  'UPDATE_LABEL',
  'SHOW_TOOLTIP',
  'HIDE_TOOLTIP',
]);

export interface HighlightPayload {
  readonly color?: string;
  readonly glowColor?: string;
  readonly strokeColor?: string;
  readonly backgroundColor?: string;
  readonly strokeWidth?: number;
  readonly intent?: string;
  readonly reset?: boolean;
}

export interface BadgePayload {
  readonly text?: string;
  readonly badgeId?: string;
  readonly intent?: string;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly textColor?: string;
  readonly position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export interface LabelPayload {
  readonly text?: string;
  readonly labelId?: string;
  readonly color?: string;
}

export interface TooltipPayload {
  readonly text?: string;
  readonly title?: string;
  readonly tooltipId?: string;
  readonly position?: string;
}

/**
 * Translates universal RendererCommands into concrete Excalidraw element mutations.
 * Contains no domain, timing, or simulation logic.
 */
export class CommandMapper {
  /**
   * Returns true if the command type is natively supported by Excalidraw.
   */
  supports(command: RendererCommand): boolean {
    return SUPPORTED_EXCALIDRAW_COMMANDS.has(command.type);
  }

  /**
   * Translates a supported command into target element representations.
   * If the command is unknown or unsupported, returns an empty array.
   */
  mapCommand(command: RendererCommand, scene: ExcalidrawScene): readonly ExcalidrawSceneElement[] {
    if (!this.supports(command)) {
      return [];
    }

    switch (command.type as string) {
      case 'HIGHLIGHT_NODE':
        return this.mapHighlight(command, scene);
      case 'UPDATE_BADGE':
        return this.mapBadge(command, scene);
      case 'UPDATE_LABEL':
        return this.mapLabel(command, scene);
      case 'SHOW_TOOLTIP':
        return this.mapShowTooltip(command, scene);
      case 'HIDE_TOOLTIP':
        return this.mapHideTooltip(command, scene);
      default:
        return [];
    }
  }

  private mapHighlight(
    command: RendererCommand,
    scene: ExcalidrawScene,
  ): readonly ExcalidrawSceneElement[] {
    const payload = (command.payload || {}) as HighlightPayload;
    const existing = scene.getElementById(command.targetId);

    if (payload.reset) {
      return [
        {
          id: command.targetId,
          type: existing?.type ?? 'rectangle',
          strokeColor: '#1e1e1e',
          strokeWidth: 1,
          customData: {
            ...(existing?.customData ?? {}),
            highlighted: false,
          },
        },
      ];
    }

    const intentColor = payload.intent ? INTENT_COLORS[payload.intent] : undefined;
    const resolvedColor =
      payload.glowColor ??
      payload.color ??
      payload.strokeColor ??
      intentColor ??
      INTENT_COLORS['default'];

    const mutation: ExcalidrawSceneElement = {
      id: command.targetId,
      type: existing?.type ?? 'rectangle',
      strokeColor: resolvedColor,
      strokeWidth: payload.strokeWidth ?? 3,
      ...(payload.backgroundColor ? { backgroundColor: payload.backgroundColor } : {}),
      customData: {
        ...(existing?.customData ?? {}),
        highlighted: true,
        highlightColor: resolvedColor,
      },
    };

    return [mutation];
  }

  private mapBadge(
    command: RendererCommand,
    scene: ExcalidrawScene,
  ): readonly ExcalidrawSceneElement[] {
    const payload = (command.payload || {}) as BadgePayload;
    const badgeId = payload.badgeId ?? `${command.targetId}__badge`;
    const targetElement = scene.getElementById(command.targetId);
    const existingBadge = scene.getElementById(badgeId);

    const intentColor = payload.intent ? INTENT_COLORS[payload.intent] : undefined;
    const strokeColor =
      payload.textColor ?? payload.color ?? intentColor ?? INTENT_COLORS['default'];
    const backgroundColor =
      payload.backgroundColor ?? (payload.intent === 'error' ? '#FEE2E2' : '#EEF2FF');

    const baseX = targetElement?.x ?? 0;
    const baseY = targetElement?.y ?? 0;
    const baseW = targetElement?.width ?? 120;

    const badgeX = existingBadge?.x ?? baseX + baseW - 20;
    const badgeY = existingBadge?.y ?? baseY - 12;

    const badgeElement: ExcalidrawSceneElement = {
      id: badgeId,
      type: 'text',
      text: payload.text,
      x: badgeX,
      y: badgeY,
      width: Math.max(40, (payload.text?.length ?? 0) * 8),
      height: 20,
      strokeColor,
      backgroundColor,
      fontSize: 12,
      containerId: command.targetId,
      isDeleted: false,
      opacity: 100,
      customData: {
        ...(existingBadge?.customData ?? {}),
        role: 'badge',
        targetNodeId: command.targetId,
        intent: payload.intent,
      },
    };

    const results: ExcalidrawSceneElement[] = [badgeElement];

    // If target element exists, keep its customData badge state synced
    if (targetElement) {
      results.push({
        id: targetElement.id,
        type: targetElement.type,
        customData: {
          ...(targetElement.customData ?? {}),
          badgeText: payload.text,
          badgeIntent: payload.intent,
        },
      });
    }

    return results;
  }

  private mapLabel(
    command: RendererCommand,
    scene: ExcalidrawScene,
  ): readonly ExcalidrawSceneElement[] {
    const payload = (command.payload || {}) as LabelPayload;
    const labelId = payload.labelId ?? command.targetId;
    const existing = scene.getElementById(labelId);

    const labelElement: ExcalidrawSceneElement = {
      id: labelId,
      type: existing?.type ?? 'text',
      text: payload.text,
      ...(payload.color ? { strokeColor: payload.color } : {}),
      customData: {
        ...(existing?.customData ?? {}),
        label: payload.text,
      },
    };

    return [labelElement];
  }

  private mapShowTooltip(
    command: RendererCommand,
    scene: ExcalidrawScene,
  ): readonly ExcalidrawSceneElement[] {
    const payload = (command.payload || {}) as TooltipPayload;
    const tooltipId = payload.tooltipId ?? `${command.targetId}__tooltip`;
    const targetElement = scene.getElementById(command.targetId);
    const existingTooltip = scene.getElementById(tooltipId);

    const text = payload.title ? `${payload.title}: ${payload.text ?? ''}` : (payload.text ?? '');

    const targetX = targetElement?.x ?? 0;
    const targetY = targetElement?.y ?? 0;
    const targetH = targetElement?.height ?? 60;

    const tooltipElement: ExcalidrawSceneElement = {
      id: tooltipId,
      type: 'text',
      text,
      x: existingTooltip?.x ?? targetX,
      y: existingTooltip?.y ?? targetY + targetH + 8,
      containerId: command.targetId,
      opacity: 100,
      isDeleted: false,
      strokeColor: '#374151',
      backgroundColor: '#F3F4F6',
      fontSize: 12,
      customData: {
        ...(existingTooltip?.customData ?? {}),
        role: 'tooltip',
        targetNodeId: command.targetId,
        visible: true,
      },
    };

    return [tooltipElement];
  }

  private mapHideTooltip(
    command: RendererCommand,
    scene: ExcalidrawScene,
  ): readonly ExcalidrawSceneElement[] {
    const payload = (command.payload || {}) as TooltipPayload;
    const tooltipId = payload.tooltipId ?? `${command.targetId}__tooltip`;
    const existingTooltip = scene.getElementById(tooltipId);

    const tooltipElement: ExcalidrawSceneElement = {
      id: tooltipId,
      type: existingTooltip?.type ?? 'text',
      isDeleted: true,
      opacity: 0,
      customData: {
        ...(existingTooltip?.customData ?? {}),
        role: 'tooltip',
        targetNodeId: command.targetId,
        visible: false,
      },
    };

    return [tooltipElement];
  }
}
