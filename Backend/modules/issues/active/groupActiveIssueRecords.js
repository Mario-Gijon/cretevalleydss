import { createInternalError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import {
  getStageExpertWeights,
  getStageStandardResult,
} from "../stageResults/stageResultContract.js";
import { resolveResultStructureMetadata } from "../../decisionPlugins/resultStructureMetadata.js";
import {
  RESULT_STRUCTURE_REGISTRY,
  isResultStructureCapabilityEnabled,
  projectNormalizedResultOrThrow,
} from "../../decisionPlugins/resultStructures/resultStructureRegistry.js";

const groupByIssueId = (items, selector, { recordType }) => {
  const grouped = {};

  for (const item of items) {
    const issueId = toIdString(selector(item));
    if (!issueId) {
      throw createInternalError("Active issue record is missing a valid issue id", {
        field: "issue",
        details: {
          recordType,
        },
      });
    }

    if (!grouped[issueId]) {
      grouped[issueId] = [];
    }

    grouped[issueId].push(item);
  }

  return grouped;
};

export const buildActiveIssueCollections = ({
  participations,
  alternatives,
  criteria,
  alternativeStageResults,
  resultStructureRegistry = RESULT_STRUCTURE_REGISTRY,
}) => {
  const consensusByIssue = {};

  for (const stageResult of alternativeStageResults) {
    const standardResult = getStageStandardResult(stageResult);
    const resultStructureMetadata = resolveResultStructureMetadata(
      stageResult.result ?? {},
      { registry: resultStructureRegistry }
    );
    const hasConsensusCapability = isResultStructureCapabilityEnabled({
      ...resultStructureMetadata,
      capability: "consensus",
      registry: resultStructureRegistry,
    });
    const issueId = toIdString(stageResult.issue);
    if (!issueId) {
      throw createInternalError("IssueStageResult issue id is invalid", {
        field: "issue",
      });
    }

    if (!Number.isInteger(stageResult.consensusPhase) || stageResult.consensusPhase < 0) {
      throw createInternalError("IssueStageResult consensusPhase must be a non-negative integer", {
        field: "consensusPhase",
        details: {
          issueId,
        },
      });
    }

    if (
      hasConsensusCapability &&
      (typeof standardResult.consensusMeasure !== "number" ||
        !Number.isFinite(standardResult.consensusMeasure))
    ) {
      throw createInternalError("IssueStageResult consensusMeasure must be finite", {
        field: "consensusMeasure",
        details: {
          issueId,
          phase: stageResult.consensusPhase,
        },
      });
    }

    if (!isPlainObject(stageResult.result?.modelExecution)) {
      throw createInternalError("IssueStageResult modelExecution must be an object", {
        field: "modelExecution",
        details: {
          issueId,
          phase: stageResult.consensusPhase,
        },
      });
    }

    if (!isPlainObject(stageResult.result?.rawOutput)) {
      throw createInternalError("IssueStageResult rawOutput must be an object", {
        field: "rawOutput",
        details: {
          issueId,
          phase: stageResult.consensusPhase,
        },
      });
    }

    if (!stageResult.updatedAt && !stageResult.createdAt) {
      throw createInternalError("IssueStageResult computedAt timestamp is missing", {
        field: "updatedAt",
        details: {
          issueId,
          phase: stageResult.consensusPhase,
        },
      });
    }

    if (!consensusByIssue[issueId]) {
      consensusByIssue[issueId] = [];
    }

    consensusByIssue[issueId].push(stageResult);
  }

  return {
    participationMap: groupByIssueId(
      participations,
      (participation) => participation.issue,
      { recordType: "participation" }
    ),
    alternativesMap: groupByIssueId(
      alternatives,
      (alternative) => alternative.issue,
      { recordType: "alternative" }
    ),
    criteriaMap: groupByIssueId(criteria, (criterion) => criterion.issue, {
      recordType: "criterion",
    }),
    consensusHistoryByIssue: Object.fromEntries(
      Object.entries(consensusByIssue).map(([issueId, docs]) => [
        issueId,
        docs
          .sort((left, right) => left.consensusPhase - right.consensusPhase)
          .map((stageResult) => {
            const standardResult = getStageStandardResult(stageResult);
            const resultStructureMetadata = resolveResultStructureMetadata(
              stageResult.result ?? {},
              { registry: resultStructureRegistry }
            );
            const projectedResult = projectNormalizedResultOrThrow({
              ...resultStructureMetadata,
              result: standardResult,
              target: "activeIssueResponse",
              context: { rawOutput: stageResult.result.rawOutput },
              registry: resultStructureRegistry,
            });
            return {
              phase: stageResult.consensusPhase,
              computedAt: stageResult.updatedAt || stageResult.createdAt,
              ...resultStructureMetadata,
              standardResult,
              consensusLevel: standardResult.consensusMeasure ?? null,
              consensusMeasure: standardResult.consensusMeasure ?? null,
              ...projectedResult,
              modelExecution: stageResult.result.modelExecution,
              expertWeights: getStageExpertWeights(stageResult),
            };
          }),
      ])
    ),
  };
};
