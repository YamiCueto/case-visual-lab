import { computed, Injectable, signal } from '@angular/core';
import { animate } from 'animejs';

export interface FlowStage {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly progressPct: number;
}

export const HTTP_FLOW_STAGES: readonly FlowStage[] = [
  {
    id: 'client',
    label: '1. Client (HTTP Request)',
    detail: 'GET /api/v1/orders - Generando JWT bearer token',
    progressPct: 15,
  },
  {
    id: 'gateway',
    label: '2. API Gateway (Reverse Proxy)',
    detail: 'Validando firma JWT, rate-limit: 100 req/s OK',
    progressPct: 45,
  },
  {
    id: 'service',
    label: '3. Order Service (Domain Core)',
    detail: 'Ejecutando Use Case: GetOrderQuery en memoria',
    progressPct: 75,
  },
  {
    id: 'database',
    label: '4. PostgreSQL (Storage)',
    detail: 'SELECT * FROM orders WHERE id = $1 [2ms query]',
    progressPct: 100,
  },
];

@Injectable({ providedIn: 'root' })
export class FlowAnimationService {
  private readonly isRunningState = signal(false);
  private readonly currentStageIndexState = signal<number>(0);
  private readonly progressPercentState = signal<number>(0);

  readonly isRunning = this.isRunningState.asReadonly();
  readonly currentStageIndex = this.currentStageIndexState.asReadonly();
  readonly progressPercent = this.progressPercentState.asReadonly();
  readonly progress = this.progressPercentState.asReadonly();
  readonly currentStage = computed(() => HTTP_FLOW_STAGES[this.currentStageIndexState()] ?? null);

  /**
   * Runs an educational simulation using Anime.js,
   * driving visual progress through each architectural hop.
   */
  simulateHttpFlow(stages = HTTP_FLOW_STAGES): Promise<void> {
    if (this.isRunningState()) return Promise.resolve();

    this.isRunningState.set(true);
    this.currentStageIndexState.set(0);
    this.progressPercentState.set(0);

    return new Promise((resolve) => {
      const obj = { progress: 0 };

      animate(obj, {
        progress: 100,
        duration: 3200,
        ease: 'linear',
        onUpdate: () => {
          this.progressPercentState.set(Math.round(obj.progress));
          // Calculate stage according to progress
          const stageIndex = stages.findIndex((s) => obj.progress <= s.progressPct);
          if (stageIndex >= 0) {
            this.currentStageIndexState.set(stageIndex);
          } else {
            this.currentStageIndexState.set(stages.length - 1);
          }
        },
        onComplete: () => {
          this.isRunningState.set(false);
          this.progressPercentState.set(100);
          this.currentStageIndexState.set(stages.length - 1);
          resolve();
        },
      });
    });
  }

  reset(): void {
    this.isRunningState.set(false);
    this.currentStageIndexState.set(0);
    this.progressPercentState.set(0);
  }
}
