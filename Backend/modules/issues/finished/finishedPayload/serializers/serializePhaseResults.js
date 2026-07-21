import { createInternalError } from "../../../../../utils/common/errors.js";
import {
  cloneSerializable,
  toIsoOrNull,
  toNullableId,
  toRequiredId,
} from "./serializers.shared.js";
import {
  getStageExpertWeights,
  getStageStandardResult,
} from "../../../stageResults/stageResultContract.js";

const STAGE_ORDER = {
  criteriaWeighting: 0,
  alternativeEvaluation: 1,
};

const serializeRanking = ({ rankedAlternatives, alternativesById, alternativeIdsByName }) => {
  if (!Array.isArray(rankedAlternatives)) return [];

  return rankedAlternatives.map((entry) => {
    const providedId = toNullableId(entry?.alternativeId);
    const name = typeof entry?.name === "string" ? entry.name : null;
    const resolvedId =
      providedId && alternativesById.has(providedId)
        ? providedId
        : name && alternativeIdsByName.get(name)?.length === 1
          ? alternativeIdsByName.get(name)[0]
          : null;

    return {
      alternativeId: resolvedId,
      name,
      score: entry?.score ?? null,
      rank: entry?.rank ?? null,
    };
  });
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

export const serializePhaseResults = ({ phaseResults, alternatives }) => {
  const alternativesById = new Map(alternatives.map((alternative) => [alternative.id, alternative]));
  const alternativeIdsByName = alternatives.reduce((map, alternative) => {
    if (!map.has(alternative.name)) map.set(alternative.name, []);
    map.get(alternative.name).push(alternative.id);
    return map;
  }, new Map());

  return sortPhaseResults(phaseResults).map((result) => {
    if (!Number.isInteger(result.consensusPhase) || result.consensusPhase < 0) {
      throw createInternalError("Finished phase result has invalid phase", {
        field: "consensusPhase",
        details: { stageResultId: toRequiredId(result, "phase result") },
      });
    }

    const standardResult = getStageStandardResult(result);
    const rankedAlternatives = serializeRanking({
      rankedAlternatives: standardResult.rankedAlternatives,
      alternativesById,
      alternativeIdsByName,
    });

    return {
      id: toRequiredId(result, "phase result"),
      stage: result.stage,
      phase: result.consensusPhase,
      consensusMeasure:
        typeof standardResult.consensusMeasure === "number" && Number.isFinite(standardResult.consensusMeasure)
          ? standardResult.consensusMeasure
          : null,
      rankedAlternatives,
      collectiveEvaluationId: toRequiredId(result, "phase result"),
      plotsGraphic: cloneSerializable(standardResult.plotsGraphic, {}),
      expertWeightSnapshot: getStageExpertWeights(result)
        .map((entry) => ({
          expertId: toNullableId(entry.expert),
          weight: entry.weight,
        }))
        .filter((entry) => entry.expertId)
        .sort((left, right) => left.expertId.localeCompare(right.expertId)),
      standardizedOutput: {
        rankedAlternatives,
        consensusMeasure:
          typeof standardResult.consensusMeasure === "number" && Number.isFinite(standardResult.consensusMeasure)
            ? standardResult.consensusMeasure
            : null,
        collectiveEvaluations: cloneSerializable(standardResult.collectiveEvaluations, {}),
        ...(result.stage === "criteriaWeighting"
          ? { weightsByCriterion: cloneSerializable(standardResult.weightsByCriterion, null) }
          : { plotsGraphic: cloneSerializable(standardResult.plotsGraphic, {}) }),
      },
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
