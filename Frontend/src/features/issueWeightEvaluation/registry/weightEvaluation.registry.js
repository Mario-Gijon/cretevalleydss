import ManualWeightsEvaluationDialog from "../dialogs/manual/ManualWeightsEvaluationDialog.jsx";
import BwmWeightsEvaluationDialog from "../dialogs/bwm/BwmWeightsEvaluationDialog.jsx";

/**
 * Registro de UIs para evaluación de pesos según weightingMode.
 *
 * La idea es que añadir una nueva forma de obtener pesos
 * sea cuestión de registrar un nuevo diálogo aquí.
 */
export const WEIGHT_EVALUATION_UI_REGISTRY = {
  manual: {
    dialog: ManualWeightsEvaluationDialog,
  },
  consensus: {
    dialog: ManualWeightsEvaluationDialog,
  },
  bwm: {
    dialog: BwmWeightsEvaluationDialog,
  },
  consensusBwm: {
    dialog: BwmWeightsEvaluationDialog,
  },
  simulatedConsensusBwm: {
    dialog: BwmWeightsEvaluationDialog,
  },
};

/**
 * Resuelve el diálogo de evaluación de pesos a partir del issue.
 *
 * @param {Object|null} issue
 * @returns {React.ComponentType|null}
 */
export const resolveWeightEvaluationDialog = (issue) => {
  const weightingMode = issue?.weightingMode;
  return WEIGHT_EVALUATION_UI_REGISTRY[weightingMode]?.dialog || null;
};