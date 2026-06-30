import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useFinishedIssueRatingsView } from "../../../src/features/finishedIssueDialog/hooks/useFinishedIssueRatingsView.js";
import {
  buildFinishedIssueBaseFixture,
  buildSingleCriterionFinishedIssueFixture,
} from "../../mocks/fixtures/finishedIssueDialog.fixtures.js";

describe("useFinishedIssueRatingsView", () => {
  it("derives phase-specific ratings and updates when the phase changes", async () => {
    const issue = buildFinishedIssueBaseFixture();

    const { result, rerender } = renderHook(
      ({ viewIssue, currentPhaseIndex, leafCriteria }) =>
        useFinishedIssueRatingsView({
          viewIssue,
          currentPhaseIndex,
          leafCriteria,
        }),
      {
        initialProps: {
          viewIssue: issue,
          currentPhaseIndex: 0,
          leafCriteria: issue.modelParams.leafCriteria,
        },
      }
    );

    await waitFor(() => expect(result.current.selectedExpert).toBe("anon@example.com"));
    expect(result.current.evaluations).toEqual({
      stage: "phase-0-anon",
    });
    expect(result.current.collectiveEvaluations).toEqual({
      shared: "phase-0-localized",
    });

    rerender({
      viewIssue: issue,
      currentPhaseIndex: 1,
      leafCriteria: issue.modelParams.leafCriteria,
    });

    await waitFor(() => expect(result.current.selectedExpert).toBe("removed@example.com"));
    expect(result.current.evaluations).toEqual({
      stage: "phase-1-removed",
    });
    expect(result.current.collectiveEvaluations).toEqual({
      shared: "phase-1-shared",
    });
  });

  it("handles single-criterion and anonymized expert payloads without crashing", async () => {
    const issue = buildSingleCriterionFinishedIssueFixture();
    issue.expertsRatings = {
      0: {
        expertEvaluations: {
          "Deleted user": {
            stage: "single-criterion",
          },
        },
        criteriaWeightsEvaluationByExpert: {
          "Deleted user": {
            status: "notRequired",
          },
        },
      },
    };

    const { result } = renderHook(() =>
      useFinishedIssueRatingsView({
        viewIssue: issue,
        currentPhaseIndex: 0,
        leafCriteria: issue.modelParams.leafCriteria,
      })
    );

    await waitFor(() => expect(result.current.selectedExpert).toBe("Deleted user"));
    expect(result.current.expertList).toEqual(["Deleted user"]);
    expect(result.current.evaluations).toEqual({
      stage: "single-criterion",
    });
    expect(result.current.shouldShowExpertWeights).toBe(true);
  });

  it("returns a safe empty state for malformed ratings payloads", () => {
    const { result } = renderHook(() =>
      useFinishedIssueRatingsView({
        viewIssue: {
          summary: {
            evaluationStructureKey: "alternativeCriteriaMatrix",
          },
          expertsRatings: {
            0: null,
          },
        },
        currentPhaseIndex: 0,
        leafCriteria: [],
      })
    );

    expect(result.current.expertList).toEqual([]);
    expect(result.current.selectedExpert).toBe("");
    expect(result.current.evaluations).toBeNull();
    expect(result.current.criteriaWeightsEvaluation).toBeNull();
    expect(result.current.collectiveEvaluations).toBeNull();
    expect(result.current.canShowCollective).toBe(false);
  });
});
