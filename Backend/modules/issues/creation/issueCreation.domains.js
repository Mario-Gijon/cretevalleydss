import { ExpressionDomain } from "../../../models/ExpressionDomain.js";
import { toIdString } from "../../../utils/common/ids.js";
import { createBadRequestError } from "../../../utils/common/errors.js";

/**
 * Construye el mapa experto+alternativa+criterio -> dominio fuente
 * y devuelve los ids de dominios utilizados.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string[]} params.uniqueExpertEmails Correos de expertos.
 * @param {Object} params.normalizedAssignmentsByExpert Asignaciones por experto.
 * @param {Map<string, Object>} params.expertByEmail Usuarios por email.
 * @param {Array<Object>} params.createdAlternatives Alternativas creadas.
 * @param {Array<Object>} params.leafCriteria Criterios hoja creados.
 * @param {string[]} params.uniqueAlternativeNames Nombres de alternativas.
 * @returns {Object}
 */
export const buildExpertAssignmentDomainMap = ({
  uniqueExpertEmails,
  normalizedAssignmentsByExpert,
  expertByEmail,
  createdAlternatives,
  leafCriteria,
  uniqueAlternativeNames,
}) => {
  const alternativeByName = new Map(
    createdAlternatives.map((alternative) => [alternative.name, alternative])
  );

  const sourceDomainByEvaluationKey = new Map();
  const usedDomainIds = new Set();

  for (const email of uniqueExpertEmails) {
    const expertUser = expertByEmail.get(email);
    const expertAssignments = normalizedAssignmentsByExpert[email];

    if (!expertAssignments || typeof expertAssignments !== "object") {
      throw createBadRequestError(
        `Missing domain assignments for expert '${email}'`,
        {
          field: "domainAssignments",
        }
      );
    }

    const alternativesBlock = expertAssignments.alternatives || {};
    const expertId = toIdString(expertUser?._id);

    for (const alternativeName of uniqueAlternativeNames) {
      const alternativeDoc = alternativeByName.get(alternativeName);
      const criteriaBlock = alternativesBlock[alternativeName]?.criteria || {};

      if (!alternativeDoc) {
        throw createBadRequestError(
          `Alternative '${alternativeName}' not found while building assignments`,
          {
            field: "domainAssignments",
          }
        );
      }

      const alternativeId = toIdString(alternativeDoc._id);

      for (const leafCriterion of leafCriteria) {
        const domainId = toIdString(criteriaBlock[leafCriterion.name]);

        if (!domainId) {
          throw createBadRequestError(
            `Missing domain assignment for criterion '${leafCriterion.name}' (expert ${email}, alternative ${alternativeName})`,
            {
              field: "domainAssignments",
            }
          );
        }

        const criterionId = toIdString(leafCriterion._id);
        const evaluationKey = `${expertId}_${alternativeId}_${criterionId}`;

        sourceDomainByEvaluationKey.set(evaluationKey, domainId);
        usedDomainIds.add(domainId);
      }
    }
  }

  return {
    usedDomainIds: Array.from(usedDomainIds),
    sourceDomainByEvaluationKey,
  };
};

/**
 * Carga y valida los dominios de expresión usados en el issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string[]} params.domainIdList Ids de dominios requeridos.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.session Sesión de mongoose.
 * @returns {Promise<Array<Object>>}
 */
export const loadAccessibleExpressionDomains = async ({
  domainIdList,
  userId,
  session,
}) => {
  const domainDocs = await ExpressionDomain.find({
    _id: { $in: domainIdList },
    $or: [
      { isGlobal: true, user: null },
      { isGlobal: false, user: userId },
    ],
  })
    .select("_id name type numericRange linguisticLabels")
    .session(session);

  const existingDomainIds = new Set(
    domainDocs.map((domain) => toIdString(domain._id)).filter(Boolean)
  );

  const missingDomains = domainIdList.filter(
    (domainId) => !existingDomainIds.has(domainId)
  );

  if (missingDomains.length > 0) {
    throw createBadRequestError(
      `ExpressionDomain not found or not accessible: ${missingDomains.join(", ")}`,
      {
        field: "domainAssignments",
      }
    );
  }

  return domainDocs;
};
