import { describe, expect, it } from "vitest";

import { sortingV1ResultStructure } from "../../../modules/decisionPlugins/resultStructures/structures/sorting/v1/index.js";
import {
  RESULT_STRUCTURE_REGISTRY,
  normalizeResultStructureOrThrow,
  projectNormalizedResultOrThrow,
} from "../../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js";
import { buildIssueModelExecutionResult } from "../../../modules/issues/modelExecution/buildIssueModelExecutionResult.js";

const authorizedAlternativeIds = [
  "64b000000000000000000001",
  "64b000000000000000000002",
];

const validResult = (overrides = {}) => ({
  categories: [
    { categoryId: "excellent", label: "Preferred", order: 2 },
    { categoryId: "excluded", label: "Not preferred", order: 0 },
    { categoryId: "acceptable", label: "Acceptable", order: 1 },
  ],
  assignments: [
    { alternativeId: authorizedAlternativeIds[0], categoryId: "acceptable" },
    { alternativeId: authorizedAlternativeIds[1], categoryId: "acceptable" },
  ],
  ...overrides,
});

const defaultAuthorizedCategories = [...validResult().categories].sort(
  (left, right) => left.order - right.order
);
const normalize = (
  result,
  context = { authorizedAlternativeIds, authorizedCategories: defaultAuthorizedCategories }
) =>
  normalizeResultStructureOrThrow({
    resultStructureKey: "sorting",
    resultStructureVersion: 1,
    result,
    context,
  });

describe("sorting@1 result contract", () => {
  it("is registered by the shared versioned result structure registry", () => {
    expect(RESULT_STRUCTURE_REGISTRY.get("sorting")?.get(1)).toBe(
      sortingV1ResultStructure
    );
    expect(sortingV1ResultStructure).toMatchObject({
      key: "sorting",
      version: 1,
      capabilities: {
        issueExecution: true,
        consensus: false,
        resultsAnalysis: true,
      },
    });
  });

  it("orders categories by explicit semantics and allows shared assignments and empty categories", () => {
    const configuredCategories = [
      { categoryId: "bottom", label: "Same label", order: 0 },
      { categoryId: "top", label: "Same label", order: 1 },
      { categoryId: "empty", label: "Unused", order: 2 },
    ];
    const normalized = normalize(validResult({
      categories: [
        { categoryId: "top", label: "Same label", order: 1 },
        { categoryId: "bottom", label: "Same label", order: 0 },
        { categoryId: "empty", label: "Unused", order: 2 },
      ],
      assignments: [
        { alternativeId: authorizedAlternativeIds[0], categoryId: "top" },
        { alternativeId: authorizedAlternativeIds[1], categoryId: "top" },
      ],
    }), { authorizedAlternativeIds, authorizedCategories: configuredCategories });

    expect(normalized).toEqual({
      categories: [
        { categoryId: "bottom", label: "Same label", order: 0 },
        { categoryId: "top", label: "Same label", order: 1 },
        { categoryId: "empty", label: "Unused", order: 2 },
      ],
      categoryOrderSemantics: "lower-order-is-less-preferred",
      assignments: [
        { alternativeId: authorizedAlternativeIds[0], categoryId: "top" },
        { alternativeId: authorizedAlternativeIds[1], categoryId: "top" },
      ],
    });
    expect(normalized).not.toHaveProperty("rank");
    expect(normalized).not.toHaveProperty("score");
    expect(normalized).not.toHaveProperty("rankedAlternatives");
  });

  it.each([1, 2, 5])("accepts a variable category count of %i", (count) => {
    const categories = Array.from({ length: count }, (_, order) => ({
      categoryId: `category-${order}`,
      label: `Category ${order}`,
      order,
    }));
    const normalized = normalize(validResult({
      categories,
      assignments: authorizedAlternativeIds.map((alternativeId) => ({
        alternativeId,
        categoryId: categories[0].categoryId,
      })),
    }), { authorizedAlternativeIds, authorizedCategories: categories });
    expect(normalized.categories).toHaveLength(count);
  });

  it("rejects missing trusted alternative context", () => {
    expect(() => normalize(validResult(), {})).toThrow(
      "Backend-authorized alternative IDs"
    );
  });

  it("requires Backend-authorized category context and rejects invented, omitted, or changed categories", () => {
    expect(() => normalize(validResult(), { authorizedAlternativeIds })).toThrow(
      "Backend-authorized categories"
    );

    const configuredCategories = defaultAuthorizedCategories;
    const assignments = authorizedAlternativeIds.map((alternativeId) => ({
      alternativeId,
      categoryId: "acceptable",
    }));
    expect(() => normalize(validResult({
      categories: [
        ...configuredCategories,
        { categoryId: "invented", label: "Invented", order: 3 },
      ],
      assignments,
    }))).toThrow("exactly match Backend-authorized categories");
    expect(() => normalize(validResult({
      categories: configuredCategories.slice(0, 2),
      assignments,
    }))).toThrow("exactly match Backend-authorized categories");
    expect(() => normalize(validResult({
      categories: configuredCategories.map((category) =>
        category.categoryId === "acceptable"
          ? { ...category, label: "Reinterpreted" }
          : category
      ),
      assignments,
    }))).toThrow("exactly match Backend-authorized categories");
    expect(() => normalize(validResult({
      categories: configuredCategories.map((category) =>
        category.categoryId === "acceptable"
          ? { ...category, order: 0 }
          : category.categoryId === "excluded"
            ? { ...category, order: 1 }
            : category
      ),
      assignments,
    }))).toThrow("exactly match Backend-authorized categories");
  });

  it("keeps accepting and projecting extra result category fields as before", () => {
    const result = normalize(validResult({
      categories: defaultAuthorizedCategories.map((category) => ({
        ...category,
        executorMetadata: "ignored",
      })),
    }));
    expect(result.categories).toEqual(defaultAuthorizedCategories);
    expect(result.categories[0]).not.toHaveProperty("executorMetadata");
  });

  it.each([
    [null, "result"],
    [validResult({ categories: [] }), "result.categories"],
    [validResult({ categories: [{ categoryId: " ", label: "A", order: 0 }] }), "categoryId"],
    [validResult({ categories: [{ categoryId: "a", label: " ", order: 0 }] }), "label"],
    [validResult({ categories: [{ categoryId: "a", label: "A", order: Number.NaN }] }), "order must be a non-negative integer"],
    [validResult({ categories: [
      { categoryId: "same", label: "A", order: 0 },
      { categoryId: "same", label: "B", order: 1 },
    ] }), "categoryId 'same' must be unique"],
    [validResult({ categories: [
      { categoryId: "a", label: "A", order: 0 },
      { categoryId: "b", label: "B", order: 0 },
    ] }), "category order '0' must be unique"],
    [validResult({ categories: [
      { categoryId: "a", label: "A", order: 0 },
      { categoryId: "b", label: "B", order: 2 },
    ] }), "consecutive starting at zero"],
    [validResult({ categoryOrderSemantics: "higher-order-is-less-preferred" }), "categoryOrderSemantics"],
    [validResult({ assignments: "not-an-array" }), "result.assignments"],
    [validResult({ assignments: [
      { alternativeId: authorizedAlternativeIds[0], categoryId: "unknown" },
      { alternativeId: authorizedAlternativeIds[1], categoryId: "acceptable" },
    ] }), "unknown category"],
    [validResult({ assignments: [
      { alternativeId: authorizedAlternativeIds[0], categoryId: "acceptable" },
      { alternativeId: authorizedAlternativeIds[0], categoryId: "acceptable" },
    ] }), "only one sorting assignment"],
    [validResult({ assignments: [
      { alternativeId: "64b000000000000000000099", categoryId: "acceptable" },
      { alternativeId: authorizedAlternativeIds[1], categoryId: "acceptable" },
    ] }), "not authorized"],
    [validResult({ assignments: [
      { alternativeId: authorizedAlternativeIds[0], categoryId: "acceptable" },
    ] }), "Every Backend-authorized alternative"],
    [validResult({ assignments: [
      { alternativeId: authorizedAlternativeIds[0], categoryId: "acceptable" },
      { alternativeId: authorizedAlternativeIds[1], categoryId: 5 },
    ] }), "categoryId"],
    [validResult({ assignments: [
      { alternativeId: " ", categoryId: "acceptable" },
      { alternativeId: authorizedAlternativeIds[1], categoryId: "acceptable" },
    ] }), "alternativeId"],
    [validResult({ diagnostics: [] }), "diagnostics must be an object"],
    [validResult({ plotsGraphic: { expert_points: [[0, Number.NaN]], collective_point: [0, 0] } }), "finite two-dimensional"],
    [validResult({ plotsGraphic: { reason: " " } }), "reason must be a non-empty string"],
  ])("rejects invalid result input", (result, message) => {
    expect(() => normalize(result)).toThrow(message);
  });

  it("retains historical canonical alternative IDs and optional diagnostics", () => {
    const result = normalize(validResult({
      diagnostics: { iterations: 12, modelTrace: ["profile-A"] },
      rankedAlternatives: [{ rank: 1, score: 0.9 }],
      score: 0.9,
    }));

    expect(result.assignments.map((entry) => entry.alternativeId)).toEqual(
      authorizedAlternativeIds
    );
    expect(result.diagnostics).toEqual({ iterations: 12, modelTrace: ["profile-A"] });
    expect(result).not.toHaveProperty("rankedAlternatives");
    expect(result).not.toHaveProperty("score");
  });

  it("accepts and preserves optional validated expert projection evidence", () => {
    const plotsGraphic = {
      expert_points: [[0, 0]],
      collective_point: [0, 0],
      expert_ids: ["expert-1"],
      expert_labels: ["Ada"],
      expert_emails: ["ada@example.test"],
      projection_space: "criterion_domain_minmax",
    };
    const normalized = normalize(validResult({ plotsGraphic }));

    expect(normalized.plotsGraphic).toEqual(plotsGraphic);
    for (const target of ["stagePersistence", "finishedIssuePhaseResult", "finishedIssueScenarioPhaseResult"]) {
      const projection = projectNormalizedResultOrThrow({
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        result: normalized,
        target,
      });
      expect(JSON.stringify(projection)).toContain("criterion_domain_minmax");
    }
  });

  it("carries sorting data through execution, persistence, snapshots, active and Finished projections", () => {
    const result = buildIssueModelExecutionResult({
      issue: {
        apiModelKey: "synthetic-sort",
        apiEndpoint: { path: "/sort" },
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
      },
      result: validResult(),
      context: {
        authorizedAlternativeIds,
        authorizedCategories: defaultAuthorizedCategories,
      },
      structureKey: "alternativeCriteriaMatrix",
    });
    const standardResult = result.standardResult;

    expect(result).toMatchObject({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      standardResult,
      rawOutput: validResult(),
    });

    for (const target of [
      "stagePersistence",
      "executionResponse",
      "scenarioInput",
      "stateSnapshot",
      "activeIssueResponse",
    ]) {
      expect(projectNormalizedResultOrThrow({
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        result: standardResult,
        target,
      })).toEqual({
        categories: standardResult.categories,
        categoryOrderSemantics: "lower-order-is-less-preferred",
        assignments: standardResult.assignments,
      });
    }

    const phaseResult = projectNormalizedResultOrThrow({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      result: standardResult,
      target: "finishedIssuePhaseResult",
    });
    expect(phaseResult.standardizedOutput).toEqual(standardResult);
    expect(phaseResult.assignments).toEqual(standardResult.assignments);
    expect(phaseResult).not.toHaveProperty("rankedAlternatives");
    expect(phaseResult).not.toHaveProperty("topAlternatives");

    expect(projectNormalizedResultOrThrow({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      result: standardResult,
      target: "finishedIssueScenarioPhaseResult",
    })).toEqual({ standardizedOutput: standardResult });
    expect(projectNormalizedResultOrThrow({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      result: standardResult,
      target: "finishedIssueListSummary",
    })).toEqual({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      sortingSummary: { categoryCount: 3, assignedAlternativeCount: 2 },
    });
  });
});
