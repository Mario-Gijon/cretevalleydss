import { describe, expect, it } from "vitest";

import { Criterion } from "../../../models/Criteria.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueExecutionAttempt } from "../../../models/IssueExecutionAttempts.js";
import { IssueResultsAnalysis } from "../../../models/IssueResultsAnalyses.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { getFinishedIssueInfoPayload } from "../../../modules/issues/finished/getFinishedIssueInfoPayload.js";
import {
  createConfirmedUser,
  createIssueAlternativesFixture,
  createIssueExpressionDomainSnapshotFixture,
  createIssueFixture,
  createIssueModel,
  createParticipationFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

describe("TOPSIS-Sort Finished collective projection", () => {
  it("re-reads analysis persisted after finalization and projects its applied 10 by 6 matrix", async () => {
    const owner = await createConfirmedUser({ email: "sorting-owner@example.test" });
    const experts = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        createConfirmedUser({ email: `sorting-expert-${index + 1}@example.test` })
      )
    );
    const model = await createIssueModel({
      name: "TOPSIS-Sort 2016",
      apiModelKey: "topsis_sort_2016",
      apiEndpoint: { method: "POST", path: "/topsis_sort_2016" },
      evaluationStructureKey: "alternativeCriteriaMatrix",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      supportsExpertCriteriaWeighting: false,
      supportsConsensus: false,
      usesCriteriaWeights: true,
      usesExpertWeights: true,
      supportedExpressionDomains: [{ typeKey: "numericDiscrete", constraints: {} }],
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      modelId: model._id,
      name: "TOPSIS-Sort collective fixture",
      active: false,
      currentStage: "finished",
      consensusPhase: 0,
      apiModelKey: "topsis_sort_2016",
      apiEndpoint: { method: "POST", path: "/topsis_sort_2016" },
      evaluationStructureKey: "alternativeCriteriaMatrix",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      isConsensus: false,
      supportsConsensus: false,
      finishedAt: new Date("2026-01-12T10:00:00.000Z"),
      modelParameters: {},
    });
    const alternatives = await createIssueAlternativesFixture({
      issueId: issue._id,
      names: Array.from({ length: 10 }, (_, index) => `Alternative ${index + 1}`),
    });
    const domain = await createIssueExpressionDomainSnapshotFixture({
      issueId: issue._id,
      type: "numeric",
      name: "Numeric performance",
      numericRange: { min: 0, max: 100, step: 1 },
    });
    const criteria = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        Criterion.create({
          issue: issue._id,
          parentCriterion: null,
          name: `Criterion ${index + 1}`,
          type: index % 2 === 0 ? "benefit" : "cost",
          isLeaf: true,
          expressionDomain: domain._id,
          position: index,
        })
      )
    );
    const orderedCategories = [
      { categoryId: "low", label: "Low", order: 0 },
      { categoryId: "high", label: "High", order: 1 },
    ];
    const weights = Object.fromEntries(criteria.map((criterion) => [String(criterion._id), 1 / criteria.length]));
    issue.modelParameters = { weights, orderedCategories };
    await issue.save();

    await Promise.all(experts.map((expert) => createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      evaluationCompleted: true,
      weight: 0.25,
      entryStage: "alternativeEvaluation",
      entryPhase: 0,
    })));
    const payloadByExpert = experts.map((_, expertIndex) =>
      Object.fromEntries(alternatives.map((alternative, alternativeIndex) => [
        String(alternative._id),
        Object.fromEntries(criteria.map((criterion, criterionIndex) => [
          String(criterion._id),
          10 + alternativeIndex + criterionIndex + expertIndex * 10,
        ])),
      ]))
    );
    await Promise.all(experts.map((expert, index) => IssueEvaluation.create({
      issue: issue._id,
      expert: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      payload: payloadByExpert[index],
      completed: true,
      submittedAt: new Date("2026-01-11T12:00:00.000Z"),
    })));

    const standardResult = {
      categories: orderedCategories,
      categoryOrderSemantics: "lower-order-is-less-preferred",
      assignments: alternatives.map((alternative) => ({
        alternativeId: String(alternative._id),
        categoryId: "low",
      })),
    };
    const stageResult = await IssueStageResult.create({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      inputSnapshot: { expertWeights: experts.map((expert) => ({ expert: expert._id, weight: 0.25 })) },
      result: {
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        standardResult,
        modelExecution: { executionAttemptId: "pending" },
        rawOutput: { classifications: "unchanged" },
      },
    });
    const requestBody = {
      modelParameters: issue.modelParameters,
      evaluations: experts.map((expert, index) => ({
        expert: { id: String(expert._id), name: expert.name, email: expert.email },
        payload: payloadByExpert[index],
        weight: 0.25,
      })),
      context: {
        issue: { id: String(issue._id), name: issue.name },
        alternatives: alternatives.map((alternative) => ({ id: String(alternative._id), name: alternative.name })),
        criteria: criteria.map((criterion) => ({
          id: String(criterion._id),
          name: criterion.name,
          type: criterion.type,
          expressionDomain: {
            typeKey: domain.typeKey,
            definition: domain.definition,
          },
        })),
        consensusPhase: 0,
        structure: { key: "alternativeCriteriaMatrix", stage: "alternativeEvaluation" },
      },
    };
    const attempt = await IssueExecutionAttempt.create({
      issue: issue._id,
      scope: "issueStage",
      actorType: "user",
      actorUser: owner._id,
      correlationId: "topsis-sort-collective-fixture",
      evaluationStage: "alternativeEvaluation",
      issueStage: "alternativeEvaluation",
      consensusPhase: 0,
      modelContext: {
        modelId: model._id,
        modelName: model.name,
        apiModelKey: "topsis_sort_2016",
        evaluationStructureKey: "alternativeCriteriaMatrix",
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
        modelKind: "alternativeEvaluation",
      },
      request: { body: requestBody, method: "POST", apiEndpointPath: "/topsis_sort_2016", resolvedUrl: "http://decision-models.test/topsis_sort_2016", serviceBaseUrl: "http://decision-models.test" },
      status: "succeeded",
      startedAt: new Date("2026-01-11T12:01:00.000Z"),
      completedAt: new Date("2026-01-11T12:01:01.000Z"),
      application: { status: "pending", completedAt: null, entityType: null, entityId: null, resultSnapshot: null, error: null },
    });
    stageResult.executionAttempt = attempt._id;
    stageResult.result.modelExecution.executionAttemptId = String(attempt._id);
    await stageResult.save();
    attempt.application = {
      status: "applied",
      completedAt: new Date("2026-01-11T12:01:02.000Z"),
      entityType: "stageResult",
      entityId: stageResult._id,
      resultSnapshot: stageResult.toObject(),
      error: null,
    };
    await attempt.save();

    const collectiveEvaluations = alternatives.map((alternative) => ({
      alternativeId: String(alternative._id),
      valuesByCriterionId: Object.fromEntries(criteria.map((criterion, criterionIndex) => [
        String(criterion._id),
        payloadByExpert.reduce((total, expertPayload) =>
          total + expertPayload[String(alternative._id)][String(criterion._id)], 0) / experts.length,
      ])),
    }));

    const payloadBeforeAnalysisPersistence = await getFinishedIssueInfoPayload({
      issueId: issue._id,
      userId: owner._id,
    });
    const collectiveBeforeAnalysisPersistence = payloadBeforeAnalysisPersistence.evaluations.collective.find(
      (entry) => entry.stage === "alternativeEvaluation" && entry.phase === 0
    );
    expect(collectiveBeforeAnalysisPersistence.rawPayload).toBeNull();

    await IssueResultsAnalysis.create({
      issue: issue._id,
      executionKey: "base",
      executionType: "base",
      genericAnalysis: { facts: { fixture: true }, interpretation: "Fixture analysis", visualizations: [] },
      stageAnalyses: {
        alternativeEvaluation: {
          apiModelKey: "topsis_sort_2016",
          analysis: {
            facts: {
              status: "available",
              sourcePhase: 0,
              executionId: String(attempt._id),
              comparisonKey: "frozen-input-comparison",
              collectiveEvaluations,
            },
            interpretation: "Fixture model analysis",
            visualizations: [],
            sections: [],
          },
        },
      },
      generatedAt: new Date("2026-01-12T11:00:00.000Z"),
    });

    const payload = await getFinishedIssueInfoPayload({ issueId: issue._id, userId: owner._id });
    const collective = payload.evaluations.collective.find(
      (entry) => entry.stage === "alternativeEvaluation" && entry.phase === 0
    );
    const expected = Object.fromEntries(collectiveEvaluations.map((row) => [row.alternativeId, row.valuesByCriterionId]));

    expect(collective.rawPayload).toEqual(expected);
    expect(Object.keys(collective.rawPayload)).toHaveLength(10);
    expect(Object.keys(collective.rawPayload[String(alternatives[0]._id)])).toHaveLength(6);
    expect(payload.evaluations.individual.filter((entry) => entry.stage === "alternativeEvaluation")).toHaveLength(4);
    expect(payload.phaseResults.find((entry) => entry.stage === "alternativeEvaluation")).toMatchObject({
      categories: orderedCategories,
      assignments: standardResult.assignments,
    });
    expect(payload.phaseResults.find((entry) => entry.stage === "alternativeEvaluation").standardizedOutput).not.toHaveProperty("collectiveEvaluations");
  });
});
