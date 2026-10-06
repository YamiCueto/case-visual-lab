import { RendererCommand } from '../../../engine/behaviors/commands/renderer-command.types';
import { BehaviorExecutionContext } from '../../../engine/behaviors/contracts/behavior-context.interface';
import {
  BehaviorHandler,
  BehaviorMetadata,
} from '../../../engine/behaviors/contracts/behavior-handler.interface';
import { SimulationEvent } from '../../../engine/simulation/events/simulation-event.types';
import { HTTP_REQUEST_FLOW_EVENT_TYPES } from '../simulation/http-request-flow-events.types';

const EVENT_BADGE_MAP: Readonly<Record<string, { text: string; intent: string }>> = {
  [HTTP_REQUEST_FLOW_EVENT_TYPES.DNS_START]: { text: 'DNS RESOLVE', intent: 'info' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.DNS_RESOLVER_QUERY]: { text: '1.1.1.1 RECURSE', intent: 'info' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.DNS_AUTHORITATIVE_RESPONSE]: {
    text: 'A: 198.51.100.1',
    intent: 'info',
  },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.DNS_END]: { text: 'DNS READY', intent: 'success' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.TCP_SYN]: { text: 'TCP [SYN]', intent: 'busy' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.TCP_SYN_ACK]: { text: 'TCP [SYN-ACK]', intent: 'busy' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.TCP_ACK]: { text: 'ESTABLISHED', intent: 'success' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.TLS_CLIENT_HELLO]: {
    text: 'ClientHello (TLS 1.3)',
    intent: 'busy',
  },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.TLS_SERVER_HELLO]: {
    text: 'ServerHello (AES-GCM)',
    intent: 'info',
  },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.HTTP_REQUEST_SENT]: {
    text: 'POST /api/v1/orders',
    intent: 'transmitting',
  },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.PROXY_FORWARD]: { text: 'TERMINATED & FWD', intent: 'busy' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.LOAD_BALANCER_ROUTE]: { text: 'ROUND ROBIN', intent: 'busy' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.GATEWAY_DISPATCH]: { text: 'JWT VERIFIED', intent: 'success' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.MICROSERVICE_DISPATCH]: { text: 'OrderService', intent: 'busy' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.BUSINESS_LOGIC_EXECUTE]: {
    text: 'Domain Validated',
    intent: 'busy',
  },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.DATABASE_QUERY]: { text: 'BEGIN TX (INSERT)', intent: 'busy' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.WAL_WRITE]: { text: 'WAL FSYNC (LSN)', intent: 'warning' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.DATABASE_RESPONSE]: { text: 'COMMIT (1 ROW)', intent: 'success' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.HTTP_RESPONSE_SENT]: { text: 'HTTP 200 OK', intent: 'success' },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.RESPONSE_RECEIVED]: {
    text: 'PAYLOAD RENDERED',
    intent: 'success',
  },
  [HTTP_REQUEST_FLOW_EVENT_TYPES.FINISHED]: { text: 'COMPLETED', intent: 'success' },
};

export class HttpRequestFlowBehaviorHandler implements BehaviorHandler {
  readonly id = 'http-request-flow-behavior-handler';

  private readonly _supportedTypes = new Set<string>(Object.values(HTTP_REQUEST_FLOW_EVENT_TYPES));

  supports(eventType: string): boolean {
    return this._supportedTypes.has(eventType);
  }

  execute(event: SimulationEvent, _context: BehaviorExecutionContext): readonly RendererCommand[] {
    void _context;
    const targetEntityId = event.targetEntityId ?? event.sourceEntityId;
    const badgeInfo = EVENT_BADGE_MAP[event.type] ?? { text: event.type, intent: 'default' };
    const particleId = `flow_p_${event.eventId}`;

    const commands: RendererCommand[] = [
      {
        id: `cmd_hl_${event.eventId}`,
        type: 'HIGHLIGHT_NODE',
        targetId: event.sourceEntityId,
        payload: {
          intent: badgeInfo.intent,
          intensity: 0.9,
        },
        durationMs: 300,
        easing: 'ease-out',
        priority: 'NORMAL',
      },
      {
        id: `cmd_bdg_${event.eventId}`,
        type: 'UPDATE_BADGE',
        targetId: event.sourceEntityId,
        payload: {
          text: badgeInfo.text,
          intent: badgeInfo.intent,
        },
        durationMs: 300,
        easing: 'linear',
        priority: 'NORMAL',
      },
      {
        id: `cmd_cam_${event.eventId}`,
        type: 'FOCUS_CAMERA',
        targetId: targetEntityId,
        payload: {
          target: targetEntityId,
          zoom: 1.05,
        },
        durationMs: 400,
        easing: 'ease-out',
        priority: 'NORMAL',
      },
    ];

    if (event.targetEntityId && event.targetEntityId !== event.sourceEntityId) {
      commands.push(
        {
          id: `cmd_sp_${event.eventId}`,
          type: 'SPAWN_PARTICLE',
          targetId: event.sourceEntityId,
          payload: {
            particleId,
            sourceEntityId: event.sourceEntityId,
            targetEntityId: event.targetEntityId,
            semanticKind: 'packet',
          },
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        },
        {
          id: `cmd_mv_${event.eventId}`,
          type: 'MOVE_PARTICLE',
          targetId: particleId,
          payload: {
            destinationEntityId: event.targetEntityId,
          },
          durationMs: 350,
          easing: 'ease-out',
          priority: 'NORMAL',
        },
      );
    }

    return commands;
  }

  metadata(): BehaviorMetadata {
    return {
      id: this.id,
      name: 'HTTP Request Flow Behavior Handler',
      description: 'Translates discrete HTTP lifecycle events to visual and camera instructions',
      supportedEventTypes: Array.from(this._supportedTypes),
    };
  }
}
