import { SimulationEntityState, SimulationState } from '../../contracts/simulation-state.types';
import { SimulationEvent } from '../../events/simulation-event.types';
import {
  SimulationProvider,
  SimulationProviderInitResult,
  StepEvaluationResult,
} from '../../provider/simulation-provider.types';
import { SimulationSnapshot } from '../../snapshot/simulation-snapshot.types';
import {
  DEFAULT_STAGE_DURATIONS,
  HttpProviderState,
  HttpScenario,
  HttpSimulationStage,
} from './http-simulation.types';

/**
 * Deterministic HTTP Simulation Provider.
 *
 * Implements the SimulationProvider SPI:
 * - Pure discrete event simulation of an HTTP request lifecycle.
 * - Zero fetch, zero network sockets, zero internet dependencies.
 * - Zero visual/rendering knowledge (no Three.js, Excalidraw, Canvas, or Angular).
 * - Emits semantic SimulationEvents (tcp, tls, jwt, rate-limit, controller, domain, db, response).
 */
export class HttpSimulationProvider implements SimulationProvider<HttpScenario, HttpProviderState> {
  readonly providerId = 'http-simulation-provider';
  readonly domain = 'networking';

  initialize(
    scenario: HttpScenario,
    _seed: number,
  ): SimulationProviderInitResult<HttpProviderState> {
    void _seed;
    const requestId = `req_${scenario.scenarioId}_${Math.abs(_seed)}`;

    const initialState: SimulationState = {
      stepIndex: 0,
      virtualTimeMs: 0,
      variables: {
        requestId,
        method: scenario.method,
        url: scenario.url,
        currentStage: 'IDLE',
        status: null,
        latencyMs: 0,
        isCompleted: false,
      },
      entities: {
        client: {
          entityId: 'client',
          status: 'IDLE',
          metrics: { requestsSent: 0, responsesReceived: 0 },
          attributes: { userAgent: 'CaseVisualLab/1.0' },
        },
        api_gateway: {
          entityId: 'api_gateway',
          status: 'LISTENING',
          metrics: { activeConnections: 0 },
          attributes: { securityZone: 'dmz' },
        },
        order_service: {
          entityId: 'order_service',
          status: 'IDLE',
          metrics: { activeTransactions: 0 },
          attributes: { tier: 'backend' },
        },
        database: {
          entityId: 'database',
          status: 'READY',
          metrics: { openQueries: 0 },
          attributes: { engine: 'PostgreSQL' },
        },
      },
    };

    const initialProviderState: HttpProviderState = {
      requestId,
      currentStage: 'IDLE',
      stageTimeRemainingMs: this.getDuration('IDLE', scenario),
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
    currentProviderState: Readonly<HttpProviderState>,
    deltaVirtualTimeMs: number,
  ): StepEvaluationResult<HttpProviderState> {
    if (currentProviderState.isCompleted) {
      return {
        nextState: currentState,
        providerState: currentProviderState,
        emittedEvents: [],
        isCompleted: true,
      };
    }

    let currentStage: HttpSimulationStage = currentProviderState.currentStage;
    let remainingTimeInStage = currentProviderState.stageTimeRemainingMs;
    let timePool = deltaVirtualTimeMs;
    const accumulatedLatency = currentProviderState.accumulatedLatencyMs + deltaVirtualTimeMs;
    let status: number | null = currentProviderState.status;
    let isCompleted: boolean = currentProviderState.isCompleted;
    let sequenceCounter = currentProviderState.sequenceCounter;
    const historyStages = [...currentProviderState.historyStages];
    const emittedEvents: SimulationEvent[] = [];
    const scenario = currentProviderState.scenario;

    // Advance through stages as discrete time expires
    while (timePool > 0 && !isCompleted) {
      // If we are IDLE, immediately transition to TCP_CONNECTING
      if (currentStage === 'IDLE') {
        currentStage = 'TCP_CONNECTING';
        remainingTimeInStage = this.getDuration('TCP_CONNECTING', scenario);
        historyStages.push(currentStage);

        sequenceCounter += 1;
        emittedEvents.push(
          this.createEvent(
            sequenceCounter,
            'tcp:connecting',
            'client',
            'api_gateway',
            currentState.virtualTimeMs + (deltaVirtualTimeMs - timePool),
            currentState.stepIndex + 1,
            {
              requestId: currentProviderState.requestId,
              method: scenario.method,
              url: scenario.url,
            },
          ),
        );
      }

      if (timePool < remainingTimeInStage) {
        remainingTimeInStage -= timePool;
        break;
      }

      // Stage time elapsed, transition to next stage
      timePool -= remainingTimeInStage;
      const nextTransition = this.computeNextStage(currentStage, scenario);
      currentStage = nextTransition.nextStage;
      remainingTimeInStage = this.getDuration(currentStage, scenario);
      historyStages.push(currentStage);

      // Emit domain events corresponding to stage transition
      for (const eventDef of nextTransition.events) {
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

      if (nextTransition.status !== undefined) {
        status = nextTransition.status;
      }

      if (currentStage === 'COMPLETED') {
        isCompleted = true;
        timePool = 0;
      }
    }

    const nextEntities = this.updateEntities(
      currentState.entities,
      currentStage,
      status,
      accumulatedLatency,
    );

    const nextState: SimulationState = {
      stepIndex: currentState.stepIndex + 1,
      virtualTimeMs: currentState.virtualTimeMs + deltaVirtualTimeMs,
      variables: {
        requestId: currentProviderState.requestId,
        method: scenario.method,
        url: scenario.url,
        currentStage,
        status,
        latencyMs: accumulatedLatency,
        isCompleted,
      },
      entities: nextEntities,
    };

    const nextProviderState: HttpProviderState = {
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
    snapshot: SimulationSnapshot<HttpProviderState>,
  ): SimulationProviderInitResult<HttpProviderState> {
    return {
      initialState: { ...snapshot.state },
      initialProviderState: { ...snapshot.providerState },
    };
  }

  dispose(): void {
    // Pure in-memory simulation; nothing external to release
  }

  private getDuration(stage: HttpSimulationStage, scenario: HttpScenario): number {
    return scenario.stageDurationsMs?.[stage] ?? DEFAULT_STAGE_DURATIONS[stage] ?? 0;
  }

  private computeNextStage(
    currentStage: HttpSimulationStage,
    scenario: HttpScenario,
  ): {
    nextStage: HttpSimulationStage;
    events: {
      type: string;
      source: string;
      target?: string;
      payload: Record<string, unknown>;
    }[];
    status?: number;
  } {
    switch (currentStage) {
      case 'TCP_CONNECTING':
        return {
          nextStage: 'TLS_HANDSHAKE',
          events: [
            {
              type: 'tls:completed',
              source: 'client',
              target: 'api_gateway',
              payload: { cipher: 'TLS_AES_256_GCM_SHA384' },
            },
          ],
        };

      case 'TLS_HANDSHAKE':
        return {
          nextStage: 'REQUEST_SENT',
          events: [
            {
              type: 'http:request-sent',
              source: 'client',
              target: 'api_gateway',
              payload: {
                method: scenario.method,
                url: scenario.url,
                headers: scenario.headers ?? {},
                body: scenario.body,
              },
            },
          ],
        };

      case 'REQUEST_SENT':
        return {
          nextStage: 'JWT_VALIDATION',
          events: [],
        };

      case 'JWT_VALIDATION':
        if (scenario.expectedStatus === 401 || scenario.jwtToken === 'invalid') {
          return {
            nextStage: 'RESPONSE',
            status: 401,
            events: [
              {
                type: 'security:jwt-invalid',
                source: 'api_gateway',
                target: 'client',
                payload: {
                  status: 401,
                  error: 'Unauthorized: Invalid or expired JWT token',
                },
              },
            ],
          };
        }
        return {
          nextStage: 'RATE_LIMIT',
          events: [
            {
              type: 'security:jwt-valid',
              source: 'api_gateway',
              target: 'api_gateway',
              payload: { subject: 'user_case_42', valid: true },
            },
          ],
        };

      case 'RATE_LIMIT':
        if (scenario.expectedStatus === 429 || scenario.rateLimitThreshold === 0) {
          return {
            nextStage: 'RESPONSE',
            status: 429,
            events: [
              {
                type: 'gateway:ratelimit-exceeded',
                source: 'api_gateway',
                target: 'client',
                payload: {
                  status: 429,
                  error: 'Too Many Requests: Rate limit quota exceeded',
                },
              },
            ],
          };
        }
        return {
          nextStage: 'CONTROLLER',
          events: [
            {
              type: 'gateway:ratelimit-passed',
              source: 'api_gateway',
              target: 'order_service',
              payload: { quotaRemaining: 99 },
            },
          ],
        };

      case 'CONTROLLER':
        return {
          nextStage: 'DOMAIN',
          events: [
            {
              type: 'controller:entered',
              source: 'order_service',
              target: 'order_service',
              payload: { handler: 'OrderController.execute' },
            },
          ],
        };

      case 'DOMAIN':
        if (scenario.expectedStatus === 404) {
          return {
            nextStage: 'RESPONSE',
            status: 404,
            events: [
              {
                type: 'domain:not-found',
                source: 'order_service',
                target: 'client',
                payload: {
                  status: 404,
                  error: 'Order entity not found in aggregate',
                },
              },
            ],
          };
        }
        if (scenario.expectedStatus === 500) {
          return {
            nextStage: 'RESPONSE',
            status: 500,
            events: [
              {
                type: 'domain:error',
                source: 'order_service',
                target: 'client',
                payload: {
                  status: 500,
                  error: 'InternalServerError: Unexpected aggregate invariant violation',
                },
              },
            ],
          };
        }
        return {
          nextStage: 'DATABASE',
          events: [
            {
              type: 'domain:executed',
              source: 'order_service',
              target: 'database',
              payload: {
                useCase: 'PlaceOrderUseCase',
                event: 'OrderCreatedDomainEvent',
              },
            },
          ],
        };

      case 'DATABASE':
        return {
          nextStage: 'RESPONSE',
          status: scenario.expectedStatus,
          events: [
            {
              type: 'database:query',
              source: 'order_service',
              target: 'database',
              payload: { query: 'INSERT INTO orders ... RETURNING id' },
            },
            {
              type: 'database:commit',
              source: 'database',
              target: 'order_service',
              payload: { transactionId: 'tx_8892', status: 'COMMITTED' },
            },
          ],
        };

      case 'RESPONSE':
        return {
          nextStage: 'COMPLETED',
          status: scenario.expectedStatus,
          events: [
            {
              type: 'http:response-sent',
              source: 'api_gateway',
              target: 'client',
              payload: {
                status: scenario.expectedStatus,
                statusText: this.getStatusText(scenario.expectedStatus),
                headers: { 'Content-Type': 'application/json' },
              },
            },
            {
              type: 'simulation:completed',
              source: 'system',
              payload: {
                status: scenario.expectedStatus,
                isSuccess: scenario.expectedStatus < 400,
              },
            },
          ],
        };

      default:
        return {
          nextStage: 'COMPLETED',
          events: [],
        };
    }
  }

  private updateEntities(
    previous: Readonly<Record<string, SimulationEntityState>>,
    stage: HttpSimulationStage,
    status: number | null,
    latencyMs: number,
  ): Readonly<Record<string, SimulationEntityState>> {
    const isCompleted = stage === 'COMPLETED';

    return {
      client: {
        ...previous['client'],
        status: isCompleted ? 'RECEIVED' : stage === 'IDLE' ? 'IDLE' : 'WAITING',
        metrics: {
          requestsSent: stage !== 'IDLE' ? 1 : 0,
          responsesReceived: isCompleted ? 1 : 0,
          latencyMs,
        },
      },
      api_gateway: {
        ...previous['api_gateway'],
        status:
          stage === 'JWT_VALIDATION'
            ? 'AUTHENTICATING'
            : stage === 'RATE_LIMIT'
              ? 'RATE_LIMITING'
              : 'IDLE',
      },
      order_service: {
        ...previous['order_service'],
        status:
          stage === 'CONTROLLER' ? 'ROUTING' : stage === 'DOMAIN' ? 'EXECUTING_USE_CASE' : 'IDLE',
      },
      database: {
        ...previous['database'],
        status: stage === 'DATABASE' ? 'EXECUTING_QUERY' : 'READY',
      },
    };
  }

  private createEvent(
    sequence: number,
    type: string,
    sourceEntityId: string,
    targetEntityId: string | undefined,
    virtualTimeMs: number,
    stepIndex: number,
    payload: Record<string, unknown>,
  ): SimulationEvent {
    return {
      eventId: `sim_evt_${sequence}`,
      type,
      sourceEntityId,
      ...(targetEntityId !== undefined ? { targetEntityId } : {}),
      virtualTimeMs,
      stepIndex,
      sequence,
      payload,
    };
  }

  private getStatusText(status: number): string {
    switch (status) {
      case 200:
        return 'OK';
      case 201:
        return 'Created';
      case 204:
        return 'No Content';
      case 401:
        return 'Unauthorized';
      case 404:
        return 'Not Found';
      case 429:
        return 'Too Many Requests';
      case 500:
        return 'Internal Server Error';
      default:
        return 'Status';
    }
  }
}
