import { Evaluation } from "../../../../models/Evaluations.js";
import { toIdString } from "../../../../utils/common/ids.js";

/**
 * Construye datos de resolución para estructura pairwiseAlternatives a partir de evaluaciones.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Array<Object>} params.participations Participaciones aceptadas con expert populado.
 * @param {number} params.currentPhase Fase de consenso actual (1-based).
 * @returns {Promise<{matricesUsed: Object, snapshotIdsUsed: string[]}>}
 */
export const buildPairwiseAlternativesResolutionData = async ({
  issueId,
  alternatives,
  criteria,
  participations,
  currentPhase,
}) => {
  const expertIds = participations
    .map((participation) => participation.expert?._id)
    .map(toIdString)
    .filter(Boolean);

  const evaluationDocs = await Evaluation.find({
    issue: issueId,
    expert: { $in: expertIds },
    comparedAlternative: { $ne: null },
    consensusPhase: currentPhase,
  })
    .select("expert alternative comparedAlternative criterion value expressionDomain")
    .populate("expressionDomain", "type")
    .lean();

  const snapshotSet = new Set();

  for (const evaluation of evaluationDocs) {
    if (evaluation.expressionDomain?._id) {
      snapshotSet.add(toIdString(evaluation.expressionDomain._id));
    }
  }

  const alternativeIndexMap = new Map(
    alternatives.map((alternative, index) => [toIdString(alternative._id), index])
  );

  const criterionNameById = new Map(
    criteria.map((criterion) => [toIdString(criterion._id), criterion.name])
  );

  const participationByExpertId = new Map(
    participations
      .map((participation) => [toIdString(participation.expert?._id), participation])
      .filter(([expertId]) => Boolean(expertId))
  );

  const matricesUsed = {};

  for (const participation of participations) {
    matricesUsed[participation.expert.email] = {};

    for (const criterion of criteria) {
      const size = alternatives.length;

      matricesUsed[participation.expert.email][criterion.name] = Array.from(
        { length: size },
        (_, rowIndex) =>
          Array.from({ length: size }, (_, colIndex) =>
            rowIndex === colIndex ? 0.5 : null
          )
      );
    }
  }

  for (const evaluation of evaluationDocs) {
    const participation = participationByExpertId.get(toIdString(evaluation.expert));
    if (!participation) continue;

    const criterionName = criterionNameById.get(toIdString(evaluation.criterion));
    if (!criterionName) continue;

    const rowIndex = alternativeIndexMap.get(toIdString(evaluation.alternative));
    const colIndex = alternativeIndexMap.get(
      toIdString(evaluation.comparedAlternative)
    );

    if (rowIndex == null || colIndex == null) continue;

    let value = evaluation.value ?? null;

    if (value != null && typeof value === "string") {
      const numericValue = Number(value);
      value = Number.isFinite(numericValue) ? numericValue : value;
    }

    matricesUsed[participation.expert.email][criterionName][rowIndex][colIndex] =
      value;
  }

  return {
    matricesUsed,
    snapshotIdsUsed: Array.from(snapshotSet).filter(Boolean),
  };
};
