import { Alternative } from "../../../models/Alternatives.js";
import { Criterion } from "../../../models/Criteria.js";
import { normalizeString } from "../../../utils/common/strings.js";
import { createBadRequestError } from "../../../utils/common/errors.js";

/**
 * Crea las alternativas del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string[]} params.uniqueAlternativeNames Nombres de alternativas.
 * @param {Object} params.session Sesión de mongoose.
 * @returns {Promise<Array<Object>>}
 */
export const createIssueAlternatives = async ({
  issueId,
  uniqueAlternativeNames,
  session,
}) => {
  if (!uniqueAlternativeNames.length) {
    return [];
  }

  return Alternative.insertMany(
    uniqueAlternativeNames.map((name) => ({
      issue: issueId,
      name,
    })),
    { session, ordered: true }
  );
};

/**
 * Crea recursivamente la jerarquía de criterios del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<Object>} params.nodes Nodos de criterios.
 * @param {Array<Object>} params.leafCriteria Acumulador de criterios hoja.
 * @param {Object} params.session Sesión de mongoose.
 * @param {string|Object|null} [params.parentCriterionId=null] Id del criterio padre.
 * @returns {Promise<void>}
 */
export const createCriteriaRecursively = async ({
  issueId,
  nodes,
  leafCriteria,
  session,
  parentCriterionId = null,
}) => {
  if (!Array.isArray(nodes)) return;

  for (const node of nodes) {
    const children = Array.isArray(node?.children) ? node.children : [];
    const isLeaf = children.length === 0;
    const criterionName = normalizeString(node?.name);
    const criterionType = normalizeString(node?.type);

    if (!criterionName) {
      throw createBadRequestError("Criterion name is required", {
        field: "criteria",
      });
    }

    const criterion = new Criterion({
      issue: issueId,
      parentCriterion: parentCriterionId,
      name: criterionName,
      type: criterionType,
      isLeaf,
    });

    await criterion.save({ session });

    if (isLeaf) {
      leafCriteria.push(criterion);
      continue;
    }

    await createCriteriaRecursively({
      issueId,
      nodes: children,
      leafCriteria,
      session,
      parentCriterionId: criterion._id,
    });
  }
};
