import { ExperienceProfileType } from '../../assets/contracts/experience-manifest.types';

/**
 * Mutable session state tracking execution progress, sequence counters,
 * and active profile metadata for the running experience.
 */
export interface ExecutionSession {
  readonly id: string;
  readonly experienceId: string;
  readonly startedAtTicks: number;
  frameSequence: number;
  lastTickVirtualTime: number;
  activeProfile: ExperienceProfileType;
}
