import {
  EvaluationCheckpoint,
  EvaluationQuizQuestion,
  ExperienceManifest,
  NarrativeScript,
} from '../contracts/experience-manifest.types';
import { LegacyLessonManifest } from '../contracts/legacy-lesson.types';

/**
 * Adapter converting legacy ADR-004 Lesson Manifests to modern ADR-008 Experience Manifests.
 * Ensures backward compatibility transparently: the Runtime never knows it is executing a legacy lesson.
 * Pure transformation without side effects or mutation.
 */
export class LegacyLessonAdapter {
  /**
   * Adapts a legacy LessonManifest into a canonical ExperienceManifest.
   */
  adapt(legacy: LegacyLessonManifest): ExperienceManifest {
    const meta = legacy.metadata ?? {};
    const steps = legacy.steps ?? [];

    const scenes: Record<string, unknown> = {};
    const snippets: Record<string, unknown> = {};
    const scripts: NarrativeScript[] = [];
    const checkpoints: EvaluationCheckpoint[] = [];
    const quizzes: EvaluationQuizQuestion[] = [];
    const markers: { id: string; label: string; timeMs: number }[] = [];

    const stepIntervalMs = 4000;

    for (const s of steps) {
      const stepIndex = s.step;
      const stepTimeMs = (stepIndex - 1) * stepIntervalMs;

      // Extract scene
      if (s.sceneData) {
        scenes[`scene_step_${stepIndex}`] = s.sceneData;
      }

      // Extract code snippet
      if (s.codeSnippet) {
        snippets[`snippet_step_${stepIndex}`] = s.codeSnippet;
      }

      // Extract narrative script
      let content = s.explanation ?? '';
      if (s.keyConcept) {
        content += `\n\n> **Concepto Clave:** ${s.keyConcept}`;
      }

      scripts.push({
        id: `script_step_${stepIndex}`,
        stepNumber: stepIndex,
        title: s.title,
        content,
      });

      // Extract evaluation checkpoints
      if (s.checkpoint) {
        checkpoints.push({
          id: s.checkpoint.id,
          criteria: s.checkpoint.criteria,
          hint: s.checkpoint.hint,
        });
      }

      // Extract evaluation questions
      if (s.question) {
        quizzes.push({
          id: s.question.id,
          prompt: s.question.prompt,
          options: s.question.options,
          correctIndex: s.question.correctIndex,
          explanation: s.question.explanation,
        });
      }

      // Create timeline markers
      markers.push({
        id: `marker_step_${stepIndex}`,
        label: s.title,
        timeMs: stepTimeMs,
      });
    }

    const durationMs = Math.max(stepIntervalMs, steps.length * stepIntervalMs);

    return {
      $schema: 'https://case-visual-lab.io/schemas/v2/experience-manifest.json',
      schemaVersion: '2.0.0',
      manifestVersion: '1.0.0',
      contentVersion:
        typeof legacy['version'] === 'string' ? (legacy['version'] as string) : '1.0.0',
      metadata: {
        id: legacy.id || meta.id || 'legacy-lesson',
        title: legacy.title || meta.title || 'Legacy Lesson',
        slug: meta.slug || legacy.id,
        subtitle: legacy.summary || meta.summary,
        description: legacy.summary || meta.summary || legacy.title,
        author: meta.author ?? 'CASE Architecture Guild',
        category: legacy.category || meta.category || 'general',
        tags: meta.tags ?? [],
        difficulty: legacy.level || meta.level || 'intermediate',
        estimatedMinutes: legacy.estimatedMinutes || meta.estimatedMinutes || 10,
        icon: meta.icon,
      },
      profile: {
        type: 'lesson',
        policy: {
          allowFreeNavigation: true,
          enforceMandatoryCheckpoints: true,
        },
      },
      assets: {
        scenes,
        snippets,
      },
      narrative: {
        scripts,
      },
      evaluation: {
        checkpoints,
        quizzes,
      },
      timeline: {
        durationMs,
        markers,
      },
      extensions: {
        legacy: {
          originalObjectives: legacy.objectives ?? [],
        },
      },
    };
  }
}
