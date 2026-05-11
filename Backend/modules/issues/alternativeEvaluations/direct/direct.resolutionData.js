import { Evaluation } from "../../../../models/Evaluations.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { normalizeEvaluationValueForInputOrThrow } from "../../expressionDomains/expressionDomain.transforms.js";

/**
 * Construye datos de resolución para estructura directa a partir de evaluaciones.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Array<Object>} params.participations Participaciones aceptadas con expert populado.
 * @param {number} params.currentPhase Fase de consenso actual (1-based).
 * @returns {Promise<{matricesUsed: Object, snapshotIdsUsed: string[]}>}
 */
export const buildDirectResolutionData = async ({
  issueId,
  alternatives,
  criteria,
  participations,
  currentPhase,
  apiInputFormat = "directCrispMatrix",
}) => {
  const expertIds = participations
    .map((participation) => participation.expert?._id)
    .map(toIdString)
    .filter(Boolean);

  const evaluationDocs = await Evaluation.find({
    issue: issueId,
    expert: { $in: expertIds },
    comparedAlternative: null,
    consensusPhase: currentPhase,
  })
    .select("expert alternative criterion value expressionDomain")
    .populate("expressionDomain", "type linguisticLabels numericRange name")
    .lean();

  const evaluationMap = new Map();
  const snapshotSet = new Set();

  for (const evaluation of evaluationDocs) {
    const key = `${toIdString(evaluation.expert)}_${toIdString(
      evaluation.alternative
    )}_${toIdString(evaluation.criterion)}`;

    evaluationMap.set(key, evaluation);

    if (evaluation.expressionDomain?._id) {
      snapshotSet.add(toIdString(evaluation.expressionDomain._id));
    }
  }

  const matricesUsed = {};

  for (const participation of participations) {
    const expertEmail = participation.expert.email;
    const expertId = toIdString(participation.expert._id);

    const matrixForExpert = [];

    for (const alternative of alternatives) {
      const row = [];

      for (const criterion of criteria) {
        const key = `${expertId}_${toIdString(alternative._id)}_${toIdString(
          criterion._id
        )}`;
        const evaluation = evaluationMap.get(key);

        const value =
          evaluation?.value == null
            ? null
            : normalizeEvaluationValueForInputOrThrow({
                value: evaluation.value,
                domainSnapshot: evaluation?.expressionDomain,
                apiInputFormat,
                context: {
                  issueId,
                  expertId,
                  alternativeId: toIdString(alternative._id),
                  criterionId: toIdString(criterion._id),
                },
              });

        row.push(value);
      }

      matrixForExpert.push(row);
    }

    matricesUsed[expertEmail] = matrixForExpert;
  }

  return {
    matricesUsed,
    snapshotIdsUsed: Array.from(snapshotSet).filter(Boolean),
  };
};
