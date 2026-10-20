import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { Criterion } from "../../models/Criteria.js";
import { IssueStageResult } from "../../models/IssueStageResults.js";
import { IssueStateSnapshot } from "../../models/IssueStateSnapshots.js";
import { buildIssueModelExecutionResult } from "../../modules/issues/modelExecution/buildIssueModelExecutionResult.js";
import { buildIssueModelRequestPayload } from "../../modules/issues/modelExecution/buildIssueModelRequestPayload.js";
import { buildIssueResultStructureContextOrThrow } from "../../modules/issues/modelExecution/buildIssueResultStructureContext.js";
import { serializePhaseResults } from "../../modules/issues/finished/finishedPayload/serializers/serializePhaseResults.js";
import { remapModelParametersCriterionIdsOrThrow } from "../../modules/modelParameters/remapModelParametersCriterionIds.js";
import { resolveResultStructureMetadata } from "../../modules/decisionPlugins/resultStructureMetadata.js";
import {
  projectNormalizedResultOrThrow,
} from "../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js";
import { unwrapModelApiResponse } from "../../services/modelApi/modelResponse.js";
import {
  createConfirmedUser,
  createIssueAlternativesFixture,
  createIssueExpressionDomainSnapshotFixture,
  createIssueFixture,
  createIssueModel,
} from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const python = process.env.DECISION_MODELS_PYTHON?.trim();
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const decisionModelsServiceRoot = resolve(repositoryRoot, "DecisionModelsService");
const topsisSortScript = [
  "import json, sys",
  "from schemas.model_requests import GenericModelExecutionRequest",
  "from models.topsis_sort_2016.executor import _input, execute_topsis_sort_2016",
  "payload = GenericModelExecutionRequest.model_validate(json.load(sys.stdin))",
  "prepared = _input(payload)",
  "response = execute_topsis_sort_2016(payload)",
  "if hasattr(response, 'body'):",
  "    response = json.loads(response.body)",
  "print(json.dumps({'prepared': prepared, 'response': response}))",
].join("\n");

const executeDecisionModel = (payload) => {
  if (!python) {
    throw new Error(
      "Set DECISION_MODELS_PYTHON to a Python interpreter with DecisionModelsService dependencies installed."
    );
  }

  return JSON.parse(execFileSync(python, ["-c", topsisSortScript], {
    cwd: decisionModelsServiceRoot,
    input: JSON.stringify(payload),
    encoding: "utf8",
  }));
};

const categories = [
  { categoryId: "low", label: "Low", order: 0 },
  { categoryId: "medium", label: "Medium", order: 1 },
  { categoryId: "high", label: "High", order: 2 },
];

const modelParametersDefinition = [
  {
    key: "orderedCategories",
    name: "Ordered categories",
    parameterStructureKey: "orderedCategories",
    required: true,
  },
  {
    key: "boundaryProfiles",
    name: "Boundary profiles",
    parameterStructureKey: "boundaryProfiles",
    required: true,
  },
];

const createBackendPayloadFixture = async () => {
  const owner = await createConfirmedUser({ email: "topsis-sort-contract-owner@example.com" });
  const expert = await createConfirmedUser({ email: "topsis-sort-contract-expert@example.com" });
  const model = await createIssueModel({
    name: "TOPSIS-Sort 2016 contract fixture",
    apiModelKey: "topsis_sort_2016",
    apiEndpoint: { method: "POST", path: "/topsis_sort_2016" },
    resultStructureKey: "sorting",
    resultStructureVersion: 1,
    implementationStatus: "scaffold",
    publicUsable: false,
    usesCriteriaWeights: true,
    usesCriterionTypes: true,
    supportedExpressionDomains: [{ typeKey: "numericDiscrete", constraints: {} }],
    parameters: modelParametersDefinition,
  });
  const issue = await createIssueFixture({
    ownerId: owner._id,
    modelId: model._id,
    name: "TOPSIS-Sort 2016 persisted contract fixture",
    currentStage: "alternativeEvaluation",
    evaluationStructureKey: "alternativeCriteriaMatrix",
    resultStructureKey: "sorting",
    resultStructureVersion: 1,
  });
  const domain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
    numericRange: { min: 1, max: 9, step: 1 },
  });
  const root = await Criterion.create({
    issue: issue._id,
    parentCriterion: null,
    name: "Performance",
    type: "group",
    isLeaf: false,
    position: 0,
  });
  const criteria = await Criterion.create([
    {
      issue: issue._id,
      parentCriterion: root._id,
      name: "Quality",
      type: "benefit",
      isLeaf: true,
      expressionDomain: domain._id,
      position: 0,
    },
    {
      issue: issue._id,
      parentCriterion: root._id,
      name: "Cost",
      type: "cost",
      isLeaf: true,
      expressionDomain: domain._id,
      position: 1,
    },
  ]);
  const alternatives = await createIssueAlternativesFixture({
    issueId: issue._id,
    names: ["Coastal option", "Urban option", "Forest option"],
  });
  const criterionIdByName = Object.fromEntries(
    criteria.map((criterion) => [criterion.name, String(criterion._id)])
  );
  const temporaryCriterionIds = {
    Quality: "temporary-quality",
    Cost: "temporary-cost",
  };
  const sourceParameters = {
    orderedCategories: categories,
    boundaryProfiles: {
      profiles: [
        {
          profileId: "medium-boundary",
          categoryId: "medium",
          valuesByCriterionId: {
            [temporaryCriterionIds.Quality]: 4,
            [temporaryCriterionIds.Cost]: 6,
          },
        },
        {
          profileId: "high-boundary",
          categoryId: "high",
          valuesByCriterionId: {
            [temporaryCriterionIds.Quality]: 7,
            [temporaryCriterionIds.Cost]: 3,
          },
        },
      ],
    },
  };
  const remappedParameters = remapModelParametersCriterionIdsOrThrow({
    model,
    modelParameters: sourceParameters,
    criterionIdMappings: criteria.map((criterion) => ({
      sourceCriterionId: temporaryCriterionIds[criterion.name],
      persistedCriterionId: String(criterion._id),
    })),
    persistedLeafCriteria: criteria,
    alternatives: [
      { id: String(alternatives[0]._id), name: alternatives[0].name },
      { id: String(alternatives[1]._id), name: alternatives[1].name },
      { id: String(alternatives[2]._id), name: alternatives[2].name },
    ],
  });
  issue.modelParameters = {
    ...remappedParameters,
    weights: {
      [criterionIdByName.Quality]: 0.6,
      [criterionIdByName.Cost]: 0.4,
    },
  };
  await issue.save();

  const snapshotAt = new Date("2026-01-01T00:00:00.000Z");
  await IssueStateSnapshot.create({
    issue: issue._id,
    snapshotType: "creation",
    stage: "alternativeEvaluation",
    consensusPhase: 0,
    occurredAt: snapshotAt,
    correlationId: "topsis-sort-contract-fixture",
    state: {
      issue: {
        id: String(issue._id),
        effectiveModelParameters: issue.modelParameters,
      },
      model: {
        id: String(model._id),
        name: model.name,
        parameters: model.parameters,
      },
      alternatives: alternatives.map((alternative, position) => ({
        id: String(alternative._id),
        name: alternative.name,
        position,
      })),
      criteria: criteria.map((criterion) => ({
        id: String(criterion._id),
        name: criterion.name,
        type: criterion.type,
        isLeaf: true,
        expressionDomainId: String(domain._id),
      })),
      expressionDomains: [{
        id: String(domain._id),
        typeKey: domain.typeKey,
        definition: domain.definition,
      }],
      participants: [],
      evaluations: [],
    },
    schemaVersion: 1,
  });

  const evaluationValues = [
    { Quality: 2, Cost: 8 },
    { Quality: 5, Cost: 5 },
    { Quality: 8, Cost: 2 },
  ];
  const evaluations = [{
    expert: { _id: expert._id, name: expert.name, email: expert.email },
    payload: Object.fromEntries(alternatives.map((alternative, index) => [
      String(alternative._id),
      Object.fromEntries(criteria.map((criterion) => [
        String(criterion._id),
        evaluationValues[index][criterion.name],
      ])),
    ])),
  }];

  const payload = await buildIssueModelRequestPayload({
    issue,
    structureKey: "alternativeCriteriaMatrix",
    evaluations,
    phase: 0,
  });
  return { issue, model, criteria, alternatives, payload, temporaryCriterionIds };
};

describe("Backend to DecisionModelsService TOPSIS-Sort 2016 contract integration", () => {
  it("builds, executes, validates, and persists a sorting@1 result with canonical IDs", async () => {
    const {
      issue,
      model,
      criteria,
      alternatives,
      payload,
      temporaryCriterionIds,
    } = await createBackendPayloadFixture();
    const criterionIds = criteria.map((criterion) => String(criterion._id));
    const alternativeIds = alternatives.map((alternative) => String(alternative._id));

    expect(payload.context.alternatives.map(({ id }) => id)).toEqual(alternativeIds);
    expect(payload.context.criteria.map(({ id }) => id)).toEqual(criterionIds);
    expect(payload.context.criteria.map(({ name, type, expressionDomain }) => ({
      name,
      type,
      expressionDomain: {
        typeKey: expressionDomain.typeKey,
        definition: expressionDomain.definition,
      },
    }))).toEqual([
      {
        name: "Quality",
        type: "benefit",
        expressionDomain: {
          typeKey: "numericDiscrete",
          definition: { min: 1, max: 9, step: 1 },
        },
      },
      {
        name: "Cost",
        type: "cost",
        expressionDomain: {
          typeKey: "numericDiscrete",
          definition: { min: 1, max: 9, step: 1 },
        },
      },
    ]);
    expect(payload.modelParameters.weights).toEqual({
      [criterionIds[0]]: 0.6,
      [criterionIds[1]]: 0.4,
    });
    expect(payload.modelParameters.boundaryProfiles.profiles).toEqual([
      {
        profileId: "medium-boundary",
        categoryId: "medium",
        valuesByCriterionId: { [criterionIds[0]]: 4, [criterionIds[1]]: 6 },
      },
      {
        profileId: "high-boundary",
        categoryId: "high",
        valuesByCriterionId: { [criterionIds[0]]: 7, [criterionIds[1]]: 3 },
      },
    ]);
    expect(Object.keys(payload.modelParameters.boundaryProfiles.profiles[0].valuesByCriterionId))
      .not.toContain(temporaryCriterionIds.Quality);
    expect(Object.keys(payload.modelParameters.boundaryProfiles.profiles[0].valuesByCriterionId))
      .not.toContain(temporaryCriterionIds.Cost);

    const pythonResult = executeDecisionModel(payload);
    expect(pythonResult.prepared.criteria).toEqual([
      {
        criterion_id: criterionIds[0],
        direction: "benefit",
        weight: 0.6,
        minimum: 1,
        maximum: 9,
      },
      {
        criterion_id: criterionIds[1],
        direction: "cost",
        weight: 0.4,
        minimum: 1,
        maximum: 9,
      },
    ]);
    expect(pythonResult.prepared.alternatives).toEqual([
      {
        alternative_id: alternativeIds[0],
        values_by_criterion_id: { [criterionIds[0]]: 2, [criterionIds[1]]: 8 },
      },
      {
        alternative_id: alternativeIds[1],
        values_by_criterion_id: { [criterionIds[0]]: 5, [criterionIds[1]]: 5 },
      },
      {
        alternative_id: alternativeIds[2],
        values_by_criterion_id: { [criterionIds[0]]: 8, [criterionIds[1]]: 2 },
      },
    ]);
    expect(pythonResult.prepared.categories).toEqual(categories.map((category) => ({
      category_id: category.categoryId,
      label: category.label,
      order: category.order,
    })));
    expect(pythonResult.prepared.profiles).toEqual([
      {
        profile_id: "medium-boundary",
        category_id: "medium",
        values_by_criterion_id: { [criterionIds[0]]: 4, [criterionIds[1]]: 6 },
      },
      {
        profile_id: "high-boundary",
        category_id: "high",
        values_by_criterion_id: { [criterionIds[0]]: 7, [criterionIds[1]]: 3 },
      },
    ]);

    const result = unwrapModelApiResponse({ status: 200, data: pythonResult.response });
    expect(pythonResult.response.success).toBe(true);
    expect(result.categories).toEqual(categories);
    expect(result.assignments).toHaveLength(alternativeIds.length);
    expect(result.assignments.map(({ alternativeId }) => alternativeId).sort())
      .toEqual([...alternativeIds].sort());
    expect(result.assignments.every(({ categoryId }) => categories.some(
      (category) => category.categoryId === categoryId
    ))).toBe(true);
    expect(result).not.toHaveProperty("rank");
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("rankedAlternatives");

    const resultStructureContext = await buildIssueResultStructureContextOrThrow({ issue });
    expect(resultStructureContext.authorizedCategories).toEqual(categories);
    const modelExecutionResult = buildIssueModelExecutionResult({
      issue,
      message: pythonResult.response.message,
      result,
      structureKey: "alternativeCriteriaMatrix",
      context: {
        ...resultStructureContext,
        authorizedAlternativeIds: payload.context.alternatives.map(({ id }) => id),
      },
    });
    expect(modelExecutionResult.standardResult.categories).toEqual(categories);
    expect(modelExecutionResult.standardResult.assignments).toEqual(result.assignments);
    expect(modelExecutionResult.standardResult.diagnostics).toEqual(result.diagnostics);
    expect(modelExecutionResult.standardResult).not.toHaveProperty("rankedAlternatives");

    const resultMetadata = resolveResultStructureMetadata(issue);
    const stageProjection = projectNormalizedResultOrThrow({
      ...resultMetadata,
      result: modelExecutionResult.standardResult,
      target: "stagePersistence",
    });
    expect(stageProjection.diagnostics).toEqual(result.diagnostics);
    expect(stageProjection.assignments.map(({ alternativeId }) => alternativeId))
      .toEqual(alternativeIds);
    expect(stageProjection).not.toHaveProperty("rankedAlternatives");

    const stageResult = await IssueStageResult.create({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      result: {
        ...resultMetadata,
        standardResult: stageProjection,
        modelExecution: modelExecutionResult.modelExecution,
        rawOutput: modelExecutionResult.rawOutput,
      },
    });
    const savedStageResult = await IssueStageResult.findById(stageResult._id).lean();
    expect(savedStageResult.result.standardResult.diagnostics).toEqual(result.diagnostics);
    expect(savedStageResult.result.standardResult.assignments.map(({ alternativeId }) => alternativeId))
      .toEqual(alternativeIds);

    const finishedPhase = serializePhaseResults({
      phaseResults: [savedStageResult],
      alternatives: alternatives.map((alternative) => ({
        id: String(alternative._id),
        name: alternative.name,
      })),
    })[0];
    expect(finishedPhase.standardizedOutput.diagnostics).toEqual(result.diagnostics);
    expect(finishedPhase.assignments.map(({ alternativeId }) => alternativeId))
      .toEqual(alternativeIds);
    expect(finishedPhase).not.toHaveProperty("rankedAlternatives");
    expect(finishedPhase.standardizedOutput).not.toHaveProperty("rankedAlternatives");
    expect(model.implementationStatus).toBe("scaffold");
    expect(model.publicUsable).toBe(false);
  }, 30000);
});
