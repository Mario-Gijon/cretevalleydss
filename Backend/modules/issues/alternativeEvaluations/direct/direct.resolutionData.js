import { Evaluation } from "../../../../models/Evaluations.js";
import { toIdString } from "../../../../utils/common/ids.js";

/**
 * Construye datos de resolución para estructura directa a partir de evaluaciones.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<Object>} params.alternatives Alternativas ordenadas.
 * @param {Array<Object>} params.criteria Criterios hoja ordenados.
 * @param {Array<Object>} params.participations Participaciones aceptadas con expert populado.
 * @returns {Promise<{matricesUsed: Object, snapshotIdsUsed: string[]}>}
 */
export const buildDirectResolutionData = async ({
  issueId,
  alternatives,
  criteria,
  participations,
}) => {
  const expertIds = participations
    .map((participation) => participation.expert?._id)
    .map(toIdString)
    .filter(Boolean);

  const evaluationDocs = await Evaluation.find({
    issue: issueId,
    expert: { $in: expertIds },
    comparedAlternative: null,
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

        let value = evaluation?.value ?? null;

        if (
          value != null &&
          evaluation?.expressionDomain?.type === "numeric" &&
          typeof value === "string"
        ) {
          const numericValue = Number(value);
          value = Number.isFinite(numericValue) ? numericValue : value;
        }

        if (
          value != null &&
          evaluation?.expressionDomain?.type === "linguistic"
        ) {
          const labelDefinition =
            evaluation.expressionDomain.linguisticLabels?.find(
              (label) => label.label === value
            );

          value = labelDefinition ? labelDefinition.values : null;
        }

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
