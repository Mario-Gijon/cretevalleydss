import { ThemeProvider, createTheme } from "@mui/material/styles";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardView from "../../../../../src/features/finishedIssueDialog/sections/dashboard/components/DashboardView.jsx";
import { buildDashboardData } from "../../../../../src/features/finishedIssueDialog/sections/dashboard/logic/buildFinishedIssueDashboardData.js";
import { selectFinishedIssueExecution } from "../../../../../src/features/finishedIssueDialog/logic/selectFinishedIssueExecution.js";
import { isAHPSortIExecution } from "../../../../../src/features/finishedIssueDialog/resultPresentations/modelFindings/ahp_sort_i.js";
import { buildResultsAnalysisWorkspaceData } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildResultsAnalysisWorkspaceData.js";
import VisualizationsPanel from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/components/VisualizationsPanel.jsx";

const limitingCategories = [
  { categoryId: "low-id", label: "Low", order: 0 },
  { categoryId: "medium-id", label: "Medium", order: 1 },
  { categoryId: "high-id", label: "High", order: 2 },
];

const criterionNames = [
  { id: "quality-id", name: "Quality" },
  { id: "safety-id", name: "Safety" },
];

const localEvidence = ({ profileIds, central = false, ratio = 0.03, status = "consistent" }) => {
  const profileKind = central ? "centralProfile" : "profile";
  const profilesById = Object.fromEntries(profileIds.map((id, index) => [id, index === 0 ? 0.15 : 0.05]));
  const profileWeightedById = Object.fromEntries(profileIds.map((id, index) => [id, index === 0 ? 0.105 : 0.035]));
  return {
    entityOrder: [
      { entityType: "alternative", alternativeId: "alt-a" },
      ...profileIds.map((profileId) => ({ entityType: profileKind, profileId })),
    ],
    pairwiseMatrix: [
      [1, ...profileIds.map(() => 2)],
      ...profileIds.map((_, rowIndex) => [0.5, ...profileIds.map((__, columnIndex) => rowIndex === columnIndex ? 1 : rowIndex < columnIndex ? 2 : 0.5)]),
    ],
    alternative: 0.8,
    ...(central ? { centralProfilesById: profilesById } : { profilesById }),
    consistency: {
      lambdaMax: profileIds.length === 1 ? 2 : 3.06,
      consistencyIndex: profileIds.length === 1 ? null : ratio * 0.58,
      randomIndex: profileIds.length === 1 ? null : 0.58,
      consistencyRatio: profileIds.length === 1 ? null : ratio,
      consistencyStatus: profileIds.length === 1 ? "not_applicable" : status,
    },
    _profileWeightedById: profileWeightedById,
  };
};

const limitingExecution = ({
  categories = limitingCategories,
  assignedCategoryId = "high-id",
  priority = 0.71,
  profilePriorities = { "boundary-lm": 0.3, "boundary-mh": 0.6 },
  diagnosticsOverrides = {},
  requestSnapshot,
  modelParameters,
} = {}) => {
  const profileIds = ["boundary-lm", "boundary-mh"];
  const quality = localEvidence({ profileIds });
  const safety = localEvidence({ profileIds });
  const diagnostics = {
    categoryId: assignedCategoryId,
    globalPriority: priority,
    profileGlobalPrioritiesById: profilePriorities,
    weightsByCriterion: { "quality-id": 0.7, "safety-id": 0.3 },
    weightedContributionsByCriterion: {
      "quality-id": { alternative: 0.56, profilesById: quality._profileWeightedById },
      "safety-id": { alternative: 0.15, profilesById: safety._profileWeightedById },
    },
    localPrioritiesByCriterion: {
      "quality-id": { ...quality, _profileWeightedById: undefined },
      "safety-id": { ...safety, alternative: 0.5, _profileWeightedById: undefined },
    },
    classification: { rule: "ordered_limiting_profiles_equal_goes_to_more_preferred_category" },
    ...diagnosticsOverrides,
  };
  const params = modelParameters || {
    orderedCategories: limitingCategories,
    ahpSortProfiles: {
      mode: "limiting",
      profiles: [
        { profileId: "boundary-lm", lowerCategoryId: "low-id", upperCategoryId: "medium-id" },
        { profileId: "boundary-mh", lowerCategoryId: "medium-id", upperCategoryId: "high-id" },
      ],
    },
  };
  return {
    resultStructureKey: "sorting",
    resultStructureVersion: 1,
    model: { name: "AHPSort I", technical: { apiModelKey: "ahp_sort_i" } },
    modelSpecificOutput: { apiModelKey: "ahp_sort_i" },
    modelParameters: params,
    ...(requestSnapshot ? { requestSnapshot } : {}),
    standardizedOutput: {
      categoryOrderSemantics: "lower-order-is-less-preferred",
      categories,
      assignments: [{ alternativeId: "alt-a", categoryId: assignedCategoryId }],
      diagnostics: {
        modelKey: "ahp_sort_i",
        profileMode: "limiting",
        resultsByAlternativeId: { "alt-a": diagnostics },
      },
    },
  };
};

const centralExecution = ({ policy = "optimistic", tied = true, assignedCategoryId, selectedProfileId, modelParameters } = {}) => {
  const assignedId = assignedCategoryId || (policy === "optimistic" ? "high-id" : "low-id");
  const selectedId = selectedProfileId || (policy === "optimistic" ? "center-high" : "center-low");
  const categories = [
    { categoryId: "low-id", label: "Low", order: 0 },
    { categoryId: "high-id", label: "High", order: 1 },
  ];
  const profileIds = ["center-low", "center-high"];
  const quality = localEvidence({ profileIds, central: true });
  const diagnostics = {
    categoryId: assignedId,
    globalPriority: tied ? 0.4 : 0.55,
    profileGlobalPrioritiesById: { "center-low": 0.2, "center-high": 0.6 },
    weightsByCriterion: { "quality-id": 1 },
    weightedContributionsByCriterion: {
      "quality-id": { alternative: 0.8, centralProfilesById: quality._profileWeightedById },
    },
    localPrioritiesByCriterion: {
      "quality-id": { ...quality, alternative: 0.8, _profileWeightedById: undefined },
    },
    classification: {
      rule: "nearest_central_profile_with_explicit_tie_policy",
      selectedCenterProfileId: selectedId,
      distanceToSelectedCenter: tied ? 0.2 : 0.05,
      centerDistancesByProfileId: tied ? { "center-low": 0.2, "center-high": 0.2 } : { "center-low": 0.35, "center-high": 0.05 },
      tieDetected: tied,
      tiedCenterProfileIds: tied ? ["center-low", "center-high"] : [selectedId],
      tiePolicy: policy,
    },
  };
  return {
    resultStructureKey: "sorting",
    resultStructureVersion: 1,
    model: { name: "AHPSort I" },
    modelSpecificOutput: { apiModelKey: "ahp_sort_i" },
    modelParameters: modelParameters || {
      orderedCategories: categories,
      ahpSortProfiles: {
        mode: "central",
        tiePolicy: policy,
        profiles: [
          { profileId: "center-high", categoryId: "high-id" },
          { profileId: "center-low", categoryId: "low-id" },
        ],
      },
    },
    standardizedOutput: {
      categoryOrderSemantics: "lower-order-is-less-preferred",
      categories,
      assignments: [{ alternativeId: "alt-a", categoryId: assignedId }],
      diagnostics: {
        modelKey: "ahp_sort_i",
        profileMode: "central",
        tiePolicy: policy,
        resultsByAlternativeId: { "alt-a": diagnostics },
      },
    },
  };
};

const groupExecution = ({ classifications, tiePolicy = "optimistic", includeRoster = true } = {}) => {
  const base = limitingExecution();
  const categoryDefinitions = [
    { categoryId: "low-id", label: "Low", order: 0 },
    { categoryId: "medium-id", label: "Medium", order: 1 },
    { categoryId: "high-id", label: "High", order: 2 },
  ];
  const profilePrioritiesByCategory = {
    "low-id": { "boundary-lm": 0.8, "boundary-mh": 0.9 },
    "medium-id": { "boundary-lm": 0.6, "boundary-mh": 0.8 },
    "high-id": { "boundary-lm": 0.3, "boundary-mh": 0.6 },
  };
  const expertIds = Object.keys(classifications).sort();
  const individualResultsByExpertId = Object.fromEntries(expertIds.map((expertId) => {
    const individual = structuredClone(base.standardizedOutput.diagnostics.resultsByAlternativeId["alt-a"]);
    individual.categoryId = classifications[expertId];
    individual.profileGlobalPrioritiesById = profilePrioritiesByCategory[classifications[expertId]];
    return [expertId, {
      modelKey: "ahp_sort_i",
      profileMode: "limiting",
      resultsByAlternativeId: { "alt-a": individual },
    }];
  }));
  const votesByCategoryId = Object.fromEntries(categoryDefinitions.map(({ categoryId }) => [
    categoryId,
    Object.values(classifications).filter((id) => id === categoryId).length,
  ]));
  const maxVotes = Math.max(...Object.values(votesByCategoryId));
  const tiedCategoryIds = categoryDefinitions
    .filter(({ categoryId }) => votesByCategoryId[categoryId] === maxVotes)
    .map(({ categoryId }) => categoryId);
  const selectedCategoryId = tiedCategoryIds.length > 1
    ? tiedCategoryIds[tiePolicy === "optimistic" ? tiedCategoryIds.length - 1 : 0]
    : tiedCategoryIds[0];
  const tieDetected = tiedCategoryIds.length > 1;
  const aggregationStatus = maxVotes === expertIds.length
    ? "unanimous"
    : tieDetected
      ? "tied_plurality"
      : "unique_plurality";

  return {
    ...base,
    modelParameters: {
      ...base.modelParameters,
      ahpSortGroup: { tiePolicy },
    },
    ...(includeRoster ? { expertRoster: expertIds.map((id, index) => ({ id, name: `Expert ${index + 1}` })) } : {}),
    standardizedOutput: {
      ...base.standardizedOutput,
      categories: categoryDefinitions,
      assignments: [{ alternativeId: "alt-a", categoryId: selectedCategoryId }],
      diagnostics: {
        modelKey: "ahp_sort_i",
        profileMode: "limiting",
        aggregationMethod: "unweighted_plurality_vote",
        groupTiePolicy: tiePolicy,
        individualResultsByExpertId,
        resultsByAlternativeId: {
          "alt-a": {
            categoryId: selectedCategoryId,
            selectedCategoryId,
            votesByCategoryId,
            classificationsByExpertId: classifications,
            aggregationStatus,
            isUnanimous: aggregationStatus === "unanimous",
            isUniquePlurality: !tieDetected,
            tieDetected,
            tiedCategoryIds: tieDetected ? tiedCategoryIds : [],
            tiePolicy: tieDetected ? tiePolicy : null,
          },
        },
      },
    },
  };
};

const centralGroupExecution = ({ profileTiePolicy, groupTiePolicy }) => {
  const categories = [
    { categoryId: "low-id", label: "Low", order: 0 },
    { categoryId: "high-id", label: "High", order: 1 },
  ];
  const individualResultsByExpertId = {};
  const classificationsByExpertId = {};
  for (const [index, expertId] of ["expert-a", "expert-b"].entries()) {
    const isTie = index === 0;
    const assignedCategoryId = isTie
      ? profileTiePolicy === "optimistic" ? "high-id" : "low-id"
      : profileTiePolicy === "optimistic" ? "low-id" : "high-id";
    const execution = centralExecution({ policy: profileTiePolicy, tied: isTie });
    const diagnostics = structuredClone(execution.standardizedOutput.diagnostics);
    const individualResult = diagnostics.resultsByAlternativeId["alt-a"];
    individualResult.categoryId = assignedCategoryId;
    if (!isTie) {
      const selectedCenterProfileId = assignedCategoryId === "high-id" ? "center-high" : "center-low";
      const priority = assignedCategoryId === "high-id" ? 0.9 : 0.1;
      individualResult.globalPriority = priority;
      individualResult.classification = {
        ...individualResult.classification,
        selectedCenterProfileId,
        distanceToSelectedCenter: assignedCategoryId === "high-id" ? 0.3 : 0.1,
        centerDistancesByProfileId: assignedCategoryId === "high-id"
          ? { "center-low": 0.7, "center-high": 0.3 }
          : { "center-low": 0.1, "center-high": 0.5 },
        tieDetected: false,
        tiedCenterProfileIds: [selectedCenterProfileId],
      };
    }
    individualResultsByExpertId[expertId] = diagnostics;
    classificationsByExpertId[expertId] = assignedCategoryId;
  }

  const votesByCategoryId = {
    "low-id": Object.values(classificationsByExpertId).filter((id) => id === "low-id").length,
    "high-id": Object.values(classificationsByExpertId).filter((id) => id === "high-id").length,
  };
  const tiedCategoryIds = ["low-id", "high-id"];
  const selectedCategoryId = groupTiePolicy === "optimistic" ? "high-id" : "low-id";
  const modelParameters = {
    orderedCategories: categories,
    ahpSortProfiles: {
      mode: "central",
      tiePolicy: profileTiePolicy,
      profiles: [
        { profileId: "center-low", categoryId: "low-id" },
        { profileId: "center-high", categoryId: "high-id" },
      ],
    },
    ahpSortGroup: { tiePolicy: groupTiePolicy },
  };
  return {
    resultStructureKey: "sorting",
    resultStructureVersion: 1,
    model: { name: "AHPSort I" },
    modelSpecificOutput: { apiModelKey: "ahp_sort_i" },
    modelParameters,
    requestSnapshot: { modelParameters, context: { criteria: criterionNames } },
    expertRoster: [
      { id: "expert-a", name: "Expert A" },
      { id: "expert-b", name: "Expert B" },
    ],
    standardizedOutput: {
      categoryOrderSemantics: "lower-order-is-less-preferred",
      categories,
      assignments: [{ alternativeId: "alt-a", categoryId: selectedCategoryId }],
      diagnostics: {
        modelKey: "ahp_sort_i",
        profileMode: "central",
        profileTiePolicy,
        aggregationMethod: "unweighted_plurality_vote",
        groupTiePolicy,
        individualResultsByExpertId,
        resultsByAlternativeId: {
          "alt-a": {
            categoryId: selectedCategoryId,
            selectedCategoryId,
            votesByCategoryId,
            classificationsByExpertId,
            aggregationStatus: "tied_plurality",
            isUnanimous: false,
            isUniquePlurality: false,
            tieDetected: true,
            tiedCategoryIds,
            tiePolicy: groupTiePolicy,
          },
        },
      },
    },
  };
};

const alternatives = [{ id: "alt-a", name: "Supplier A" }];
const criteria = {
  nodes: [
    { id: "quality-id", name: "Quality", isLeaf: true, parentId: null },
    { id: "safety-id", name: "Safety", isLeaf: true, parentId: null },
  ],
};
const renderSelected = (execution, options = {}) => {
  const payload = { alternatives, criteria, ...options.payload };
  const data = buildDashboardData({ payload, selectedExecution: execution });
  render(<ThemeProvider theme={createTheme()}><DashboardView data={data} /></ThemeProvider>);
  return { data, payload };
};

const renderAnalysis = (execution) => {
  const payload = {
    alternatives,
    criteria,
    models: {
      base: {
        name: "AHPSort I",
        technical: { apiModelKey: "ahp_sort_i" },
        effectiveParameters: execution.modelParameters,
      },
    },
    phaseResults: [{
      stage: "alternativeEvaluation",
      phase: 0,
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      standardizedOutput: execution.standardizedOutput,
      modelSpecificOutput: { apiModelKey: "ahp_sort_i" },
      requestSnapshot: {
        modelParameters: execution.modelParameters,
        context: { criteria: criterionNames },
      },
    }],
  };
  const workspace = buildResultsAnalysisWorkspaceData({ payload, selectedExecutionKeys: ["base"] });
  render(<ThemeProvider theme={createTheme()}><VisualizationsPanel visualizations={{ mode: "single" }} executions={workspace.selected} /></ThemeProvider>);
  return { workspace, payload };
};

describe("AHPSort I sorting@1 Finished Issue presentation", () => {
  it("identifies the model from execution metadata, not diagnostics alone", () => {
    expect(isAHPSortIExecution({ modelSpecificOutput: { apiModelKey: "ahp_sort_i" } })).toBe(true);
    expect(isAHPSortIExecution({ model: { technical: { apiModelKey: "ahp_sort_i" } } })).toBe(true);
    expect(isAHPSortIExecution({ standardizedOutput: { diagnostics: { modelKey: "ahp_sort_i" } } })).toBe(false);
  });

  it("keeps the Final result generic while retaining limiting assignment evidence", () => {
    const above = renderSelected(limitingExecution());
    expect(screen.getByRole("list", { name: "Final sorting by category" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "High: 1 alternative" })).toHaveTextContent("Supplier A");
    expect(screen.queryByTestId("ahp-sort-i-assignment-explanation")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ahp-sort-i-mathematical-details")).not.toBeInTheDocument();
    expect(above.data.result.ahpSortI.alternativesById["alt-a"].explanation).toMatch(/AHP priority \(0\.7100\).*Medium \/ High limiting profile \(0\.6000\)/);
    expect(screen.queryByText(/ranking|probability|confidence|winner/i)).not.toBeInTheDocument();

    const equal = limitingExecution({
      assignedCategoryId: "medium-id",
      priority: 0.3,
      profilePriorities: { "boundary-lm": 0.3, "boundary-mh": 0.6 },
    });
    const equalData = buildDashboardData({ payload: { alternatives, criteria }, selectedExecution: equal });
    const evidence = equalData.result.ahpSortI;
    expect(evidence.alternativesById["alt-a"].status).toBe("available");
    expect(evidence.alternativesById["alt-a"].explanation).toContain("within the 1e-12 comparison tolerance");
    expect(evidence.alternativesById["alt-a"].explanation).toContain("ties go to the more preferred category");
    expect(equalData.findings.some((finding) => finding.kind === "ahp_profile_tie")).toBe(false);

    const overlapping = limitingExecution({
      priority: 0.50000000000075,
      profilePriorities: { "boundary-lm": 0.5, "boundary-mh": 0.5000000000015 },
      assignedCategoryId: "high-id",
    });
    const overlappingData = buildDashboardData({ payload: { alternatives, criteria }, selectedExecution: overlapping });
    const overlappingEvidence = overlappingData.result.ahpSortI.alternativesById["alt-a"];
    expect(overlappingEvidence.status).toBe("available");
    expect(overlappingEvidence.category.id).toBe("high-id");
    expect(overlappingEvidence.explanation).toContain("Medium / High limiting profile");
    expect(overlappingEvidence.explanation).not.toContain("Low / Medium limiting profile");
    expect(overlappingData.findings.some((finding) => finding.kind === "ahp_profile_tie")).toBe(false);
  });

  it("places saved AHP priorities, local consistency, assignment explanation, and matrices in Model Analysis", () => {
    const { workspace } = renderAnalysis(limitingExecution());
    const disclosure = screen.getByTestId("ahp-sort-i-mathematical-details");
    expect(disclosure).not.toHaveAttribute("open");
    expect(screen.getByRole("heading", { name: "AHPSort I classification evidence" })).toBeInTheDocument();
    expect(screen.getByText(/Supplier A was assigned to High because its AHP priority/)).toBeInTheDocument();
    fireEvent.click(within(disclosure).getByText("View AHP evidence"));
    expect(within(disclosure).getByText("Alternative global priority:")).toBeInTheDocument();
    expect(within(disclosure).getByText("Quality")).toBeInTheDocument();
    expect(within(disclosure).getByText("Weighted contribution")).toBeInTheDocument();
    expect(within(disclosure).getAllByText(/λmax .* CI .* RI .* CR/)).toHaveLength(2);
    fireEvent.click(within(disclosure).getByText("Pairwise matrix for Quality"));
    expect(within(disclosure).getByRole("table", { name: "Pairwise matrix for Quality" })).toBeInTheDocument();
    expect(workspace.selected[0].ahpSortIAnalysisEvidence.evidence.alternativesById["alt-a"].criteria).toHaveLength(2);
    expect(document.body.textContent).not.toContain("quality-id");
    expect(document.body.textContent).not.toContain("boundary-lm");
    expect(document.body.textContent).not.toContain("alt-a");
  });

  it("explains the closest central profile and optimistic/pessimistic tie decisions", () => {
    const optimistic = renderSelected(centralExecution());
    expect(screen.queryByTestId("ahp-sort-i-assignment-explanation")).not.toBeInTheDocument();
    expect(optimistic.data.findings.some((finding) => finding.kind === "ahp_profile_tie")).toBe(true);

    const pessimisticExecution = centralExecution({ policy: "pessimistic" });
    const result = optimistic.data.result;
    const pessimisticData = buildDashboardData({
      payload: { alternatives, criteria },
      selectedExecution: pessimisticExecution,
    });
    expect(pessimisticData.result.ahpSortI.alternativesById["alt-a"].category.label).toBe("Low");
    expect(pessimisticData.result.ahpSortI.alternativesById["alt-a"].explanation).toContain("pessimistic tie policy selected Low, the less preferred category");
    expect(result.categories.some((category) => category.alternatives.some((alternative) => alternative.id === "alt-a"))).toBe(true);

    const closest = buildDashboardData({
      payload: { alternatives, criteria },
      selectedExecution: centralExecution({ tied: false }),
    });
    expect(closest.result.ahpSortI.alternativesById["alt-a"].explanation).toContain("closest to the High center (0.6000; distance 0.0500)");
  });

  it("flags central-profile evidence whose priorities or stored distances contradict the selected run", () => {
    const prioritiesOutOfOrder = centralExecution();
    prioritiesOutOfOrder.standardizedOutput.diagnostics.resultsByAlternativeId["alt-a"].profileGlobalPrioritiesById = {
      "center-low": 0.7,
      "center-high": 0.1,
    };
    const priorityData = buildDashboardData({ payload: { alternatives, criteria }, selectedExecution: prioritiesOutOfOrder });
    expect(priorityData.result.ahpSortI.alternativesById["alt-a"].status).toBe("integrity_warning");
    expect(priorityData.result.categories.find((category) => category.id === "high-id").alternatives).toHaveLength(1);

    const distanceMismatch = centralExecution();
    distanceMismatch.standardizedOutput.diagnostics.resultsByAlternativeId["alt-a"].classification.centerDistancesByProfileId["center-high"] = 0.25;
    const distanceData = buildDashboardData({ payload: { alternatives, criteria }, selectedExecution: distanceMismatch });
    expect(distanceData.result.ahpSortI.alternativesById["alt-a"].status).toBe("integrity_warning");
    expect(distanceData.result.categories.find((category) => category.id === "high-id").alternatives).toHaveLength(1);
  });

  it("shows CR review warnings without hiding a classification and handles 2×2 CR as not applicable", () => {
    const inconsistent = limitingExecution({
      diagnosticsOverrides: {
        localPrioritiesByCriterion: {
          "quality-id": {
            ...localEvidence({ profileIds: ["boundary-lm", "boundary-mh"], ratio: 0.2, status: "review" }),
            profilesById: { "boundary-lm": 0.15, "boundary-mh": 0.05 },
          },
          "safety-id": {
            ...localEvidence({ profileIds: ["boundary-lm", "boundary-mh"] }),
            alternative: 0.5,
            profilesById: { "boundary-lm": 0.15, "boundary-mh": 0.05 },
          },
        },
      },
    });
    renderAnalysis(inconsistent);
    const dashboardData = buildDashboardData({ payload: { alternatives, criteria }, selectedExecution: inconsistent });
    expect(screen.getByTestId("ahp-sort-i-consistency-warning")).toHaveTextContent(/CR above 0.10/);
    expect(screen.getAllByText("Supplier A").length).toBeGreaterThan(0);
    expect(dashboardData.findings.some((finding) => finding.kind === "ahp_consistency")).toBe(true);

    const twoByTwo = limitingExecution({
      assignedCategoryId: "high-id",
      priority: 0.7,
      profilePriorities: { "boundary-lm": 0.3 },
      modelParameters: {
        orderedCategories: [limitingCategories[0], { ...limitingCategories[2], order: 1 }],
        ahpSortProfiles: { mode: "limiting", profiles: [{ profileId: "boundary-lm", lowerCategoryId: "low-id", upperCategoryId: "high-id" }] },
      },
      categories: [limitingCategories[0], { ...limitingCategories[2], order: 1 }],
      diagnosticsOverrides: {
        profileGlobalPrioritiesById: { "boundary-lm": 0.3 },
        weightedContributionsByCriterion: { "quality-id": { alternative: 0.7, profilesById: { "boundary-lm": 0.3 } } },
        weightsByCriterion: { "quality-id": 1 },
        localPrioritiesByCriterion: {
          "quality-id": {
            entityOrder: [{ entityType: "alternative", alternativeId: "alt-a" }, { entityType: "profile", profileId: "boundary-lm" }],
            pairwiseMatrix: [[1, 2], [0.5, 1]],
            alternative: 0.7,
            profilesById: { "boundary-lm": 0.3 },
            consistency: { lambdaMax: 2, consistencyIndex: null, randomIndex: null, consistencyRatio: null, consistencyStatus: "not_applicable" },
          },
        },
      },
    });
    const twoByTwoData = buildDashboardData({ payload: { alternatives, criteria: { nodes: [criteria.nodes[0]] } }, selectedExecution: twoByTwo });
    expect(twoByTwoData.result.ahpSortI.alternativesById["alt-a"].detailsAvailable).toBe(true);
    expect(twoByTwoData.result.ahpSortI.consistencyWarnings).toEqual([]);
  });

  it("keeps sorting categories visible for missing or conflicting historical diagnostics", () => {
    const missing = limitingExecution();
    delete missing.standardizedOutput.diagnostics;
    const missingData = renderSelected(missing);
    expect(missingData.data.result.available).toBe(true);
    expect(screen.getByRole("listitem", { name: "High: 1 alternative" })).toBeInTheDocument();
    expect(screen.queryByText("Detailed AHP evidence is not available for this saved execution.")).not.toBeInTheDocument();

    cleanup();
    const conflict = limitingExecution({ assignedCategoryId: "high-id", diagnosticsOverrides: { categoryId: "low-id" } });
    const { data: conflictData } = renderSelected(conflict);
    expect(conflictData.result.available).toBe(true);
    expect(conflictData.result.ahpSortI.alternativesById["alt-a"].status).toBe("integrity_warning");
    expect(conflictData.result.ahpSortI.alternativesById["alt-a"].message).toMatch(/do not agree/);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "High: 1 alternative" })).toBeInTheDocument();
    cleanup();
    renderAnalysis(conflict);
    expect(screen.getByTestId("ahp-sort-i-analysis-integrity_warning")).toHaveTextContent(/do not agree with the stored classifications/);
  });

  it("does not order alternatives across categories or by global AHP priority", () => {
    const execution = limitingExecution();
    const secondDiagnostics = structuredClone(execution.standardizedOutput.diagnostics.resultsByAlternativeId["alt-a"]);
    secondDiagnostics.categoryId = "high-id";
    secondDiagnostics.globalPriority = 0.99;
    for (const criterion of Object.values(secondDiagnostics.localPrioritiesByCriterion)) {
      criterion.entityOrder[0].alternativeId = "alt-z";
    }
    execution.standardizedOutput.assignments.push({ alternativeId: "alt-z", categoryId: "high-id" });
    execution.standardizedOutput.diagnostics.resultsByAlternativeId["alt-z"] = secondDiagnostics;

    renderSelected(execution, { payload: { alternatives: [...alternatives, { id: "alt-z", name: "Supplier Z" }] } });
    const highCategory = screen.getByRole("listitem", { name: "High: 2 alternatives" });
    const alternativeRows = [...highCategory.querySelector("ul").children];
    expect(alternativeRows.map((row) => row.querySelector("p")?.textContent)).toEqual(["Supplier A", "Supplier Z"]);
    expect(screen.queryByText(/rank|probability|confidence/i)).not.toBeInTheDocument();
  });

  it("uses the selected scenario snapshot rather than current Issue parameters", () => {
    const saved = limitingExecution();
    const savedBaseSnapshot = { modelParameters: saved.modelParameters, context: { criteria: criterionNames } };
    const basePayload = {
      alternatives,
      criteria,
      models: {
        base: {
          name: "AHPSort I",
          effectiveParameters: { ahpSortProfiles: { mode: "central", profiles: [] } },
        },
      },
      phaseResults: [{
        stage: "alternativeEvaluation",
        phase: 0,
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        standardizedOutput: saved.standardizedOutput,
        modelSpecificOutput: { apiModelKey: "ahp_sort_i" },
        requestSnapshot: savedBaseSnapshot,
      }],
    };
    const selectedBase = selectFinishedIssueExecution(basePayload);
    expect(selectedBase.requestSnapshot).toEqual(savedBaseSnapshot);
    expect(selectedBase.modelParameters).toEqual(saved.modelParameters);
    const baseData = buildDashboardData({ payload: basePayload, selectedExecution: selectedBase });
    expect(baseData.result.ahpSortI.alternativesById["alt-a"].status).toBe("available");

    const scenario = {
      id: "scenario-ahp",
      name: "Historical central scenario",
      targetModel: { id: "model-ahp", name: "AHPSort I" },
      phaseResults: [{
        phase: 0,
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        standardizedOutput: saved.standardizedOutput,
        modelSpecificOutput: { apiModelKey: "ahp_sort_i" },
        requestSnapshot: {
          modelParameters: saved.modelParameters,
          context: { criteria: criterionNames },
        },
      }],
    };
    const payload = {
      alternatives,
      criteria,
      models: { base: { effectiveParameters: { ahpSortProfiles: { mode: "central", profiles: [] } } } },
      scenarios: [scenario],
    };
    const selected = selectFinishedIssueExecution(payload, "scenario-ahp", 0);
    expect(selected.requestSnapshot).toEqual(scenario.phaseResults[0].requestSnapshot);
    expect(selected.modelParameters).toEqual(saved.modelParameters);
    const data = buildDashboardData({ payload, selectedExecution: selected });
    expect(data.result.ahpSortI.alternativesById["alt-a"].status).toBe("available");
    expect(data.result.ahpSortI.alternativesById["alt-a"].category.label).toBe("High");
  });

  it("renders persisted unweighted plurality votes and individual expert evidence", () => {
    const execution = groupExecution({
      classifications: {
        "expert-1": "high-id",
        "expert-2": "high-id",
        "expert-3": "medium-id",
        "expert-4": "low-id",
      },
    });
    const rendered = renderSelected(execution);
    const classification = rendered.data.result.ahpSortIGroup.alternativesById["alt-a"];

    expect(rendered.data.result.metric).toBe(null);
    expect(classification).toMatchObject({
      voteValid: true,
      participantCount: 4,
      aggregationStatus: "unique_plurality",
      isAbsoluteMajority: false,
      votes: [
        { label: "Low", count: 1 },
        { label: "Medium", count: 1 },
        { label: "High", count: 2 },
      ],
    });
    expect(screen.queryByTestId("ahpsort-i-group-votes")).not.toBeInTheDocument();
    expect(screen.queryByText(/High received the most votes \(plurality\): 2 of 4/)).not.toBeInTheDocument();
    expect(screen.queryByText(/consensus|probability|ranking/i)).not.toBeInTheDocument();
    expect(rendered.data.findings.map(({ title }) => title)).toContain("Unique plurality");
    expect(rendered.data.findings.map(({ title }) => title)).toContain("Different expert classifications");

    expect(screen.queryByTestId("ahpsort-i-individual-classifications")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/expert-[1-4]|low-id|medium-id|high-id|alt-a/);
  });

  it.each([
    ["optimistic", "high-id", "High"],
    ["pessimistic", "low-id", "Low"],
  ])("applies the persisted %s preference only to tied group votes", (policy, assignedId, label) => {
    const execution = groupExecution({
      tiePolicy: policy,
      classifications: {
        "expert-a": "high-id",
        "expert-b": "high-id",
        "expert-c": "low-id",
        "expert-d": "low-id",
      },
    });
    const data = buildDashboardData({ payload: { alternatives, criteria }, selectedExecution: execution });
    const classification = data.result.ahpSortIGroup.alternativesById["alt-a"];
    expect(data.result.categories.find(({ id }) => id === assignedId)).toMatchObject({
      label,
      alternatives: expect.any(Array),
    });
    expect(data.result.categories.find(({ id }) => id === assignedId)?.alternatives).toHaveLength(1);
    expect(classification).toMatchObject({
      voteValid: true,
      aggregationStatus: "tied_plurality",
      tiedCategoryLabels: ["Low", "High"],
      tiePolicy: policy,
    });
    render(<ThemeProvider theme={createTheme()}><DashboardView data={data} /></ThemeProvider>);
    expect(screen.queryByText(/tied with the most votes among 4 experts/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("ahpsort-i-group-votes")).not.toBeInTheDocument();
  });

  it.each([
    ["optimistic", "pessimistic", "Low", "High"],
    ["pessimistic", "optimistic", "High", "Low"],
  ])("keeps central-profile %s independent from group-vote %s", (profilePolicy, groupPolicy, expectedGroup, individualTieCategory) => {
    const execution = centralGroupExecution({ profileTiePolicy: profilePolicy, groupTiePolicy: groupPolicy });
    const data = buildDashboardData({ payload: { alternatives, criteria }, selectedExecution: execution });
    expect(data.result.ahpSortIGroup.unavailableReason).toBe(null);
    expect(data.result.ahpSortIGroup.status).toBe("available");
    expect(data.result.categories.find(({ label }) => label === expectedGroup).alternatives).toHaveLength(1);
    expect(data.result.ahpSortIGroup.alternativesById["alt-a"].individualClassifications[0].category.label)
      .toBe(individualTieCategory);
    expect(data.result.ahpSortIGroup.alternativesById["alt-a"].tiePolicy).toBe(groupPolicy);
  });

  it.each([
    ["Unanimous classifications", { "expert-1": "high-id", "expert-2": "high-id" }],
    ["Absolute majority", { "expert-1": "high-id", "expert-2": "high-id", "expert-3": "high-id", "expert-4": "low-id" }],
    ["Unique plurality", { "expert-1": "high-id", "expert-2": "high-id", "expert-3": "medium-id", "expert-4": "low-id" }],
    ["Group vote tie-break", { "expert-1": "high-id", "expert-2": "high-id", "expert-3": "low-id", "expert-4": "low-id" }],
  ])("reports the group finding '%s' with vote terminology", (expectedTitle, classifications) => {
    const data = buildDashboardData({
      payload: { alternatives, criteria },
      selectedExecution: groupExecution({ classifications }),
    });
    expect(data.findings.map(({ title }) => title)).toContain(expectedTitle);
    expect(data.findings.map(({ text }) => text).join(" ")).not.toMatch(/consensus|probability/i);
  });

  it("uses the selected scenario's policy and roster snapshot instead of current Issue data", () => {
    const baseExecution = groupExecution({
      tiePolicy: "optimistic",
      classifications: { "expert-a": "high-id", "expert-b": "low-id" },
    });
    const scenarioExecution = groupExecution({
      tiePolicy: "pessimistic",
      classifications: { "expert-a": "high-id", "expert-b": "low-id" },
    });
    const phaseResult = {
      phase: 0,
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      standardizedOutput: scenarioExecution.standardizedOutput,
      modelSpecificOutput: { apiModelKey: "ahp_sort_i" },
      requestSnapshot: {
        modelParameters: scenarioExecution.modelParameters,
        context: {
          criteria: criterionNames,
        },
        evaluations: [
          { expert: { id: "expert-a", name: "Snapshot Expert A" } },
          { expert: { id: "expert-b", name: "Snapshot Expert B" } },
        ],
      },
    };
    const payload = {
      alternatives,
      criteria,
      models: { base: { configuredParameters: baseExecution.modelParameters } },
      participantHistory: { records: [{ expert: { id: "current-expert", name: "Current participant" } }] },
      scenarios: [{ id: "scenario-ahp", name: "Saved scenario", targetModel: { name: "AHPSort I" }, phaseResults: [phaseResult] }],
    };
    const selected = selectFinishedIssueExecution(payload, "scenario-ahp", 0);
    expect(selected.modelParameters.ahpSortGroup.tiePolicy).toBe("pessimistic");
    expect(selected.expertRoster).toEqual([
      { id: "expert-a", name: "Snapshot Expert A" },
      { id: "expert-b", name: "Snapshot Expert B" },
    ]);
    const data = buildDashboardData({ payload, selectedExecution: selected });
    expect(data.result.categories.find(({ id }) => id === "low-id").alternatives).toHaveLength(1);
    expect(data.result.ahpSortIGroup.alternativesById["alt-a"].tiePolicy).toBe("pessimistic");
    expect(data.result.ahpSortIGroup.alternativesById["alt-a"].individualClassifications[0].name).toBe("Snapshot Expert A");
  });

  it("keeps the persisted collective assignment visible when group vote evidence is corrupt", () => {
    const execution = groupExecution({
      classifications: {
        "expert-1": "high-id",
        "expert-2": "high-id",
        "expert-3": "medium-id",
        "expert-4": "low-id",
      },
    });
    execution.standardizedOutput.diagnostics.resultsByAlternativeId["alt-a"].votesByCategoryId["high-id"] = 9;
    const { data } = renderSelected(execution);
    expect(data.result.categories.find(({ id }) => id === "high-id").alternatives).toHaveLength(1);
    expect(data.result.ahpSortIGroup.status).toBe("integrity_warning");
    expect(data.result.ahpSortIGroup.alternativesById["alt-a"]).toMatchObject({
      voteValid: false,
      category: { id: "high-id" },
      votes: null,
    });
    expect(screen.queryByTestId("ahpsort-i-group-integrity-warning")).not.toBeInTheDocument();
    expect(screen.queryByText("The saved category is shown; vote details need review.")).not.toBeInTheDocument();
  });

  it("keeps persisted assignments visible and flags a missing historical expert roster", () => {
    const execution = groupExecution({
      includeRoster: false,
      classifications: { "expert-a": "high-id", "expert-b": "high-id" },
    });
    const data = buildDashboardData({ payload: { alternatives, criteria }, selectedExecution: execution });
    expect(data.result.available).toBe(true);
    expect(data.result.categories.find(({ id }) => id === "high-id").alternatives).toHaveLength(1);
    expect(data.result.ahpSortIGroup.status).toBe("integrity_warning");
    expect(data.result.ahpSortIGroup.unavailableReason).toMatch(/expert roster is unavailable/);
    render(<ThemeProvider theme={createTheme()}><DashboardView data={data} /></ThemeProvider>);
    expect(screen.queryByTestId("ahpsort-i-group-integrity-warning")).not.toBeInTheDocument();
    expect(screen.queryByText("The saved expert roster is unavailable, so historical participation cannot be fully verified.")).not.toBeInTheDocument();
  });
});
