import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { beforeAll, describe, expect, it, vi } from "vitest";

const evaluationStructureState = vi.hoisted(() => ({
  orderedEntities: null,
}));

vi.mock("../../modules/issues/evaluations/evaluationStructureData.js", () => ({
  getOrderedAlternativeAndCriterionNames: (...args) =>
    evaluationStructureState.orderedEntities(...args),
}));

import { IssueExecutionAttempt } from "../../models/IssueExecutionAttempts.js";
import { IssueStageResult } from "../../models/IssueStageResults.js";
import { saveAHPSortAlternativeProfilesPayload } from "../../modules/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/ahpSortAlternativeProfiles.save.js";
import { normalizeAHPSortProfilesConfiguration } from "../../modules/decisionPlugins/shared/ahpSortProfiles.js";
import {
  projectNormalizedResultOrThrow,
} from "../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js";
import { buildIssueModelExecutionResult } from "../../modules/issues/modelExecution/buildIssueModelExecutionResult.js";
import { buildIssueModelRequestPayload } from "../../modules/issues/modelExecution/buildIssueModelRequestPayload.js";
import { validateAndNormalizeModelParametersOrThrow } from "../../modules/modelParameters/validateAndNormalizeModelParameters.js";
import { serializePhaseResults } from "../../modules/issues/finished/finishedPayload/serializers/serializePhaseResults.js";
import { unwrapModelApiResponse } from "../../services/modelApi/modelResponse.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const repositoryRoot = resolve(backendRoot, "..");
const decisionModelsServiceRoot = resolve(repositoryRoot, "DecisionModelsService");
const configuredPython = process.env.DECISION_MODELS_PYTHON?.trim();
const bundledPython = resolve(decisionModelsServiceRoot, ".venv/bin/python");
const python = configuredPython || (existsSync(bundledPython) ? bundledPython : null);
const describeWithPython = python ? describe : describe.skip;
const pythonAdapterScript = [
  "import json, sys, numpy as np",
  "from schemas.model_requests import GenericModelExecutionRequest",
  "from models.ahp_sort_i.executor import _execution_input, execute_ahp_sort_i",
  "payload = GenericModelExecutionRequest.model_validate(json.load(sys.stdin))",
  "prepared = _execution_input(payload)",
  "response = execute_ahp_sort_i(payload)",
  "if hasattr(response, 'body'):",
  "    response = json.loads(response.body)",
  "def json_default(value):",
  "    if isinstance(value, np.ndarray): return value.tolist()",
  "    if isinstance(value, np.generic): return value.item()",
  "    raise TypeError(f'Object of type {type(value).__name__} is not JSON serializable')",
  "print(json.dumps({'prepared': prepared, 'response': response}, default=json_default))",
].join("\n");
const examplesScript = [
  "import json",
  "from models.ahp_sort_i.examples import AHPSORT_I_REQUEST_EXAMPLES",
  "print(json.dumps({key: example['value'] for key, example in AHPSORT_I_REQUEST_EXAMPLES.items()}))",
].join("\n");

const runDecisionModelsServiceAdapter = (payload) => {
  if (!python) {
    throw new Error(
      "Set DECISION_MODELS_PYTHON or install DecisionModelsService/.venv to run the AHPSort I contract integration."
    );
  }
  return JSON.parse(execFileSync(python, ["-c", pythonAdapterScript], {
    cwd: decisionModelsServiceRoot,
    input: JSON.stringify(payload),
    encoding: "utf8",
  }));
};

const readDmsExamples = () => JSON.parse(execFileSync(python, ["-c", examplesScript], {
  cwd: decisionModelsServiceRoot,
  encoding: "utf8",
}));

let dmsExamples;

const remapEvaluationIds = (payload, { alternativeIdBySourceId, criterionIdBySourceId }) => ({
  alternativeProfileComparisons: payload.alternativeProfileComparisons.map((row) => ({
    ...row,
    alternativeId: alternativeIdBySourceId.get(row.alternativeId),
    criterionId: criterionIdBySourceId.get(row.criterionId),
  })),
  profileComparisons: payload.profileComparisons.map((row) => ({
    ...row,
    criterionId: criterionIdBySourceId.get(row.criterionId),
  })),
});

const buildBackendRequestFromDmsExample = async (
  exampleKey,
  { groupTiePolicy = null, expertCount = 1 } = {}
) => {
  const source = structuredClone(dmsExamples[exampleKey]);
  const alternatives = source.context.alternatives.map((alternative, index) => ({
    ...alternative,
    _id: `alternative-mongo-${index + 1}`,
  }));
  const criteria = source.context.criteria.map((criterion, index) => ({
    ...criterion,
    _id: `criterion-mongo-${index + 1}`,
    type: index === 0 ? "benefit" : "cost",
    expressionDomain: {
      typeKey: "numericContinuous",
      definition: { min: 0, max: 10 },
    },
  }));
  const alternativeIdBySourceId = new Map(
    source.context.alternatives.map((alternative, index) => [
      alternative.id,
      alternatives[index]._id,
    ])
  );
  const criterionIdBySourceId = new Map(
    source.context.criteria.map((criterion, index) => [
      criterion.id,
      criteria[index]._id,
    ])
  );
  const orderedCategories = [...source.modelParameters.orderedCategories].sort(
    (left, right) => left.order - right.order
  );
  const normalizedProfiles = normalizeAHPSortProfilesConfiguration({
    value: source.modelParameters.ahpSortProfiles,
    categories: orderedCategories,
  });
  if (normalizedProfiles.error) {
    throw new Error(`DMS fixture has invalid AHPSort I profiles: ${normalizedProfiles.error}`);
  }
  let normalizedGroupParameters = {};
  if (groupTiePolicy !== null) {
    normalizedGroupParameters = validateAndNormalizeModelParametersOrThrow({
      model: {
        name: "AHPSort I test manifest definition",
        parameters: [
          { key: "orderedCategories", parameterStructureKey: "orderedCategories", required: true },
          { key: "ahpSortProfiles", parameterStructureKey: "ahpSortProfiles", required: true },
          { key: "ahpSortGroup", parameterStructureKey: "ahpSortGroup", required: false },
        ],
      },
      paramValues: {
        orderedCategories,
        ahpSortProfiles: normalizedProfiles.value,
        ahpSortGroup: { tiePolicy: groupTiePolicy },
      },
      criteriaNodes: criteria,
      alternatives,
    });
  }
  const modelParameters = {
    ...source.modelParameters,
    ...normalizedGroupParameters,
    orderedCategories,
    ahpSortProfiles: normalizedProfiles.value,
    weights: Object.fromEntries(
      source.context.criteria.map((criterion, index) => [
        criteria[index]._id,
        source.modelParameters.weights[criterion.id],
      ])
    ),
  };
  const issue = {
    _id: "ahp-sort-i-contract-issue",
    name: "AHPSort I Backend to DMS contract",
    apiModelKey: "ahp_sort_i",
    apiEndpoint: { method: "POST", path: "/ahp_sort_i" },
    modelParameters,
    consensusThreshold: null,
    consensusMaxPhases: null,
  };
  const evaluationPayload = remapEvaluationIds(source.evaluations[0].payload, {
    alternativeIdBySourceId,
    criterionIdBySourceId,
  });
  if (modelParameters.ahpSortProfiles.mode === "limiting") {
    const reciprocalComparison = evaluationPayload.alternativeProfileComparisons.find(
      (row) => Math.abs(row.alternativeToProfile - 1 / 3) < 1e-12
    );
    reciprocalComparison.alternativeToProfile = "0.3333333333333";
    evaluationPayload.profileComparisons[0].firstToSecond = "0.3333333333333";
  } else {
    evaluationPayload.profileComparisons[0].firstToSecond = "3.0000000000005";
  }
  const expectedWeightsByCriterionId = Object.fromEntries(
    source.context.criteria.map((criterion, index) => [
      criteria[index]._id,
      source.modelParameters.weights[criterion.id],
    ])
  );
  evaluationStructureState.orderedEntities = vi.fn().mockResolvedValue({
    alternatives,
    criteria,
  });

  const persistedEvaluationPayload = await saveAHPSortAlternativeProfilesPayload({
    payload: evaluationPayload,
    mode: "submit",
    decisionContext: {
      alternatives: alternatives.map(({ _id, name }) => ({ id: _id, name })),
      leafCriteria: criteria.map(({ _id, name }) => ({ id: _id, name })),
      modelParameters,
    },
  });
  const expertIds = Array.from({ length: expertCount }, () =>
    new mongoose.Types.ObjectId().toString()
  );
  const evaluations = await Promise.all(Array.from({ length: expertCount }, async (_, index) => ({
    expert: {
      _id: expertIds[index],
      name: index === 0 ? source.evaluations[0].expert.name : `Expert ${index + 1}`,
      email: `ahpsort-expert-${index + 1}@example.test`,
    },
    payload: index === 0
      ? persistedEvaluationPayload
      : structuredClone(persistedEvaluationPayload),
  })));
  const payload = await buildIssueModelRequestPayload({
    issue,
    structureKey: "ahpSortAlternativeProfiles",
    evaluations,
    expertWeightsByExpertId: expertCount > 1
      ? new Map(evaluations.map(({ expert }) => [expert._id, 1 / expertCount]))
      : null,
    phase: 0,
  });

  return {
    issue,
    alternatives,
    criteria,
    categories: [...modelParameters.orderedCategories].sort(
      (left, right) => left.order - right.order
    ),
    expectedWeightsByCriterionId,
    payload,
  };
};

describeWithPython("AHPSort I Backend → DMS → sorting@1 contract integration", () => {
  beforeAll(() => {
    dmsExamples = readDmsExamples();
  });

  it.each([
    ["limiting_profiles", "limiting"],
    ["central_profiles_with_tie", "central"],
  ])("builds and normalizes the %s execution contract", async (exampleKey, mode) => {
    const {
      issue,
      alternatives,
      criteria,
      categories,
      expectedWeightsByCriterionId,
      payload,
    } =
      await buildBackendRequestFromDmsExample(exampleKey);
    const modelParameters = payload.modelParameters;
    const pythonResult = runDecisionModelsServiceAdapter(payload);
    const response = pythonResult.response;
    const criterionIds = criteria.map((criterion) => String(criterion._id));
    const alternativeIds = alternatives.map((alternative) => String(alternative._id));

    expect(payload.context.structure).toEqual({
      key: "ahpSortAlternativeProfiles",
      stage: "alternativeEvaluation",
    });
    expect(payload.modelParameters.weights).toEqual(expectedWeightsByCriterionId);
    expect(payload.context.criteria.map(({ id }) => id)).toEqual(criterionIds);
    expect(payload.context.alternatives.map(({ id }) => id)).toEqual(alternativeIds);
    expect(payload.evaluations).toHaveLength(1);
    if (mode === "limiting") {
      expect(payload.evaluations[0].payload.alternativeProfileComparisons[0]
        .alternativeToProfile).toBe(1 / 3);
      expect(payload.evaluations[0].payload.profileComparisons[0].firstToSecond)
        .toBe(1 / 3);
    } else {
      expect(payload.evaluations[0].payload.profileComparisons[0].firstToSecond)
        .toBe(3);
    }
    expect(pythonResult.prepared.profileMode).toBe(mode);
    expect(pythonResult.prepared.criterionWeightsById).toEqual(
      expectedWeightsByCriterionId
    );
    expect(pythonResult.prepared.categories).toEqual(categories.map((category) => ({
      id: category.categoryId,
      name: category.label,
    })));
    expect(pythonResult.prepared.profiles.map((profile) => profile.profileId)).toEqual(
      modelParameters.ahpSortProfiles.profiles.map((profile) => profile.profileId)
    );
    expect(pythonResult.prepared.comparisons.every((comparison) =>
      alternativeIds.includes(comparison.alternativeId) &&
      criterionIds.includes(comparison.criterionId)
    )).toBe(true);
    expect(pythonResult.prepared.profileComparisons.every((comparison) =>
      criterionIds.includes(comparison.criterionId)
    )).toBe(true);
    expect(response.success).toBe(true);

    const result = unwrapModelApiResponse({ status: 200, data: response });
    const normalizedExecution = buildIssueModelExecutionResult({
      issue: {
        ...issue,
        apiModelKey: "ahp_sort_i",
        apiEndpoint: { method: "POST", path: "/ahp_sort_i" },
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
      },
      message: response.message,
      result,
      structureKey: "ahpSortAlternativeProfiles",
      context: {
        authorizedCategories: categories,
        authorizedAlternativeIds: alternativeIds,
      },
    });
    const standardResult = normalizedExecution.standardResult;

    expect(standardResult.categories).toEqual(categories);
    expect(standardResult.assignments.map(({ alternativeId }) => alternativeId)).toEqual(
      alternativeIds
    );
    expect(standardResult.assignments.every(({ categoryId }) =>
      categories.some((category) => category.categoryId === categoryId)
    )).toBe(true);
    expect(standardResult.diagnostics.profileMode).toBe(mode);
    expect(standardResult.diagnostics.resultsByAlternativeId).toHaveProperty(alternativeIds[0]);
    expect(standardResult).not.toHaveProperty("rankedAlternatives");
    expect(standardResult).not.toHaveProperty("scores");

    const firstAlternativeDiagnostics =
      standardResult.diagnostics.resultsByAlternativeId[alternativeIds[0]];
    expect(firstAlternativeDiagnostics.weightsByCriterion).toEqual(
      payload.modelParameters.weights
    );
    expect(firstAlternativeDiagnostics.weightedContributionsByCriterion).toBeDefined();
    for (const criterionId of criterionIds) {
      expect(firstAlternativeDiagnostics.localPrioritiesByCriterion[criterionId])
        .toHaveProperty("consistency.consistencyRatio");
      expect(firstAlternativeDiagnostics.localPrioritiesByCriterion[criterionId])
        .toHaveProperty("pairwiseMatrix");
    }
    if (mode === "central") {
      expect(standardResult.diagnostics.tiePolicy).toBe(
        modelParameters.ahpSortProfiles.tiePolicy
      );
      expect(firstAlternativeDiagnostics.classification.tiePolicy).toBe(
        modelParameters.ahpSortProfiles.tiePolicy
      );
    }

    const stagePersistence = projectNormalizedResultOrThrow({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      result: standardResult,
      target: "stagePersistence",
    });
    const issueId = new mongoose.Types.ObjectId();
    const attempt = await IssueExecutionAttempt.create({
      issue: issueId,
      scope: "issueStage",
      actorType: "user",
      actorUser: new mongoose.Types.ObjectId(),
      correlationId: `ahpsort-${mode}-contract`,
      evaluationStage: "alternativeEvaluation",
      issueStage: "alternativeEvaluation",
      consensusPhase: 0,
      modelContext: {
        modelId: "ahpsort-fixture",
        apiModelKey: "ahp_sort_i",
        apiEndpointPath: "/ahp_sort_i",
        evaluationStructureKey: "ahpSortAlternativeProfiles",
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        serviceBaseUrl: "direct-adapter-test",
      },
      request: {
        body: payload,
        method: "POST",
        apiEndpointPath: "/ahp_sort_i",
        resolvedUrl: "direct-adapter-test/ahp_sort_i",
        serviceBaseUrl: "direct-adapter-test",
      },
      status: "succeeded",
      startedAt: new Date(),
      completedAt: new Date(),
      normalizedResult: normalizedExecution,
      application: { status: "pending" },
    });
    const stageResult = await IssueStageResult.create({
      issue: issueId,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      executionAttempt: attempt._id,
      result: {
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        standardResult: stagePersistence,
        modelExecution: {
          ...normalizedExecution.modelExecution,
          executionAttemptId: String(attempt._id),
        },
        rawOutput: normalizedExecution.rawOutput,
      },
    });
    await IssueExecutionAttempt.updateOne(
      { _id: attempt._id },
      { $set: {
        application: {
          status: "applied",
          completedAt: new Date(),
          entityType: "stageResult",
          entityId: stageResult._id,
          resultSnapshot: stageResult.toObject(),
          error: null,
        },
      } }
    );

    const savedStageResult = await IssueStageResult.findById(stageResult._id).lean();
    const savedAttempt = await IssueExecutionAttempt.findById(attempt._id).lean();
    expect(savedStageResult.result.standardResult.diagnostics).toEqual(
      standardResult.diagnostics
    );
    const finishedPhase = serializePhaseResults({
      phaseResults: [savedStageResult],
      alternatives: alternatives.map((alternative) => ({
        id: String(alternative._id),
        name: alternative.name,
      })),
    })[0];
    expect(finishedPhase.standardizedOutput.diagnostics).toEqual(
      standardResult.diagnostics
    );
    expect(finishedPhase.assignments).toEqual(standardResult.assignments);
    expect(savedStageResult.result.modelExecution.executionAttemptId).toBe(
      String(attempt._id)
    );
    expect(savedAttempt.request.body.modelParameters).toEqual(modelParameters);
    expect(savedAttempt.modelContext).toMatchObject({
      apiModelKey: "ahp_sort_i",
      evaluationStructureKey: "ahpSortAlternativeProfiles",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
    });
    expect(savedAttempt.application).toMatchObject({
      status: "applied",
      entityType: "stageResult",
      entityId: stageResult._id,
    });
  });

  it("validates and executes the Backend multi-expert contract through DMS and sorting@1 persistence", async () => {
    const fixture = await buildBackendRequestFromDmsExample("limiting_profiles", {
      groupTiePolicy: "pessimistic",
      expertCount: 3,
    });
    const { issue, alternatives, categories, payload } = fixture;
    const pythonResult = runDecisionModelsServiceAdapter(payload);
    const response = pythonResult.response;
    const expertIds = payload.evaluations.map(({ expert }) => expert.id);

    expect(payload.context.structure).toEqual({
      key: "ahpSortAlternativeProfiles",
      stage: "alternativeEvaluation",
    });
    expect(payload.modelParameters.ahpSortGroup).toEqual({ tiePolicy: "pessimistic" });
    expect(payload.evaluations).toHaveLength(3);
    expect(payload.evaluations.map((evaluation) => Object.keys(evaluation).sort())).toEqual(
      expertIds.map(() => ["expert", "payload"])
    );
    expect(payload.evaluations.map(({ expert }) => expert.id)).toEqual(expertIds);
    expect(pythonResult.prepared.expertEvaluations.map(({ expertId }) => expertId)).toEqual(expertIds);
    expect(response.success).toBe(true);
    expect(response.data.diagnostics).toMatchObject({
      aggregationMethod: "unweighted_plurality_vote",
      groupTiePolicy: "pessimistic",
    });
    expect(Object.keys(response.data.diagnostics.individualResultsByExpertId).sort()).toEqual(expertIds);

    const normalizedExecution = buildIssueModelExecutionResult({
      issue: {
        ...issue,
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
      },
      message: response.message,
      result: unwrapModelApiResponse({ status: 200, data: response }),
      structureKey: "ahpSortAlternativeProfiles",
      context: {
        authorizedCategories: categories,
        authorizedAlternativeIds: alternatives.map(({ _id }) => String(_id)),
      },
    });
    const standardResult = normalizedExecution.standardResult;
    expect(standardResult.assignments).toHaveLength(alternatives.length);
    expect(standardResult.diagnostics.individualResultsByExpertId).toHaveProperty(expertIds[0]);

    const stagePersistence = projectNormalizedResultOrThrow({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      result: standardResult,
      target: "stagePersistence",
    });
    const stageResult = await IssueStageResult.create({
      issue: new mongoose.Types.ObjectId(),
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      inputSnapshot: { expertIds, expertWeights: [] },
      result: {
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        standardResult: stagePersistence,
        modelExecution: normalizedExecution.modelExecution,
        rawOutput: normalizedExecution.rawOutput,
      },
    });
    const persisted = await IssueStageResult.findById(stageResult._id).lean();
    expect(persisted.inputSnapshot.expertIds.map(String)).toEqual(expertIds);
    expect(persisted.result.standardResult.diagnostics).toEqual(standardResult.diagnostics);
    expect(persisted.result.standardResult).not.toHaveProperty("rankedAlternatives");
  });

  it("keeps malformed AHPSort profiles and comparisons as structured DMS errors", async () => {
    const fixture = await buildBackendRequestFromDmsExample("limiting_profiles");
    const invalidProfiles = structuredClone(fixture.payload);
    invalidProfiles.modelParameters.ahpSortProfiles.profiles.pop();
    const profileResponse = runDecisionModelsServiceAdapter(invalidProfiles).response;
    expect(profileResponse.success).toBe(false);
    expect(profileResponse.error.code).toBe("VALIDATION_ERROR");

    const invalidComparison = structuredClone(fixture.payload);
    invalidComparison.evaluations[0].payload.alternativeProfileComparisons[0]
      .alternativeToProfile = 1.5;
    const comparisonResponse = runDecisionModelsServiceAdapter(invalidComparison).response;
    expect(comparisonResponse.success).toBe(false);
    expect(comparisonResponse.error.code).toBe("VALIDATION_ERROR");
  });
});
