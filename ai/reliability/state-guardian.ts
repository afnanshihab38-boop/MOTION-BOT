/**
 * MOTION-BOT — State Guardian & Atomic Recovery
 * Phase 7.7: AI Output Validation + Reliability Layer
 *
 * Ensures that project state is never left partially modified or corrupted
 * by failed AI plans or interrupted tool executions. Takes atomic snapshots
 * and rolls back immediately if validation or execution fails.
 */

import { Project } from "@/types/project";
import { AtomicExecutionResult, ValidationIssue } from "./types";
import { cloneProject } from "@/services/project/project-serializer";
import { LLMLogger } from "../logger";

export class StateGuardian {
  /**
   * Captures an immutable snapshot of the project state.
   */
  public static snapshot(project: Project): Project {
    return cloneProject(project);
  }

  /**
   * Executes a mutating operation within an atomic boundary.
   * If the operation throws or returns invalid, restores the original state.
   */
  public static async executeAtomic<T>(
    initialProject: Project,
    operation: (workingCopy: Project) => Promise<{ result: T; updatedProject: Project; issues?: ValidationIssue[] }>
  ): Promise<AtomicExecutionResult<T>> {
    const snapshot = StateGuardian.snapshot(initialProject);
    const workingCopy = StateGuardian.snapshot(initialProject);

    try {
      const { result, updatedProject, issues = [] } = await operation(workingCopy);

      // Check if any fatal issues were reported
      const fatalIssues = issues.filter((i) => i.fatal);
      if (fatalIssues.length > 0) {
        LLMLogger.warn(
          "Atomic operation aborted due to fatal validation issues. Rolling back project state.",
          {
            provider: "state-guardian",
            model: "rollback",
            errorCode: "VALIDATION_ABORT",
          }
        );

        return {
          success: false,
          rolledBack: true,
          preservedState: snapshot,
          issues,
          error: fatalIssues[0].message,
        };
      }

      return {
        success: true,
        result,
        rolledBack: false,
        preservedState: updatedProject,
        issues,
      };
    } catch (err) {
      LLMLogger.error(
        `Atomic execution failed with error: ${err instanceof Error ? err.message : String(err)}. Restoring state snapshot.`,
        {
          provider: "state-guardian",
          model: "rollback",
          errorCode: "EXECUTION_EXCEPTION",
        }
      );

      return {
        success: false,
        rolledBack: true,
        preservedState: snapshot,
        issues: [
          {
            stage: "semantic",
            code: "TRANSACTION_ROLLBACK",
            message: err instanceof Error ? err.message : String(err),
            severity: "error",
            fatal: true,
          },
        ],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
