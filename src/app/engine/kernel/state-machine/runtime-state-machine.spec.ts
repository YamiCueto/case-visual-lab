import { describe, expect, it } from 'vitest';
import { RuntimeStateMachine } from './runtime-state-machine';
import { InvalidStateTransitionError } from './runtime-state-machine.errors';
import { RuntimeLifecycleState } from './runtime-state-machine.types';
import { ALLOWED_TRANSITIONS } from './transition-table';

describe('RuntimeStateMachine', () => {
  describe('Initial State', () => {
    it('should default to LOAD state with null previousState and empty history', () => {
      const fsm = new RuntimeStateMachine();

      expect(fsm.currentState()).toBe('LOAD');
      expect(fsm.previousState()).toBeNull();
      expect(fsm.history()).toEqual([]);
    });

    it('should respect custom initial state option', () => {
      const fsm = new RuntimeStateMachine({ initialState: 'READY' });

      expect(fsm.currentState()).toBe('READY');
      expect(fsm.previousState()).toBeNull();
      expect(fsm.history()).toEqual([]);
    });
  });

  describe('Valid Lifecycle Transitions', () => {
    it('should execute the canonical happy path lifecycle sequentially', () => {
      const fsm = new RuntimeStateMachine();

      expect(fsm.currentState()).toBe('LOAD');

      fsm.transition('VALIDATE', 'Manifest JSON fetched');
      expect(fsm.currentState()).toBe('VALIDATE');
      expect(fsm.previousState()).toBe('LOAD');

      fsm.transition('BUILD', 'Schema validated successfully');
      expect(fsm.currentState()).toBe('BUILD');
      expect(fsm.previousState()).toBe('VALIDATE');

      fsm.transition('INITIALIZE', 'Engines and providers assembled');
      expect(fsm.currentState()).toBe('INITIALIZE');
      expect(fsm.previousState()).toBe('BUILD');

      fsm.transition('READY', 'Hardware canvas mounted, S0 ready');
      expect(fsm.currentState()).toBe('READY');
      expect(fsm.previousState()).toBe('INITIALIZE');

      fsm.transition('PLAYING', 'User pressed play');
      expect(fsm.currentState()).toBe('PLAYING');
      expect(fsm.previousState()).toBe('READY');

      fsm.transition('PAUSED', 'User paused');
      expect(fsm.currentState()).toBe('PAUSED');
      expect(fsm.previousState()).toBe('PLAYING');

      fsm.transition('PLAYING', 'User resumed');
      expect(fsm.currentState()).toBe('PLAYING');
      expect(fsm.previousState()).toBe('PAUSED');

      fsm.transition('SEEKING', 'Scrubbing timeline to 15000ms');
      expect(fsm.currentState()).toBe('SEEKING');
      expect(fsm.previousState()).toBe('PLAYING');

      fsm.transition('PLAYING', 'Seek completed, resumed play');
      expect(fsm.currentState()).toBe('PLAYING');
      expect(fsm.previousState()).toBe('SEEKING');

      fsm.transition('STOPPED', 'User pressed stop');
      expect(fsm.currentState()).toBe('STOPPED');
      expect(fsm.previousState()).toBe('PLAYING');

      fsm.transition('READY', 'Rewound to t=0');
      expect(fsm.currentState()).toBe('READY');
      expect(fsm.previousState()).toBe('STOPPED');

      fsm.transition('DESTROYED', 'Experience teardown');
      expect(fsm.currentState()).toBe('DESTROYED');
      expect(fsm.previousState()).toBe('READY');
    });

    it('should support seek operations from READY, PAUSED, and STOPPED', () => {
      // From READY
      const fsmReady = new RuntimeStateMachine({ initialState: 'READY' });
      expect(fsmReady.canTransition('SEEKING')).toBe(true);
      fsmReady.transition('SEEKING');
      expect(fsmReady.canTransition('READY')).toBe(true);
      fsmReady.transition('READY');
      expect(fsmReady.currentState()).toBe('READY');

      // From PAUSED
      const fsmPaused = new RuntimeStateMachine({ initialState: 'PAUSED' });
      expect(fsmPaused.canTransition('SEEKING')).toBe(true);
      fsmPaused.transition('SEEKING');
      expect(fsmPaused.canTransition('PAUSED')).toBe(true);
      fsmPaused.transition('PAUSED');
      expect(fsmPaused.currentState()).toBe('PAUSED');

      // From STOPPED
      const fsmStopped = new RuntimeStateMachine({ initialState: 'STOPPED' });
      expect(fsmStopped.canTransition('SEEKING')).toBe(true);
      fsmStopped.transition('SEEKING');
      expect(fsmStopped.canTransition('STOPPED')).toBe(true);
      fsmStopped.transition('STOPPED');
      expect(fsmStopped.currentState()).toBe('STOPPED');
    });

    it('should allow seek coalescing (SEEKING -> SEEKING)', () => {
      const fsm = new RuntimeStateMachine({ initialState: 'SEEKING' });

      expect(fsm.canTransition('SEEKING')).toBe(true);
      fsm.transition('SEEKING', 'Coalesced target 2000ms -> 3000ms');

      expect(fsm.currentState()).toBe('SEEKING');
      expect(fsm.previousState()).toBe('SEEKING');
      expect(fsm.history()).toHaveLength(1);
    });

    it('should allow transition from PLAYING or PAUSED to READY when timeline ends or resets', () => {
      const fsmPlay = new RuntimeStateMachine({ initialState: 'PLAYING' });
      fsmPlay.transition('READY', 'Timeline reached end');
      expect(fsmPlay.currentState()).toBe('READY');

      const fsmPause = new RuntimeStateMachine({ initialState: 'PAUSED' });
      fsmPause.transition('READY', 'User reset to start while paused');
      expect(fsmPause.currentState()).toBe('READY');
    });

    it('should allow starting playback directly from STOPPED', () => {
      const fsm = new RuntimeStateMachine({ initialState: 'STOPPED' });
      expect(fsm.canTransition('PLAYING')).toBe(true);
      fsm.transition('PLAYING');
      expect(fsm.currentState()).toBe('PLAYING');
    });
  });

  describe('Error Handling and Recovery', () => {
    const errorOriginStates: RuntimeLifecycleState[] = [
      'LOAD',
      'VALIDATE',
      'BUILD',
      'INITIALIZE',
      'READY',
      'PLAYING',
      'PAUSED',
      'SEEKING',
      'STOPPED',
    ];

    it.each(errorOriginStates)('should allow transitioning from %s to ERROR', (originState) => {
      const fsm = new RuntimeStateMachine({ initialState: originState });
      expect(fsm.canTransition('ERROR')).toBe(true);
      fsm.transition('ERROR', `Runtime fault occurred during ${originState}`);
      expect(fsm.currentState()).toBe('ERROR');
      expect(fsm.previousState()).toBe(originState);
    });

    it('should allow recovery from ERROR to READY, LOAD, or DESTROYED', () => {
      // Recover to READY
      const fsmReady = new RuntimeStateMachine({ initialState: 'ERROR' });
      expect(fsmReady.canTransition('READY')).toBe(true);
      fsmReady.transition('READY', 'Recovered to checkpoint');
      expect(fsmReady.currentState()).toBe('READY');

      // Retry to LOAD
      const fsmLoad = new RuntimeStateMachine({ initialState: 'ERROR' });
      expect(fsmLoad.canTransition('LOAD')).toBe(true);
      fsmLoad.transition('LOAD', 'Reloading manifest');
      expect(fsmLoad.currentState()).toBe('LOAD');

      // Teardown to DESTROYED
      const fsmDestroy = new RuntimeStateMachine({ initialState: 'ERROR' });
      expect(fsmDestroy.canTransition('DESTROYED')).toBe(true);
      fsmDestroy.transition('DESTROYED', 'Unrecoverable error disposal');
      expect(fsmDestroy.currentState()).toBe('DESTROYED');
    });
  });

  describe('Disposal and Terminal State (DESTROYED)', () => {
    const destroyableStates: RuntimeLifecycleState[] = [
      'LOAD',
      'VALIDATE',
      'BUILD',
      'INITIALIZE',
      'READY',
      'PLAYING',
      'PAUSED',
      'SEEKING',
      'STOPPED',
      'ERROR',
    ];

    it.each(destroyableStates)('should allow teardown from %s directly to DESTROYED', (state) => {
      const fsm = new RuntimeStateMachine({ initialState: state });
      expect(fsm.canTransition('DESTROYED')).toBe(true);
      fsm.transition('DESTROYED', 'Component unmounted');
      expect(fsm.currentState()).toBe('DESTROYED');
    });

    it('should forbid any transition out of DESTROYED (terminal state)', () => {
      const fsm = new RuntimeStateMachine({ initialState: 'DESTROYED' });

      const allStates: RuntimeLifecycleState[] = [
        'LOAD',
        'VALIDATE',
        'BUILD',
        'INITIALIZE',
        'READY',
        'PLAYING',
        'PAUSED',
        'SEEKING',
        'STOPPED',
        'ERROR',
        'DESTROYED',
      ];

      for (const target of allStates) {
        expect(fsm.canTransition(target)).toBe(false);
        expect(() => fsm.transition(target)).toThrow(InvalidStateTransitionError);
      }
    });
  });

  describe('Invalid Transitions and State Permanency (Atomicity)', () => {
    it('should reject direct transition from LOAD to PLAYING', () => {
      const fsm = new RuntimeStateMachine({ initialState: 'LOAD' });

      expect(fsm.canTransition('PLAYING')).toBe(false);
      expect(() => fsm.transition('PLAYING')).toThrow(InvalidStateTransitionError);
    });

    it('should reject skipping initialization phases', () => {
      const fsm = new RuntimeStateMachine({ initialState: 'LOAD' });
      expect(() => fsm.transition('BUILD')).toThrow(InvalidStateTransitionError);
      expect(() => fsm.transition('READY')).toThrow(InvalidStateTransitionError);
      expect(() => fsm.transition('PAUSED')).toThrow(InvalidStateTransitionError);
    });

    it('should reject transitioning backward to preparation phases once READY', () => {
      const fsm = new RuntimeStateMachine({ initialState: 'READY' });
      expect(fsm.canTransition('LOAD')).toBe(false);
      expect(fsm.canTransition('VALIDATE')).toBe(false);
      expect(fsm.canTransition('BUILD')).toBe(false);
      expect(fsm.canTransition('INITIALIZE')).toBe(false);

      expect(() => fsm.transition('LOAD')).toThrow(InvalidStateTransitionError);
      expect(() => fsm.transition('VALIDATE')).toThrow(InvalidStateTransitionError);
      expect(() => fsm.transition('BUILD')).toThrow(InvalidStateTransitionError);
      expect(() => fsm.transition('INITIALIZE')).toThrow(InvalidStateTransitionError);
    });

    it('should reject transitioning backward from PLAYING to preparation states', () => {
      const fsm = new RuntimeStateMachine({ initialState: 'PLAYING' });
      expect(() => fsm.transition('LOAD')).toThrow(InvalidStateTransitionError);
      expect(() => fsm.transition('VALIDATE')).toThrow(InvalidStateTransitionError);
      expect(() => fsm.transition('BUILD')).toThrow(InvalidStateTransitionError);
      expect(() => fsm.transition('INITIALIZE')).toThrow(InvalidStateTransitionError);
    });

    it('should reject illegal self-transitions (except SEEKING)', () => {
      const nonCoalescingStates: RuntimeLifecycleState[] = [
        'LOAD',
        'VALIDATE',
        'BUILD',
        'INITIALIZE',
        'READY',
        'PLAYING',
        'PAUSED',
        'STOPPED',
        'ERROR',
      ];

      for (const state of nonCoalescingStates) {
        const fsm = new RuntimeStateMachine({ initialState: state });
        expect(fsm.canTransition(state)).toBe(false);
        expect(() => fsm.transition(state)).toThrow(InvalidStateTransitionError);
      }
    });

    it('should guarantee state permanency when an invalid transition throws', () => {
      const fsm = new RuntimeStateMachine({ initialState: 'PLAYING' });
      fsm.transition('PAUSED', 'Valid pause');

      const stateBefore = fsm.currentState();
      const prevBefore = fsm.previousState();
      const historyBefore = fsm.history();

      expect(() => fsm.transition('LOAD')).toThrow(InvalidStateTransitionError);

      // Verify that internal state was not corrupted
      expect(fsm.currentState()).toBe(stateBefore);
      expect(fsm.previousState()).toBe(prevBefore);
      expect(fsm.history()).toEqual(historyBefore);
    });

    it('should populate error details on InvalidStateTransitionError', () => {
      const fsm = new RuntimeStateMachine({ initialState: 'VALIDATE' });

      try {
        fsm.transition('PLAYING', 'Attempting illegal shortcut');
        expect.fail('Expected transition to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidStateTransitionError);
        const error = err as InvalidStateTransitionError;
        expect(error.from).toBe('VALIDATE');
        expect(error.to).toBe('PLAYING');
        expect(error.message).toContain('VALIDATE');
        expect(error.message).toContain('PLAYING');
      }
    });
  });

  describe('Reset and Re-initialization', () => {
    it('should reset back to LOAD by default, clearing previousState and history', () => {
      const fsm = new RuntimeStateMachine();
      fsm.transition('VALIDATE');
      fsm.transition('BUILD');

      expect(fsm.currentState()).toBe('BUILD');
      expect(fsm.previousState()).toBe('VALIDATE');
      expect(fsm.history()).toHaveLength(2);

      fsm.reset();

      expect(fsm.currentState()).toBe('LOAD');
      expect(fsm.previousState()).toBeNull();
      expect(fsm.history()).toEqual([]);
    });

    it('should allow resetting to a specified target state', () => {
      const fsm = new RuntimeStateMachine();
      fsm.transition('VALIDATE');

      fsm.reset('READY');

      expect(fsm.currentState()).toBe('READY');
      expect(fsm.previousState()).toBeNull();
      expect(fsm.history()).toEqual([]);
    });
  });

  describe('History Tracking and Sequence Counter', () => {
    it('should track transitions with monotonic sequence counters and reasons', () => {
      const fsm = new RuntimeStateMachine();
      fsm.transition('VALIDATE', 'Reason 1');
      fsm.transition('BUILD', 'Reason 2');
      fsm.transition('INITIALIZE');

      const history = fsm.history();
      expect(history).toHaveLength(3);

      expect(history[0]).toEqual({
        from: 'LOAD',
        to: 'VALIDATE',
        sequence: 1,
        reason: 'Reason 1',
      });

      expect(history[1]).toEqual({
        from: 'VALIDATE',
        to: 'BUILD',
        sequence: 2,
        reason: 'Reason 2',
      });

      expect(history[2]).toEqual({
        from: 'BUILD',
        to: 'INITIALIZE',
        sequence: 3,
      });
    });

    it('should provide an immutable defensive copy of the history array', () => {
      const fsm = new RuntimeStateMachine();
      fsm.transition('VALIDATE');

      const history = fsm.history() as unknown[];
      history.push({ from: 'HACK', to: 'HACK', sequence: 999 });

      expect(fsm.history()).toHaveLength(1);
      expect(fsm.history()[0].to).toBe('VALIDATE');
    });

    it('should prune history when maxHistorySize is exceeded', () => {
      const fsm = new RuntimeStateMachine({
        initialState: 'READY',
        maxHistorySize: 3,
      });

      fsm.transition('PLAYING'); // seq 1
      fsm.transition('PAUSED'); // seq 2
      fsm.transition('PLAYING'); // seq 3
      fsm.transition('PAUSED'); // seq 4 (causes shift of seq 1)

      const history = fsm.history();
      expect(history).toHaveLength(3);
      expect(history[0].sequence).toBe(2);
      expect(history[1].sequence).toBe(3);
      expect(history[2].sequence).toBe(4);
    });
  });

  describe('Exhaustive Transition Matrix Consistency', () => {
    it('should match ALLOWED_TRANSITIONS table for all possible pairs', () => {
      const allStates = Object.keys(ALLOWED_TRANSITIONS) as RuntimeLifecycleState[];

      for (const fromState of allStates) {
        const allowedTargets = ALLOWED_TRANSITIONS[fromState];
        const fsm = new RuntimeStateMachine({ initialState: fromState });

        for (const targetState of allStates) {
          const isAllowed = allowedTargets.has(targetState);
          expect(fsm.canTransition(targetState)).toBe(isAllowed);
        }
      }
    });
  });

  describe('Determinism', () => {
    it('should produce identical state and history for identical transition sequences', () => {
      const fsm1 = new RuntimeStateMachine();
      const fsm2 = new RuntimeStateMachine();

      const sequence: [RuntimeLifecycleState, string][] = [
        ['VALIDATE', 'Manifest validation'],
        ['BUILD', 'Dependency tree resolve'],
        ['INITIALIZE', 'Canvas attachment'],
        ['READY', 'Baseline ready'],
        ['PLAYING', 'Timeline run'],
        ['PAUSED', 'Break point'],
        ['SEEKING', 'Scrub request'],
        ['PLAYING', 'Resume'],
        ['STOPPED', 'Halt'],
      ];

      for (const [state, reason] of sequence) {
        fsm1.transition(state, reason);
        fsm2.transition(state, reason);
      }

      expect(fsm1.currentState()).toBe(fsm2.currentState());
      expect(fsm1.previousState()).toBe(fsm2.previousState());
      expect(fsm1.history()).toEqual(fsm2.history());
    });
  });
});
