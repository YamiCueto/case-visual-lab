import {
  SimulationEntityState,
  SimulationState,
  SimulationStateValue,
} from '../../../engine/simulation/contracts/simulation-state.types';
import { SimulationEvent } from '../../../engine/simulation/events/simulation-event.types';
import {
  SimulationProvider,
  SimulationProviderInitResult,
  StepEvaluationResult,
} from '../../../engine/simulation/provider/simulation-provider.types';
import { SimulationSnapshot } from '../../../engine/simulation/snapshot/simulation-snapshot.types';
import {
  HttpRequestFlowProviderState,
  HttpRequestFlowScenario,
  HttpRequestFlowStage,
} from '../contracts/http-request-flow.types';
import { HTTP_REQUEST_FLOW_EVENT_TYPES } from './http-request-flow-events.types';

const DEFAULT_FLOW_DURATIONS: Readonly<Record<HttpRequestFlowStage, number>> = {
  IDLE: 0,
  DNS_START: 500,
  DNS_RESOLVER_QUERY: 500,
  DNS_AUTHORITATIVE_RESPONSE: 500,
  DNS_END: 500,
  TCP_SYN: 500,
  TCP_SYN_ACK: 500,
  TCP_ACK: 500,
  TLS_CLIENT_HELLO: 500,
  TLS_SERVER_HELLO: 500,
  HTTP_REQUEST_SENT: 600,
  PROXY_FORWARD: 500,
  LOAD_BALANCER_ROUTE: 500,
  GATEWAY_DISPATCH: 500,
  MICROSERVICE_DISPATCH: 500,
  BUSINESS_LOGIC_EXECUTE: 600,
  DATABASE_QUERY: 600,
  WAL_WRITE: 500,
  DATABASE_RESPONSE: 600,
  HTTP_RESPONSE_SENT: 700,
  RESPONSE_RECEIVED: 500,
  FINISHED: 0,
};

const createEntity = (
  entityId: string,
  status: string,
  metrics: Readonly<Record<string, number>> = {},
  attributes: Readonly<Record<string, SimulationStateValue>> = {},
): SimulationEntityState => ({
  entityId,
  status,
  metrics,
  attributes,
});

export class HttpRequestFlowSimulationProvider implements SimulationProvider<
  HttpRequestFlowScenario,
  HttpRequestFlowProviderState
> {
  readonly providerId = 'http-request-flow-simulation-provider';
  readonly domain = 'networking';

  initialize(
    scenario: HttpRequestFlowScenario,
    _seed: number,
  ): SimulationProviderInitResult<HttpRequestFlowProviderState> {
    void _seed;
    const requestId = `req_${scenario.scenarioId}_${Math.abs(_seed || 1)}`;

    const initialState: SimulationState = {
      stepIndex: 0,
      virtualTimeMs: 0,
      variables: {
        requestId,
        method: scenario.method,
        url: scenario.url,
        domain: scenario.domain,
        resolvedIp: scenario.resolvedIp,
        currentStage: 'IDLE',
        status: null,
        latencyMs: 0,
        isCompleted: false,
        activeNode: 'node_browser',
      },
      entities: {
        node_browser: createEntity('node_browser', 'IDLE', { packetsSent: 0, packetsReceived: 0 }),
        node_dns_resolver: createEntity('node_dns_resolver', 'LISTENING'),
        node_dns_recursive: createEntity('node_dns_recursive', 'LISTENING'),
        node_dns_authoritative: createEntity('node_dns_authoritative', 'LISTENING'),
        node_reverse_proxy: createEntity('node_reverse_proxy', 'LISTENING'),
        node_load_balancer: createEntity('node_load_balancer', 'LISTENING'),
        node_api_gateway: createEntity('node_api_gateway', 'LISTENING'),
        node_microservice: createEntity('node_microservice', 'IDLE'),
        node_business_layer: createEntity('node_business_layer', 'IDLE'),
        node_database: createEntity('node_database', 'READY'),
        node_wal: createEntity('node_wal', 'READY'),
      },
    };

    const initialProviderState: HttpRequestFlowProviderState = {
      requestId,
      currentStage: 'IDLE',
      stageTimeRemainingMs: 0,
      status: null,
      accumulatedLatencyMs: 0,
      historyStages: ['IDLE'],
      scenario,
      isCompleted: false,
      sequenceCounter: 0,
    };

    return { initialState, initialProviderState };
  }

  step(
    currentState: SimulationState,
    currentProviderState: Readonly<HttpRequestFlowProviderState>,
    deltaVirtualTimeMs: number,
  ): StepEvaluationResult<HttpRequestFlowProviderState> {
    if (currentProviderState.isCompleted) {
      return {
        nextState: currentState,
        providerState: currentProviderState,
        emittedEvents: [],
        isCompleted: true,
      };
    }

    let currentStage = currentProviderState.currentStage;
    let remainingTimeInStage = currentProviderState.stageTimeRemainingMs;
    let timePool = deltaVirtualTimeMs;
    const accumulatedLatency = currentProviderState.accumulatedLatencyMs + deltaVirtualTimeMs;
    let status = currentProviderState.status;
    let isCompleted: boolean = currentProviderState.isCompleted;
    let sequenceCounter = currentProviderState.sequenceCounter;
    const historyStages = [...currentProviderState.historyStages];
    const emittedEvents: SimulationEvent[] = [];
    const scenario = currentProviderState.scenario;
    let activeNode = 'node_browser';

    while (timePool > 0 && !isCompleted) {
      if (currentStage === 'IDLE') {
        currentStage = 'DNS_START';
        remainingTimeInStage = this.getDuration('DNS_START', scenario);
        historyStages.push(currentStage);
        sequenceCounter += 1;
        activeNode = 'node_browser';

        emittedEvents.push(
          this.createEvent(
            sequenceCounter,
            HTTP_REQUEST_FLOW_EVENT_TYPES.DNS_START,
            'node_browser',
            'node_dns_resolver',
            currentState.virtualTimeMs + (deltaVirtualTimeMs - timePool),
            currentState.stepIndex + 1,
            { domain: scenario.domain },
          ),
        );
      }

      if (timePool < remainingTimeInStage) {
        remainingTimeInStage -= timePool;
        break;
      }

      timePool -= remainingTimeInStage;
      const transition = this.computeNextTransition(currentStage, scenario);
      currentStage = transition.nextStage;
      remainingTimeInStage = this.getDuration(currentStage, scenario);
      historyStages.push(currentStage);
      activeNode = transition.activeNode;

      for (const eventDef of transition.events) {
        sequenceCounter += 1;
        emittedEvents.push(
          this.createEvent(
            sequenceCounter,
            eventDef.type,
            eventDef.source,
            eventDef.target,
            currentState.virtualTimeMs + (deltaVirtualTimeMs - timePool),
            currentState.stepIndex + 1,
            {
              requestId: currentProviderState.requestId,
              ...eventDef.payload,
            },
          ),
        );
      }

      if (transition.status !== undefined) {
        status = transition.status;
      }

      if (currentStage === 'FINISHED') {
        isCompleted = true;
        timePool = 0;
      }
    }

    const nextState: SimulationState = {
      stepIndex: currentState.stepIndex + 1,
      virtualTimeMs: currentState.virtualTimeMs + deltaVirtualTimeMs,
      variables: {
        requestId: currentProviderState.requestId,
        method: scenario.method,
        url: scenario.url,
        domain: scenario.domain,
        resolvedIp: scenario.resolvedIp,
        currentStage,
        status,
        latencyMs: accumulatedLatency,
        isCompleted,
        activeNode,
      },
      entities: currentState.entities,
    };

    const nextProviderState: HttpRequestFlowProviderState = {
      requestId: currentProviderState.requestId,
      currentStage,
      stageTimeRemainingMs: remainingTimeInStage,
      status,
      accumulatedLatencyMs: accumulatedLatency,
      historyStages,
      scenario,
      isCompleted,
      sequenceCounter,
    };

    return {
      nextState,
      providerState: nextProviderState,
      emittedEvents,
      isCompleted,
    };
  }

  restore(
    snapshot: SimulationSnapshot<HttpRequestFlowProviderState>,
  ): SimulationProviderInitResult<HttpRequestFlowProviderState> {
    return {
      initialState: { ...snapshot.state },
      initialProviderState: { ...snapshot.providerState },
    };
  }

  private _disposed = false;

  dispose(): void {
    this._disposed = true;
  }

  private getDuration(stage: HttpRequestFlowStage, scenario: HttpRequestFlowScenario): number {
    return scenario.stageDurationsMs?.[stage] ?? DEFAULT_FLOW_DURATIONS[stage] ?? 0;
  }

  private computeNextTransition(
    currentStage: HttpRequestFlowStage,
    scenario: HttpRequestFlowScenario,
  ): {
    nextStage: HttpRequestFlowStage;
    activeNode: string;
    events: {
      type: string;
      source: string;
      target?: string;
      payload: Record<string, unknown>;
    }[];
    status?: number;
  } {
    switch (currentStage) {
      case 'DNS_START':
        return {
          nextStage: 'DNS_RESOLVER_QUERY',
          activeNode: 'node_dns_resolver',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.DNS_RESOLVER_QUERY,
              source: 'node_dns_resolver',
              target: 'node_dns_recursive',
              payload: { domain: scenario.domain },
            },
          ],
        };

      case 'DNS_RESOLVER_QUERY':
        return {
          nextStage: 'DNS_AUTHORITATIVE_RESPONSE',
          activeNode: 'node_dns_authoritative',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.DNS_AUTHORITATIVE_RESPONSE,
              source: 'node_dns_recursive',
              target: 'node_dns_authoritative',
              payload: { resolvedIp: scenario.resolvedIp },
            },
          ],
        };

      case 'DNS_AUTHORITATIVE_RESPONSE':
        return {
          nextStage: 'DNS_END',
          activeNode: 'node_browser',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.DNS_END,
              source: 'node_dns_resolver',
              target: 'node_browser',
              payload: { resolvedIp: scenario.resolvedIp },
            },
          ],
        };

      case 'DNS_END':
        return {
          nextStage: 'TCP_SYN',
          activeNode: 'node_browser',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.TCP_SYN,
              source: 'node_browser',
              target: 'node_reverse_proxy',
              payload: { flag: 'SYN', seq: 100 },
            },
          ],
        };

      case 'TCP_SYN':
        return {
          nextStage: 'TCP_SYN_ACK',
          activeNode: 'node_reverse_proxy',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.TCP_SYN_ACK,
              source: 'node_reverse_proxy',
              target: 'node_browser',
              payload: { flag: 'SYN-ACK', seq: 300, ack: 101 },
            },
          ],
        };

      case 'TCP_SYN_ACK':
        return {
          nextStage: 'TCP_ACK',
          activeNode: 'node_browser',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.TCP_ACK,
              source: 'node_browser',
              target: 'node_reverse_proxy',
              payload: { flag: 'ACK', ack: 301 },
            },
          ],
        };

      case 'TCP_ACK':
        return {
          nextStage: 'TLS_CLIENT_HELLO',
          activeNode: 'node_browser',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.TLS_CLIENT_HELLO,
              source: 'node_browser',
              target: 'node_reverse_proxy',
              payload: { cipherSuites: ['TLS_AES_256_GCM_SHA384'] },
            },
          ],
        };

      case 'TLS_CLIENT_HELLO':
        return {
          nextStage: 'TLS_SERVER_HELLO',
          activeNode: 'node_reverse_proxy',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.TLS_SERVER_HELLO,
              source: 'node_reverse_proxy',
              target: 'node_browser',
              payload: { protocol: 'TLSv1.3', cipher: 'TLS_AES_256_GCM_SHA384' },
            },
          ],
        };

      case 'TLS_SERVER_HELLO':
        return {
          nextStage: 'HTTP_REQUEST_SENT',
          activeNode: 'node_browser',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.HTTP_REQUEST_SENT,
              source: 'node_browser',
              target: 'node_reverse_proxy',
              payload: { method: scenario.method, url: scenario.url },
            },
          ],
        };

      case 'HTTP_REQUEST_SENT':
        return {
          nextStage: 'PROXY_FORWARD',
          activeNode: 'node_reverse_proxy',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.PROXY_FORWARD,
              source: 'node_reverse_proxy',
              target: 'node_load_balancer',
              payload: { method: scenario.method, path: scenario.path },
            },
          ],
        };

      case 'PROXY_FORWARD':
        return {
          nextStage: 'LOAD_BALANCER_ROUTE',
          activeNode: 'node_load_balancer',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.LOAD_BALANCER_ROUTE,
              source: 'node_load_balancer',
              target: 'node_api_gateway',
              payload: { upstream: 'api-gateway-node-1' },
            },
          ],
        };

      case 'LOAD_BALANCER_ROUTE':
        return {
          nextStage: 'GATEWAY_DISPATCH',
          activeNode: 'node_api_gateway',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.GATEWAY_DISPATCH,
              source: 'node_api_gateway',
              target: 'node_microservice',
              payload: { authenticated: true, rateLimitAllowed: true },
            },
          ],
        };

      case 'GATEWAY_DISPATCH':
        return {
          nextStage: 'MICROSERVICE_DISPATCH',
          activeNode: 'node_microservice',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.MICROSERVICE_DISPATCH,
              source: 'node_microservice',
              target: 'node_business_layer',
              payload: { service: 'OrderService', action: 'CreateOrder' },
            },
          ],
        };

      case 'MICROSERVICE_DISPATCH':
        return {
          nextStage: 'BUSINESS_LOGIC_EXECUTE',
          activeNode: 'node_business_layer',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.BUSINESS_LOGIC_EXECUTE,
              source: 'node_business_layer',
              target: 'node_database',
              payload: { validation: 'PASSED', entity: 'Order' },
            },
          ],
        };

      case 'BUSINESS_LOGIC_EXECUTE':
        return {
          nextStage: 'DATABASE_QUERY',
          activeNode: 'node_database',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.DATABASE_QUERY,
              source: 'node_database',
              target: 'node_wal',
              payload: { sql: 'INSERT INTO orders ... RETURNING id' },
            },
          ],
        };

      case 'DATABASE_QUERY':
        return {
          nextStage: 'WAL_WRITE',
          activeNode: 'node_wal',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.WAL_WRITE,
              source: 'node_database',
              target: 'node_wal',
              payload: { walLsn: '0/16B2D40', fsync: true },
            },
          ],
        };

      case 'WAL_WRITE':
        return {
          nextStage: 'DATABASE_RESPONSE',
          activeNode: 'node_database',
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.DATABASE_RESPONSE,
              source: 'node_wal',
              target: 'node_database',
              payload: { rowsAffected: 1, durationMs: 12 },
            },
          ],
        };

      case 'DATABASE_RESPONSE':
        return {
          nextStage: 'HTTP_RESPONSE_SENT',
          activeNode: 'node_reverse_proxy',
          status: scenario.status,
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.HTTP_RESPONSE_SENT,
              source: 'node_database',
              target: 'node_reverse_proxy',
              payload: { status: scenario.status, contentType: 'application/json' },
            },
          ],
        };

      case 'HTTP_RESPONSE_SENT':
        return {
          nextStage: 'RESPONSE_RECEIVED',
          activeNode: 'node_browser',
          status: scenario.status,
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.RESPONSE_RECEIVED,
              source: 'node_reverse_proxy',
              target: 'node_browser',
              payload: { status: scenario.status, body: { success: true } },
            },
          ],
        };

      case 'RESPONSE_RECEIVED':
        return {
          nextStage: 'FINISHED',
          activeNode: 'node_browser',
          status: scenario.status,
          events: [
            {
              type: HTTP_REQUEST_FLOW_EVENT_TYPES.FINISHED,
              source: 'node_browser',
              payload: { totalLatencyMs: 12000 },
            },
          ],
        };

      default:
        return {
          nextStage: 'FINISHED',
          activeNode: 'node_browser',
          events: [],
        };
    }
  }

  private createEvent(
    seq: number,
    type: string,
    source: string,
    target: string | undefined,
    virtualTimeMs: number,
    stepIndex: number,
    payload: Record<string, unknown>,
  ): SimulationEvent {
    return {
      eventId: `sim_flow_${seq}`,
      type,
      sourceEntityId: source,
      targetEntityId: target,
      virtualTimeMs,
      stepIndex,
      sequence: seq,
      payload,
    };
  }
}
