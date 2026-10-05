import { describe, expect, it } from 'vitest';
import { VirtualClock } from './virtual-clock';

describe('VirtualClock', () => {
  it('initializes with default state STOPPED, time 0, and speed 1.0', () => {
    const clock = new VirtualClock();
    expect(clock.time).toBe(0);
    expect(clock.state).toBe('STOPPED');
    expect(clock.speed).toBe(1.0);
    expect(clock.isStopped).toBe(true);
    expect(clock.isPlaying).toBe(false);
    expect(clock.isPaused).toBe(false);
  });

  it('respects initialTimeMs option in constructor', () => {
    const clock = new VirtualClock({ initialTimeMs: 1500, defaultSpeed: 2.0 });
    expect(clock.time).toBe(1500);
    expect(clock.speed).toBe(2.0);
  });

  it('transitions through READY, PLAYING, PAUSED, and RESUME states', () => {
    const clock = new VirtualClock();

    clock.ready();
    expect(clock.state).toBe('READY');

    clock.play();
    expect(clock.state).toBe('PLAYING');
    expect(clock.isPlaying).toBe(true);

    clock.pause();
    expect(clock.state).toBe('PAUSED');
    expect(clock.isPaused).toBe(true);

    clock.resume();
    expect(clock.state).toBe('PLAYING');
  });

  it('advances virtual time on tick when in PLAYING state', () => {
    const clock = new VirtualClock();
    clock.play();

    clock.tick(16);
    expect(clock.time).toBe(16);

    clock.tick(16);
    expect(clock.time).toBe(32);

    clock.tick(100);
    expect(clock.time).toBe(132);
  });

  it('does NOT advance time on tick when STOPPED', () => {
    const clock = new VirtualClock();
    expect(clock.isStopped).toBe(true);

    const timeAfterTick = clock.tick(100);
    expect(timeAfterTick).toBe(0);
    expect(clock.time).toBe(0);
  });

  it('does NOT advance time on tick when PAUSED', () => {
    const clock = new VirtualClock();
    clock.play();
    clock.tick(500);
    expect(clock.time).toBe(500);

    clock.pause();
    expect(clock.isPaused).toBe(true);

    clock.tick(100);
    clock.tick(200);
    expect(clock.time).toBe(500);
  });

  it('throws an error if tick receives a negative deltaMs', () => {
    const clock = new VirtualClock();
    clock.play();

    expect(() => clock.tick(-16)).toThrowError(
      'VirtualClock: deltaMs must be non-negative. Received: -16',
    );
    expect(clock.time).toBe(0);
  });

  it('resets virtual time to 0 and transitions to STOPPED when stopped', () => {
    const clock = new VirtualClock();
    clock.play();
    clock.tick(1000);
    expect(clock.time).toBe(1000);

    clock.stop();
    expect(clock.time).toBe(0);
    expect(clock.isStopped).toBe(true);
  });

  it('resets virtual time and restores default speed when reset() is called', () => {
    const clock = new VirtualClock({ defaultSpeed: 1.0 });
    clock.play();
    clock.setSpeed(2.0);
    clock.tick(500);

    clock.reset();
    expect(clock.time).toBe(0);
    expect(clock.speed).toBe(1.0);
    expect(clock.state).toBe('READY');
  });

  it('allows backward time movement exclusively via seek()', () => {
    const clock = new VirtualClock();
    clock.play();
    clock.tick(1200);
    expect(clock.time).toBe(1200);

    // Backward seek
    clock.seek(500);
    expect(clock.time).toBe(500);

    // Forward seek
    clock.seek(2500);
    expect(clock.time).toBe(2500);

    // Seek back to zero
    clock.seek(0);
    expect(clock.time).toBe(0);

    // Seek clamps negative numbers to 0
    clock.seek(-100);
    expect(clock.time).toBe(0);
  });

  it('only advances forward with advanceTo() and refuses backward movement', () => {
    const clock = new VirtualClock();
    clock.play();
    clock.tick(500);
    expect(clock.time).toBe(500);

    // Forward advanceTo works
    clock.advanceTo(800);
    expect(clock.time).toBe(800);

    // Backward advanceTo is a no-op
    clock.advanceTo(300);
    expect(clock.time).toBe(800); // Remains at 800
  });

  it('handles explicit beginSeek and endSeek state transitions', () => {
    const clock = new VirtualClock();
    clock.play();

    clock.beginSeek();
    expect(clock.state).toBe('SEEKING');

    clock.seek(3000);
    expect(clock.time).toBe(3000);

    clock.endSeek();
    expect(clock.state).toBe('PLAYING');
  });

  it('scales delta correctly across multiple speeds: 0.25x, 0.5x, 1x, 1.5x, 2x, 5x', () => {
    const clock = new VirtualClock();
    clock.play();

    // 0.25x
    clock.setSpeed(0.25);
    clock.tick(100);
    expect(clock.time).toBe(25);

    // 0.5x
    clock.setSpeed(0.5);
    clock.tick(100);
    expect(clock.time).toBe(75); // 25 + 50

    // 1x
    clock.setSpeed(1.0);
    clock.tick(100);
    expect(clock.time).toBe(175); // 75 + 100

    // 1.5x
    clock.setSpeed(1.5);
    clock.tick(100);
    expect(clock.time).toBe(325); // 175 + 150

    // 2x
    clock.setSpeed(2.0);
    clock.tick(100);
    expect(clock.time).toBe(525); // 325 + 200

    // 5x
    clock.setSpeed(5.0);
    clock.tick(100);
    expect(clock.time).toBe(1025); // 525 + 500
  });

  it('clamps invalid or negative speeds to safe bounds', () => {
    const clock = new VirtualClock();
    clock.setSpeed(-2);
    expect(clock.speed).toBe(1.0); // restored default

    clock.setSpeed(0.05); // below min 0.1
    expect(clock.speed).toBe(0.1);

    clock.setSpeed(50); // above max 10.0
    expect(clock.speed).toBe(10.0);
  });

  it('guarantees 100% deterministic time progression', () => {
    const runSimulation = () => {
      const clock = new VirtualClock();
      clock.play();
      clock.tick(16.666);
      clock.tick(33.333);
      clock.setSpeed(1.5);
      clock.tick(50);
      clock.pause();
      clock.tick(100); // ignored
      clock.resume();
      clock.tick(20);
      clock.seek(800);
      clock.tick(10);
      return clock.time;
    };

    const run1 = runSimulation();
    const run2 = runSimulation();
    const run3 = runSimulation();

    expect(run1).toBe(run2);
    expect(run2).toBe(run3);
    expect(run1).toBe(815);
  });

  it('produces an accurate immutable snapshot', () => {
    const clock = new VirtualClock();
    clock.play();
    clock.setSpeed(2.0);
    clock.tick(120);

    const snapshot = clock.snapshot();
    expect(snapshot).toEqual({
      timeMs: 240,
      state: 'PLAYING',
      speed: 2.0,
    });
  });
});
