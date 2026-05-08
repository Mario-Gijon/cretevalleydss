import { buildInitialAlternativeEvaluationDocs } from "../alternativeEvaluations/index.js";
import { toIdString } from "../../../utils/common/ids.js";
import { createBadRequestError } from "../../../utils/common/errors.js";

/**
 * Construye los documentos iniciales de Evaluation con snapshots ya resueltos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<Object>} params.expertUsers Expertos participantes.
 * @param {Array<Object>} params.createdAlternatives Alternativas creadas.
 * @param {Array<Object>} params.leafCriteria Criterios hoja creados.
 * @param {string} params.modelEvaluationStructure Estructura de evaluación del modelo.
 * @param {Map<string, string>} params.sourceDomainByEvaluationKey Dominio fuente por triple experto/alternativa/criterio.
 * @param {Map<string, Object>} params.snapshotMap Snapshot por dominio fuente.
 * @returns {Array<Object>}
 */
export const buildIssueEvaluationDocsWithSnapshots = ({
  issueId,
  expertUsers,
  createdAlternatives,
  leafCriteria,
  modelEvaluationStructure,
  sourceDomainByEvaluationKey,
  snapshotMap,
}) => {
  const baseEvaluationDocs = buildInitialAlternativeEvaluationDocs({
    issueId,
    experts: expertUsers,
    leafCriteria,
    alternatives: createdAlternatives,
    evaluationStructure: modelEvaluationStructure,
    consensusPhase: 1,
    includeReciprocal: true,
  });

  return baseEvaluationDocs.map((doc) => {
    const evaluationKey = `${toIdString(doc.expert)}_${toIdString(
      doc.alternative
    )}_${toIdString(doc.criterion)}`;

    const sourceDomainId = sourceDomainByEvaluationKey.get(evaluationKey);
    const issueSnapshotId = snapshotMap.get(toIdString(sourceDomainId));

    if (!issueSnapshotId) {
      throw createBadRequestError(
        `Snapshot not found for domain ${String(sourceDomainId)}`,
        {
          field: "domainAssignments",
        }
      );
    }

    const { completed, ...persistableDoc } = doc;

    return {
      ...persistableDoc,
      expressionDomain: issueSnapshotId,
      value: null,
      timestamp: null,
      history: [],
      consensusPhase: 1,
    };
  });
};
