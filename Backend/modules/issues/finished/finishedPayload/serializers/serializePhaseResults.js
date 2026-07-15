import { createInternalError } from "../../../../../utils/common/errors.js";
import {
  cloneSerializable,
  toIsoOrNull,
  toNullableId,
  toRequiredId,
} from "./serializers.shared.js";

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

    return {
      id: toRequiredId(result, "phase result"),
      stage: result.stage,
      phase: result.consensusPhase,
      consensusMeasure:
        typeof result.consensusMeasure === "number" && Number.isFinite(result.consensusMeasure)
          ? result.consensusMeasure
          : null,
      rankedAlternatives: serializeRanking({
        rankedAlternatives: result.rankedAlternatives,
        alternativesById,
        alternativeIdsByName,
      }),
      collectiveEvaluationId: toRequiredId(result, "phase result"),
      plotsGraphic: cloneSerializable(result.plotsGraphic, {}),
      expertWeightSnapshot: (Array.isArray(result.expertWeights) ? result.expertWeights : [])
        .map((entry) => ({
          expertId: toNullableId(entry.expert),
          weight: entry.weight,
        }))
        .filter((entry) => entry.expertId)
        .sort((left, right) => left.expertId.localeCompare(right.expertId)),
      standardizedOutput: {
        rankedAlternatives: serializeRanking({
          rankedAlternatives: result.rankedAlternatives,
          alternativesById,
          alternativeIdsByName,
        }),
        consensusMeasure:
          typeof result.consensusMeasure === "number" && Number.isFinite(result.consensusMeasure)
            ? result.consensusMeasure
            : null,
        plotsGraphic: cloneSerializable(result.plotsGraphic, {}),
      },
      modelSpecificOutput: cloneSerializable(result.modelExecution, {}),
      rawOutput: cloneSerializable(result.rawOutput, {}),
      createdAt: toIsoOrNull(result.createdAt),
      updatedAt: toIsoOrNull(result.updatedAt),
    };
  });
};

export const buildPhaseResultByStagePhase = ({ phaseResults }) =>
  new Map(phaseResults.map((result) => [`${result.stage}:${result.consensusPhase}`, result]));
