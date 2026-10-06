import { describe, expect, it } from 'vitest';
import { ExperienceCompositionRoot } from '../../engine/kernel/composition/experience-composition-root';
import { ExperienceOrchestrator } from '../../engine/orchestrator/runtime/experience-orchestrator';
import { RendererPort } from '../../engine/rendering/contracts/renderer-port.interface';
import { RendererBatch } from '../../engine/rendering/contracts/renderer-batch.types';
import { RendererCommand } from '../../engine/behaviors/commands/renderer-command.types';
import { BehaviorExecutionContext } from '../../engine/behaviors/contracts/behavior-context.interface';
import {
  DefaultExperienceAssetProvider,
  HTTP_REQUEST_FLOW_EVENT_TYPES,
  HTTP_REQUEST_FLOW_MANIFEST,
  HttpRequestFlowBehaviorHandler,
  HttpRequestFlowScenario,
  HttpRequestFlowSimulationProvider,
} from './index';

class SpyingRendererPort implements RendererPort {
  readonly id = 'spying-renderer';
  readonly priority = 15;
  readonly recordedCommands: RendererCommand[] = [];

  private _isInitialized = false;
  private _isDisposed = false;

  initialize(): void {
    this._isInitialized = true;
  }

  supports(_command: RendererCommand): boolean {
    void _command;
    return true;
  }

  render(batch: RendererBatch): void {
    this.recordedCommands.push(...batch.commands);
  }

  dispose(): void {
    this._isDisposed = true;
  }

  isDisposed(): boolean {
    return this._isDisposed;
  }
}

describe('HTTP Request Flow MVP Experience', () => {
  const defaultScenario: HttpRequestFlowScenario = {
    scenarioId: 'test-order-flow',
    method: 'POST',
    url: 'https://api.example.com/api/v1/orders',
    domain: 'api.example.com',
    path: '/api/v1/orders',
    resolvedIp: '198.51.100.1',
    status: 200,
  };

  describe('Simulation Provider', () => {
    it('initializes with correct 11 entities and starting variables', () => {
      const provider = new HttpRequestFlowSimulationProvider();
      const initResult = provider.initialize(defaultScenario, 42);

      expect(provider.providerId).toBe('http-request-flow-simulation-provider');
      expect(provider.domain).toBe('networking');

      const { initialState, initialProviderState } = initResult;
      expect(initialState.variables['currentStage']).toBe('IDLE');
      expect(initialState.variables['activeNode']).toBe('node_browser');
      expect(initialState.variables['isCompleted']).toBe(false);

      const entityKeys = Object.keys(initialState.entities);
      expect(entityKeys).toHaveLength(11);
      expect(entityKeys).toContain('node_browser');
      expect(entityKeys).toContain('node_dns_resolver');
      expect(entityKeys).toContain('node_dns_recursive');
      expect(entityKeys).toContain('node_dns_authoritative');
      expect(entityKeys).toContain('node_reverse_proxy');
      expect(entityKeys).toContain('node_load_balancer');
      expect(entityKeys).toContain('node_api_gateway');
      expect(entityKeys).toContain('node_microservice');
      expect(entityKeys).toContain('node_business_layer');
      expect(entityKeys).toContain('node_database');
      expect(entityKeys).toContain('node_wal');

      expect(initialProviderState.currentStage).toBe('IDLE');
      expect(initialProviderState.isCompleted).toBe(false);
    });

    it('advances through all stages from DNS_START to FINISHED deterministically', () => {
      const provider = new HttpRequestFlowSimulationProvider();
      const { initialState, initialProviderState } = provider.initialize(defaultScenario, 42);

      let currentState = initialState;
      let currentProviderState = initialProviderState;
      const allEvents: string[] = [];

      while (!currentProviderState.isCompleted) {
        const result = provider.step(currentState, currentProviderState, 500);
        currentState = result.nextState;
        currentProviderState = result.providerState;
        for (const evt of result.emittedEvents) {
          allEvents.push(evt.type);
        }
      }

      expect(currentProviderState.isCompleted).toBe(true);
      expect(currentState.variables['isCompleted']).toBe(true);
      expect(currentState.variables['status']).toBe(200);

      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.DNS_START);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.DNS_RESOLVER_QUERY);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.DNS_AUTHORITATIVE_RESPONSE);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.DNS_END);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.TCP_SYN);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.TCP_SYN_ACK);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.TCP_ACK);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.TLS_CLIENT_HELLO);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.TLS_SERVER_HELLO);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.HTTP_REQUEST_SENT);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.PROXY_FORWARD);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.LOAD_BALANCER_ROUTE);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.GATEWAY_DISPATCH);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.MICROSERVICE_DISPATCH);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.BUSINESS_LOGIC_EXECUTE);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.DATABASE_QUERY);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.WAL_WRITE);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.DATABASE_RESPONSE);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.HTTP_RESPONSE_SENT);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.RESPONSE_RECEIVED);
      expect(allEvents).toContain(HTTP_REQUEST_FLOW_EVENT_TYPES.FINISHED);
    });
  });

  describe('Behavior Handler', () => {
    it('supports all 21 HTTP request flow event types', () => {
      const handler = new HttpRequestFlowBehaviorHandler();
      for (const eventType of Object.values(HTTP_REQUEST_FLOW_EVENT_TYPES)) {
        expect(handler.supports(eventType)).toBe(true);
      }
      expect(handler.supports('UNKNOWN_EVENT_TYPE')).toBe(false);
    });

    it('generates highlight, badge, camera, and particle commands', () => {
      const handler = new HttpRequestFlowBehaviorHandler();
      const context: BehaviorExecutionContext = {
        virtualTime: 1000,
        simulationState: {
          stepIndex: 1,
          virtualTimeMs: 1000,
          variables: {},
          entities: {},
        },
        variables: {},
        seed: 42,
      };

      const commands = handler.execute(
        {
          eventId: 'evt_1',
          type: HTTP_REQUEST_FLOW_EVENT_TYPES.HTTP_REQUEST_SENT,
          sourceEntityId: 'node_browser',
          targetEntityId: 'node_reverse_proxy',
          virtualTimeMs: 1000,
          stepIndex: 1,
          sequence: 1,
          payload: { method: 'POST', path: '/orders' },
        },
        context,
      );

      const commandTypes = commands.map((c) => c.type);
      expect(commandTypes).toContain('HIGHLIGHT_NODE');
      expect(commandTypes).toContain('UPDATE_BADGE');
      expect(commandTypes).toContain('FOCUS_CAMERA');
      expect(commandTypes).toContain('SPAWN_PARTICLE');
      expect(commandTypes).toContain('MOVE_PARTICLE');
    });
  });

  describe('Universal Manifest & Asset Provider', () => {
    it('provides valid manifest conforming to ADR-008 schema v2.0.0', () => {
      expect(HTTP_REQUEST_FLOW_MANIFEST.schemaVersion).toBe('2.0.0');
      expect(HTTP_REQUEST_FLOW_MANIFEST.manifestVersion).toBe('1.0.0');
      expect(HTTP_REQUEST_FLOW_MANIFEST.metadata.id).toBe('http-request-flow');
      expect(HTTP_REQUEST_FLOW_MANIFEST.profile.type).toBe('simulation');

      const timeline = HTTP_REQUEST_FLOW_MANIFEST.timeline;
      expect(timeline).toBeDefined();
      expect(timeline?.tracks).toHaveLength(6);
      expect(timeline?.markers).toHaveLength(9);

      const assets = HTTP_REQUEST_FLOW_MANIFEST.assets;
      expect(assets).toBeDefined();
      expect(assets?.scenes).toBeDefined();
    });

    it('loads manifest via DefaultExperienceAssetProvider for default, test and id keys', async () => {
      const provider = new DefaultExperienceAssetProvider();
      expect(await provider.exists('default')).toBe(true);
      expect(await provider.exists('test')).toBe(true);
      expect(await provider.exists('http-request-flow')).toBe(true);

      const loaded = await provider.loadJson<{ metadata: { id: string } }>('default');
      expect(loaded.metadata.id).toBe('http-request-flow');
    });
  });

  describe('End-to-End Orchestrator Integration', () => {
    it('loads experience, runs simulation, and dispatches commands through the complete pipeline', async () => {
      const spyingPort = new SpyingRendererPort();
      const assetProvider = new DefaultExperienceAssetProvider();
      const simProvider = new HttpRequestFlowSimulationProvider();
      const behaviorHandler = new HttpRequestFlowBehaviorHandler();

      const runtime = ExperienceCompositionRoot.compose({
        assetProvider,
        customProviders: [simProvider],
        customHandlers: [behaviorHandler],
        customRenderers: [spyingPort],
      });

      const orchestrator = new ExperienceOrchestrator({ platformRuntime: runtime });

      expect(orchestrator.state).toBe('LOAD');
      await orchestrator.load('http-request-flow');
      expect(orchestrator.state).toBe('READY');

      orchestrator.play();
      expect(orchestrator.state).toBe('PLAYING');

      for (let i = 0; i < 25; i++) {
        orchestrator.tick(500);
      }

      expect(spyingPort.recordedCommands.length).toBeGreaterThan(0);

      const dispatchedTypes = new Set(spyingPort.recordedCommands.map((c) => c.type));
      expect(dispatchedTypes.has('HIGHLIGHT_NODE')).toBe(true);
      expect(dispatchedTypes.has('UPDATE_BADGE')).toBe(true);
      expect(dispatchedTypes.has('FOCUS_CAMERA')).toBe(true);

      orchestrator.pause();
      expect(orchestrator.state).toBe('PAUSED');

      orchestrator.resume();
      expect(orchestrator.state).toBe('PLAYING');

      await orchestrator.seek(2000);
      expect(orchestrator.state).toBe('PLAYING');
      expect(orchestrator.clock.time).toBe(2000);

      orchestrator.stop();
      expect(orchestrator.state).toBe('STOPPED');
      expect(orchestrator.clock.time).toBe(0);

      await orchestrator.destroy();
    });
  });
});
