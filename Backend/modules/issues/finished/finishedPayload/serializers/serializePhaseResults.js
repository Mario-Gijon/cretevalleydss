import { createInternalError } from "../../../../../utils/common/errors.js";
import {
  cloneSerializable,
  toIsoOrNull,
  toNullableId,
  toRequiredId,
} from "./serializers.shared.js";
import {
  getStageExpertIds,
  getStageExpertWeights,
  getStageStandardResult,
} from "../../../stageResults/stageResultContract.js";
import { resolveResultStructureMetadata } from "../../../../decisionPlugins/resultStructureMetadata.js";
import {
  projectNormalizedResultOrThrow,
  RESULT_STRUCTURE_REGISTRY,
} from "../../../../decisionPlugins/resultStructures/resultStructureRegistry.js";

const STAGE_ORDER = {
  criteriaWeighting: 0,
  alternativeEvaluation: 1,
};

const serializeCriteriaWeightingResult = ({ result, standardResult, alternatives }) => {
  const alternativesById = new Set(alternatives.map((alternative) => alternative.id));
  const alternativeIdsByName = alternatives.reduce((map, alternative) => {
    if (!map.has(alternative.name)) map.set(alternative.name, []);
    map.get(alternative.name).push(alternative.id);
    return map;
  }, new Map());
  const rankedAlternatives = Array.isArray(standardResult.rankedAlternatives)
    ? standardResult.rankedAlternatives.map((entry) => {
        const providedId = toNullableId(entry?.alternativeId);
        const name = typeof entry?.name === "string" ? entry.name : null;
        const alternativeId =
          providedId && alternativesById.has(providedId)
            ? providedId
            : name && alternativeIdsByName.get(name)?.length === 1
              ? alternativeIdsByName.get(name)[0]
              : null;

        return {
          alternativeId,
          name,
          score: entry?.score ?? null,
          rank: entry?.rank ?? null,
          ...(typeof entry?.classification === "string" && entry.classification.trim()
            ? { classification: entry.classification.trim() }
            : {}),
          ...(typeof entry?.resultLabel === "string" && entry.resultLabel.trim()
            ? { resultLabel: entry.resultLabel.trim() }
            : {}),
        };
      })
    : [];
  const consensusMeasure =
    typeof standardResult.consensusMeasure === "number" && Number.isFinite(standardResult.consensusMeasure)
      ? standardResult.consensusMeasure
      : null;

  return {
    consensusMeasure,
    rankedAlternatives,
    collectiveEvaluationId: toRequiredId(result, "phase result"),
    plotsGraphic: cloneSerializable(standardResult.plotsGraphic, {}),
    standardizedOutput: {
      rankedAlternatives,
      consensusMeasure,
      collectiveEvaluations: cloneSerializable(standardResult.collectiveEvaluations, {}),
      weightsByCriterion: cloneSerializable(standardResult.weightsByCriterion, null),
    },
  };
};

export const sortPhaseResults = (phaseResults) =>
  [...phaseResults].sort((left, right) => {
    const stageDifference =
      (STAGE_ORDER[left.stage] ?? 99) - (STAGE_ORDER[right.stage] ?? 99);
    if (stageDifference !== 0) return stageDifference;
    if (left.consensusPhase !== right.consensusPhase) {
      return left.consensusPhase - right.consensusPhase;
    }
    return toRequiredId(left, "phase result").localeCompare(
      toRequiredId(right, "phase result")
    );
  });

export const serializePhaseResults = ({
  phaseResults,
  alternatives,
  registry = RESULT_STRUCTURE_REGISTRY,
}) => {
  return sortPhaseResults(phaseResults).map((result) => {
    if (!Number.isInteger(result.consensusPhase) || result.consensusPhase < 0) {
      throw createInternalError("Finished phase result has invalid phase", {
        field: "consensusPhase",
        details: { stageResultId: toRequiredId(result, "phase result") },
      });
    }

    const standardResult = getStageStandardResult(result);
    let resultStructureMetadata;
    let projectedResult;
    if (result.stage === "criteriaWeighting") {
      projectedResult = serializeCriteriaWeightingResult({
        result,
        standardResult,
        alternatives,
      });
    } else {
      resultStructureMetadata = resolveResultStructureMetadata(
        result.result ?? {},
        { registry }
      );
      projectedResult = cloneSerializable(
        projectNormalizedResultOrThrow({
          ...resultStructureMetadata,
          result: standardResult,
          target: "finishedIssuePhaseResult",
          context: {
            phaseResultId: toRequiredId(result, "phase result"),
            alternatives,
          },
          registry,
        }),
        {}
      );
    }

    return {
      ...projectedResult,
      id: toRequiredId(result, "phase result"),
      stage: result.stage,
      phase: result.consensusPhase,
      ...(resultStructureMetadata ?? {}),
      ...(result.stage === "alternativeEvaluation" && Array.isArray(result.inputSnapshot?.expertIds)
        ? { expertIds: getStageExpertIds(result) }
        : {}),
      expertWeightSnapshot: getStageExpertWeights(result)
        .map((entry) => ({
          expertId: toNullableId(entry.expert),
          weight: entry.weight,
        }))
        .filter((entry) => entry.expertId)
        .sort((left, right) => left.expertId.localeCompare(right.expertId)),
      modelSpecificOutput: cloneSerializable(result.result?.modelExecution, {}),
      rawOutput: cloneSerializable(result.result?.rawOutput, {}),
      computedAt: toIsoOrNull(
        result.result?.modelExecution?.executedAt ?? result.createdAt
      ),
      createdAt: toIsoOrNull(result.createdAt),
      updatedAt: toIsoOrNull(result.updatedAt),
    };
  });
};

export const buildPhaseResultByStagePhase = ({ phaseResults }) =>
  new Map(phaseResults.map((result) => [`${result.stage}:${result.consensusPhase}`, result]));
