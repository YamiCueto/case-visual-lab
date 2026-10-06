import { EventPriority } from '../../event-bus/event-envelope';
import { RuntimeEventBus } from '../../event-bus/runtime-event-bus';
import { RuntimeStateMachine } from '../../kernel/state-machine/runtime-state-machine';

export type FaultSeverity = 'RECOVERABLE' | 'FATAL';
export type FaultPolicy = 'ISOLATE_PLUGIN' | 'DEGRADE_RENDER' | 'HALT';

/**
 * Audit record of an isolated runtime fault.
 */
export interface FaultReport {
  readonly error: Error;
  readonly subsystem: string;
  readonly severity: FaultSeverity;
  readonly policy: FaultPolicy;
  readonly message: string;
  readonly virtualTime: number;
}

/**
 * Supervisor component that classifies errors, triggers graceful degradation,
 * and isolates non-critical subsystem failures from bringing down the entire runtime.
 */
export class FaultIsolator {
  private _faultHistory: FaultReport[] = [];

  /**
   * Classifies an unexpected error into a structured FaultReport.
   */
  classify(error: unknown, subsystem: string, virtualTime = 0): FaultReport {
    const err = error instanceof Error ? error : new Error(String(error));
    const msg = err.message;

    let severity: FaultSeverity;
    let policy: FaultPolicy;

    // Plugins and secondary extension hooks are isolated
    if (subsystem === 'plugin' || subsystem.startsWith('plugin:')) {
      severity = 'RECOVERABLE';
      policy = 'ISOLATE_PLUGIN';
    } else if (subsystem === 'audio' || subsystem === 'renderer:audio') {
      severity = 'RECOVERABLE';
      policy = 'DEGRADE_RENDER';
    } else if (msg.includes('[RECOVERABLE]')) {
      severity = 'RECOVERABLE';
      policy = 'DEGRADE_RENDER';
    } else {
      // Core, Simulation, Timeline, StateMachine or unhandled errors are fatal
      severity = 'FATAL';
      policy = 'HALT';
    }

    const report: FaultReport = {
      error: err,
      subsystem,
      severity,
      policy,
      message: msg,
      virtualTime,
    };

    this._faultHistory.push(report);
    return report;
  }

  /**
   * Handles the fault report by publishing runtime events and executing state transitions.
   */
  handle(report: FaultReport, stateMachine: RuntimeStateMachine, eventBus: RuntimeEventBus): void {
    eventBus.publish({
      id: `evt_error_${report.virtualTime}_${report.subsystem}`,
      scope: 'internal',
      priority: report.severity === 'FATAL' ? EventPriority.CRITICAL : EventPriority.NORMAL,
      channel: 'orchestrator',
      type: 'RUNTIME_ERROR',
      timestamp: 0,
      virtualTimeMs: report.virtualTime,
      senderEngine: 'supervisor:fault-isolator',
      payload: {
        subsystem: report.subsystem,
        severity: report.severity,
        policy: report.policy,
        message: report.message,
        virtualTime: report.virtualTime,
      },
    });

    if (report.severity === 'FATAL') {
      if (stateMachine.currentState() !== 'ERROR' && stateMachine.currentState() !== 'DESTROYED') {
        stateMachine.transition('ERROR', `Fatal fault in ${report.subsystem}: ${report.message}`);
      }
    }
  }

  /**
   * Returns all recorded fault reports.
   */
  history(): readonly FaultReport[] {
    return this._faultHistory;
  }

  /**
   * Clears the fault history.
   */
  clear(): void {
    this._faultHistory = [];
  }
}
