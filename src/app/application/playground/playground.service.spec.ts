import { TestBed } from '@angular/core/testing';
import { PlaygroundService } from './playground.service';

describe('PlaygroundService', () => {
  let service: PlaygroundService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlaygroundService);
  });

  it('exposes initial catalog with HTTP, Agent, and RAG presets', () => {
    const list = service.presets();
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.some((p) => p.id === 'http_flow')).toBe(true);
    expect(list.some((p) => p.id === 'agent_loop')).toBe(true);
    expect(list.some((p) => p.id === 'rag_pipeline')).toBe(true);
  });

  it('selects active playground and updates signal', () => {
    const selected = service.selectPlayground('agent_loop');
    expect(selected).toBeTruthy();
    expect(selected?.id).toBe('agent_loop');
    expect(service.activePreset().id).toBe('agent_loop');
  });

  it('returns null for non-existing playground ID', () => {
    const selected = service.selectPlayground('non_existent');
    expect(selected).toBeNull();
  });
});
