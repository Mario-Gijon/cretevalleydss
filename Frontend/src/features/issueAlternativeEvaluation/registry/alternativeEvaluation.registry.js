import DirectAlternativesEvaluationDialog from "../dialogs/direct/DirectAlternativesEvaluationDialog.jsx";
import PairwiseAlternativesEvaluationDialog from "../dialogs/pairwise/PairwiseAlternativesEvaluationDialog.jsx";
import {
  ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES,
  resolveIssueAlternativeEvaluationStructure,
} from "../utils/evaluationStructure.js";

/**
 * Registro de UIs para evaluación de alternativas.
 *
 * Añadir una nueva estructura de evaluación debería consistir
 * en registrar aquí su diálogo correspondiente.
 */
export const ALTERNATIVE_EVALUATION_UI_REGISTRY = {
  [ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES.DIRECT]: {
    dialog: DirectAlternativesEvaluationDialog,
  },
  [ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES]: {
    dialog: PairwiseAlternativesEvaluationDialog,
  },
};

/**
 * Devuelve el diálogo de evaluación de alternativas que corresponde al issue.
 *
 * @param {Object|null} issue
 * @returns {React.ComponentType|null}
 */
export const resolveAlternativeEvaluationDialog = (issue) => {
  const structure = resolveIssueAlternativeEvaluationStructure(issue);
  return ALTERNATIVE_EVALUATION_UI_REGISTRY[structure]?.dialog || null;
};