import { useState } from "react";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import EvaluationStructureRenderer from "../../../src/features/issueEvaluation/components/EvaluationStructureRenderer.jsx";
import {
  EVALUATION_STAGES,
  getEvaluationStructureEntry,
} from "../../../src/features/decisionPlugins/evaluations";
import AHPSortAlternativeProfilesView from "../../../src/features/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/AHPSortAlternativeProfilesView.jsx";
import {
  analyzeAHPSortAlternativeProfilesEvaluation,
  buildEmptyAHPSortAlternativeProfilesEvaluation,
  getAlternativeToProfileValue,
  getOrientedProfileComparisonValue,
  updateAlternativeToProfileComparison,
  updateOrientedProfileComparison,
  validateAHPSortAlternativeProfilesForSubmit,
} from "../../../src/features/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/operations/evaluationPayload.js";
import { resolveAHPSortAlternativeProfilesContext } from "../../../src/features/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/operations/resolveContext.js";
import { renderWithProviders } from "../../setup/renderWithProviders.jsx";

vi.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows, columns, "aria-label": ariaLabel }) => (
    <div role="grid" aria-label={ariaLabel}>
      <div role="row">
        {columns.map((column) => (
          <div key={column.field} role="columnheader">{column.headerName}</div>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.id} role="row">
          {columns.map((column) => (
            <div key={column.field} role="gridcell">
              {typeof column.renderCell === "function"
                ? column.renderCell({ row, field: column.field })
                : row[column.field]}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

const limitingDecisionContext = () => ({
  structure: { key: "ahpSortAlternativeProfiles", stage: "alternativeEvaluation" },
  alternatives: [
    { id: "alternative-a", name: "Premium option" },
    { id: "alternative-b", name: "Balanced option" },
  ],
  leafCriteria: [
    { id: "criterion-quality", name: "Quality" },
    { id: "criterion-cost", name: "Cost" },
  ],
  modelParameters: {
    orderedCategories: [
      { categoryId: "category-low", label: "Low", order: 0 },
      { categoryId: "category-medium", label: "Medium", order: 1 },
      { categoryId: "category-high", label: "High", order: 2 },
    ],
    ahpSortProfiles: {
      mode: "limiting",
      profiles: [
        { profileId: "profile-medium-high", lowerCategoryId: "category-medium", upperCategoryId: "category-high" },
        { profileId: "profile-low-medium", lowerCategoryId: "category-low", upperCategoryId: "category-medium" },
      ],
    },
  },
});

const centralDecisionContext = () => {
  const context = limitingDecisionContext();
  context.modelParameters.ahpSortProfiles = {
    mode: "central",
    tiePolicy: "pessimistic",
    profiles: [
      { profileId: "profile-high", categoryId: "category-high" },
      { profileId: "profile-low", categoryId: "category-low" },
      { profileId: "profile-medium", categoryId: "category-medium" },
    ],
  };
  return context;
};

const buildCompleteEvaluation = (context) => {
  const resolved = resolveAHPSortAlternativeProfilesContext({ decisionContext: context });
  const evaluation = buildEmptyAHPSortAlternativeProfilesEvaluation();
  context.leafCriteria.forEach((criterion) => {
    context.alternatives.forEach((alternative) => {
      resolved.profiles.forEach((profile) => {
        evaluation.alternativeProfileComparisons.push({
          alternativeId: alternative.id,
          criterionId: criterion.id,
          profileId: profile.profileId,
          alternativeToProfile: 3,
        });
      });
    });
    for (let index = 0; index < resolved.profiles.length - 1; index += 1) {
      for (let next = index + 1; next < resolved.profiles.length; next += 1) {
        evaluation.profileComparisons.push({
          criterionId: criterion.id,
          firstProfileId: resolved.profiles[index].profileId,
          secondProfileId: resolved.profiles[next].profileId,
          firstToSecond: 1 / 3,
        });
      }
    }
  });
  return evaluation;
};

describe("AHPSort I alternative-profile evaluation structure", () => {
  it("is discovered for the alternativeEvaluation stage and starts with an empty payload", () => {
    const structure = getEvaluationStructureEntry("ahpSortAlternativeProfiles");

    expect(structure).toMatchObject({
      key: "ahpSortAlternativeProfiles",
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      displayLabel: "AHPSort I alternative-profile comparisons",
    });
    expect(structure.buildInitialEvaluation({ decisionContext: limitingDecisionContext() })).toEqual({
      alternativeProfileComparisons: [],
      profileComparisons: [],
    });
    expect(structure.validateForSubmit({
      decisionContext: limitingDecisionContext(),
      evaluation: buildEmptyAHPSortAlternativeProfilesEvaluation(),
    }).valid).toBe(false);
  });

  it("orders limiting and central profiles by their category associations, not payload order", () => {
    const limiting = resolveAHPSortAlternativeProfilesContext({
      decisionContext: limitingDecisionContext(),
    });
    const central = resolveAHPSortAlternativeProfilesContext({
      decisionContext: centralDecisionContext(),
    });

    expect(limiting.profiles.map(({ profileId, label }) => [profileId, label])).toEqual([
      ["profile-low-medium", "Low → Medium"],
      ["profile-medium-high", "Medium → High"],
    ]);
    expect(central.profiles.map(({ profileId, label }) => [profileId, label])).toEqual([
      ["profile-low", "Low center"],
      ["profile-medium", "Medium center"],
      ["profile-high", "High center"],
    ]);
  });

  it("rejects incomplete or ambiguous evaluation contexts rather than showing a valid-looking matrix", () => {
    const duplicateAlternative = limitingDecisionContext();
    duplicateAlternative.alternatives[1].id = "alternative-a";
    const invalidCategory = limitingDecisionContext();
    invalidCategory.modelParameters.orderedCategories = [invalidCategory.modelParameters.orderedCategories[0]];
    invalidCategory.modelParameters.ahpSortProfiles.profiles = [];
    const missingProfile = limitingDecisionContext();
    missingProfile.modelParameters.ahpSortProfiles.profiles.pop();

    expect(() => resolveAHPSortAlternativeProfilesContext({ decisionContext: duplicateAlternative }))
      .toThrow("Alternatives item 2 must have a unique ID and name.");
    expect(() => resolveAHPSortAlternativeProfilesContext({ decisionContext: invalidCategory }))
      .toThrow("AHPSort I requires at least two ordered categories.");
    expect(() => resolveAHPSortAlternativeProfilesContext({ decisionContext: missingProfile }))
      .toThrow("Configure one profile for each category reference before evaluating.");
  });

  it("updates alternative judgments as numeric Saaty values and removes cleared rows", () => {
    const evaluation = buildEmptyAHPSortAlternativeProfilesEvaluation();
    const withJudgment = updateAlternativeToProfileComparison({
      evaluation,
      criterionId: "criterion-quality",
      alternativeId: "alternative-a",
      profileId: "profile-low-medium",
      value: 5,
    });

    expect(withJudgment.alternativeProfileComparisons).toEqual([{
      alternativeId: "alternative-a",
      criterionId: "criterion-quality",
      profileId: "profile-low-medium",
      alternativeToProfile: 5,
    }]);
    expect(typeof withJudgment.alternativeProfileComparisons[0].alternativeToProfile).toBe("number");
    expect(getAlternativeToProfileValue({
      assessment: analyzeAHPSortAlternativeProfilesEvaluation({
        resolvedContext: resolveAHPSortAlternativeProfilesContext({ decisionContext: limitingDecisionContext() }),
        evaluation: withJudgment,
      }),
      criterionId: "criterion-quality",
      alternativeId: "alternative-a",
      profileId: "profile-low-medium",
    })).toBe(5);
    expect(updateAlternativeToProfileComparison({
      evaluation: withJudgment,
      criterionId: "criterion-quality",
      alternativeId: "alternative-a",
      profileId: "profile-low-medium",
      value: null,
    }).alternativeProfileComparisons).toEqual([]);
  });

  it("stores one canonical profile pair and shows the reciprocal from either orientation", () => {
    const resolved = resolveAHPSortAlternativeProfilesContext({ decisionContext: limitingDecisionContext() });
    const evaluation = updateOrientedProfileComparison({
      evaluation: buildEmptyAHPSortAlternativeProfilesEvaluation(),
      context: resolved,
      criterionId: "criterion-quality",
      rowProfileId: "profile-medium-high",
      columnProfileId: "profile-low-medium",
      value: 1 / 3,
    });
    const assessment = analyzeAHPSortAlternativeProfilesEvaluation({
      resolvedContext: resolved,
      evaluation,
    });

    expect(evaluation.profileComparisons).toEqual([{
      criterionId: "criterion-quality",
      firstProfileId: "profile-low-medium",
      secondProfileId: "profile-medium-high",
      firstToSecond: 3,
    }]);
    expect(getOrientedProfileComparisonValue({
      assessment,
      criterionId: "criterion-quality",
      rowProfileId: "profile-low-medium",
      columnProfileId: "profile-medium-high",
    })).toBe(3);
    expect(getOrientedProfileComparisonValue({
      assessment,
      criterionId: "criterion-quality",
      rowProfileId: "profile-medium-high",
      columnProfileId: "profile-low-medium",
    })).toBe(1 / 3);

    const updated = updateOrientedProfileComparison({
      evaluation,
      context: resolved,
      criterionId: "criterion-quality",
      rowProfileId: "profile-low-medium",
      columnProfileId: "profile-medium-high",
      value: 7,
    });
    expect(updated.profileComparisons).toHaveLength(1);
    expect(updated.profileComparisons[0].firstToSecond).toBe(7);
  });

  it("derives complete progress from valid unique coverage and rejects duplicates and bad references", () => {
    const context = limitingDecisionContext();
    const resolved = resolveAHPSortAlternativeProfilesContext({ decisionContext: context });
    const completeEvaluation = buildCompleteEvaluation(context);
    const complete = analyzeAHPSortAlternativeProfilesEvaluation({
      resolvedContext: resolved,
      evaluation: completeEvaluation,
    });

    expect(complete.totalExpected).toBe(10);
    expect(complete.completed).toBe(10);
    expect(complete.complete).toBe(true);
    expect(validateAHPSortAlternativeProfilesForSubmit({
      decisionContext: context,
      evaluation: completeEvaluation,
    })).toEqual({ valid: true, message: "" });

    const duplicateEvaluation = {
      ...completeEvaluation,
      profileComparisons: [
        ...completeEvaluation.profileComparisons,
        { ...completeEvaluation.profileComparisons[0], firstProfileId: "profile-medium-high", secondProfileId: "profile-low-medium", firstToSecond: 3 },
      ],
    };
    const duplicate = analyzeAHPSortAlternativeProfilesEvaluation({
      resolvedContext: resolved,
      evaluation: duplicateEvaluation,
    });
    expect(duplicate.complete).toBe(false);
    expect(duplicate.completed).toBe(9);
    expect(duplicate.invalidCount).toBeGreaterThan(0);

    const invalidReference = {
      ...completeEvaluation,
      alternativeProfileComparisons: completeEvaluation.alternativeProfileComparisons.map((row, index) =>
        index === 0 ? { ...row, alternativeId: "unknown-alternative" } : row
      ),
    };
    expect(analyzeAHPSortAlternativeProfilesEvaluation({
      resolvedContext: resolved,
      evaluation: invalidReference,
    }).complete).toBe(false);
  });

  it("renders through the generic evaluation renderer in read-only mode without exposing internal IDs", () => {
    const context = limitingDecisionContext();
    const evaluation = buildCompleteEvaluation(context);
    const { container } = renderWithProviders(
      <EvaluationStructureRenderer
        decisionContext={context}
        stage={EVALUATION_STAGES.ALTERNATIVE_EVALUATION}
        structureKey="ahpSortAlternativeProfiles"
        evaluation={evaluation}
        readOnly
      />
    );

    expect(screen.getByText("Alternative comparisons")).toBeInTheDocument();
    expect(screen.getByText("Profile comparisons")).toBeInTheDocument();
    expect(screen.getAllByRole("grid")).toHaveLength(2);
    expect(screen.getAllByText("Low → Medium").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Medium → High").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Neutral profile self-comparison")).toHaveLength(2);
    expect(container.textContent).not.toContain("profile-low-medium");
    expect(container.textContent).not.toContain("criterion-quality");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders the limiting comparison UI, offers exactly 17 Saaty options, and persists edits by stable IDs", async () => {
    const user = userEvent.setup();
    const context = limitingDecisionContext();
    const initialEvaluation = buildEmptyAHPSortAlternativeProfilesEvaluation();
    let latestEvaluation = initialEvaluation;
    const Wrapper = () => {
      const [evaluation, setEvaluationState] = useState(initialEvaluation);
      const setEvaluation = (next) => {
        latestEvaluation = next;
        setEvaluationState(next);
      };
      return (
        <AHPSortAlternativeProfilesView
          decisionContext={context}
          evaluation={evaluation}
          setEvaluation={setEvaluation}
        />
      );
    };
    renderWithProviders(
      <Wrapper />
    );

    expect(screen.getByRole("tab", { name: "Quality" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Cost" })).toBeInTheDocument();
    expect(screen.queryByText(/comparisons complete|remaining/)).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText("profile-low-medium")).not.toBeInTheDocument();

    const alternativeSelector = screen.getByRole("combobox", {
      name: "Compare Premium option with Low → Medium for Quality",
    });
    await user.click(alternativeSelector);
    expect(screen.getAllByRole("option")).toHaveLength(17);
    await user.click(screen.getByRole("option", { name: "5" }));
    expect(latestEvaluation).toEqual({
      alternativeProfileComparisons: [{
        alternativeId: "alternative-a",
        criterionId: "criterion-quality",
        profileId: "profile-low-medium",
        alternativeToProfile: 5,
      }],
      profileComparisons: [],
    });

    await user.click(screen.getByRole("tab", { name: "Cost" }));
    expect(screen.getByRole("heading", { name: "Cost" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Quality" }));
    expect(screen.getByRole("combobox", {
      name: "Compare Premium option with Low → Medium for Quality",
    })).toHaveTextContent("5");
    expect(latestEvaluation.alternativeProfileComparisons[0].criterionId).toBe("criterion-quality");
  });

  it("shows one alternative-by-profile grid and hides empty profile comparisons for one profile", () => {
    const context = limitingDecisionContext();
    context.leafCriteria = [context.leafCriteria[0]];
    context.modelParameters.orderedCategories = context.modelParameters.orderedCategories.slice(0, 2);
    context.modelParameters.ahpSortProfiles.profiles = [context.modelParameters.ahpSortProfiles.profiles[1]];

    renderWithProviders(
      <AHPSortAlternativeProfilesView
        decisionContext={context}
        evaluation={buildEmptyAHPSortAlternativeProfilesEvaluation()}
        setEvaluation={vi.fn()}
      />
    );

    expect(screen.getByRole("grid", { name: "Quality alternative to profile comparisons" })).toBeInTheDocument();
    expect(screen.getAllByRole("grid")).toHaveLength(1);
    expect(screen.queryByText("Profile comparisons")).not.toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("shows reciprocal profile judgments in both cells and does not create diagonal payloads", async () => {
    const user = userEvent.setup();
    const context = limitingDecisionContext();
    const Wrapper = () => {
      const [evaluation, setEvaluation] = useState(buildEmptyAHPSortAlternativeProfilesEvaluation());
      return <AHPSortAlternativeProfilesView decisionContext={context} evaluation={evaluation} setEvaluation={setEvaluation} />;
    };
    renderWithProviders(<Wrapper />);

    const reverse = screen.getByRole("combobox", {
      name: "Compare Medium → High with Low → Medium for Quality",
    });
    await user.click(reverse);
    await user.click(screen.getByRole("option", { name: "1/3" }));

    expect(screen.getByRole("combobox", {
      name: "Compare Low → Medium with Medium → High for Quality",
    })).toHaveTextContent("3");
    expect(screen.getByRole("combobox", {
      name: "Compare Medium → High with Low → Medium for Quality",
    })).toHaveTextContent("1/3");
    expect(screen.getAllByLabelText("Neutral profile self-comparison")).toHaveLength(2);
    expect(screen.getAllByRole("combobox").length).toBe(2 * 2 + 2);
  });

  it("renders central profiles and marks read-only missing judgments as pending", () => {
    const context = centralDecisionContext();
    const resolvedContext = resolveAHPSortAlternativeProfilesContext({ decisionContext: context });
    const centralAssessment = analyzeAHPSortAlternativeProfilesEvaluation({
      resolvedContext,
      evaluation: buildEmptyAHPSortAlternativeProfilesEvaluation(),
    });

    renderWithProviders(
      <AHPSortAlternativeProfilesView
        decisionContext={context}
        evaluation={buildEmptyAHPSortAlternativeProfilesEvaluation()}
        setEvaluation={vi.fn()}
        readOnly
      />
    );

    expect(screen.getByText("Central profiles")).toBeInTheDocument();
    expect(screen.getAllByText("Low center").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Medium center").length).toBeGreaterThan(0);
    expect(screen.getAllByText("High center").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("grid")).toHaveLength(2);
    expect(screen.getAllByLabelText("Neutral profile self-comparison")).toHaveLength(3);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(centralAssessment.totalExpected).toBe(18);
  });

  it("shows a clear error rather than a matrix when the context is invalid", () => {
    const context = limitingDecisionContext();
    context.modelParameters.ahpSortProfiles.profiles = [];
    renderWithProviders(
      <AHPSortAlternativeProfilesView
        decisionContext={context}
        evaluation={buildEmptyAHPSortAlternativeProfilesEvaluation()}
        setEvaluation={vi.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Configure one profile for each category reference");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });
});
