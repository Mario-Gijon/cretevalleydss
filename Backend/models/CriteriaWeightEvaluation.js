import { Schema, model } from "mongoose";

/**
 * Evaluación de pesos de criterios emitida por un experto para un issue.
 *
 * Soporta tanto el flujo basado en BWM como la introducción manual de pesos.
 * El documento guarda la entrada individual del experto para una fase concreta
 * del proceso.
 *
 * Relaciones:
 * - `issue` -> issue al que pertenece la evaluación de pesos.
 * - `expert` -> usuario experto que emite la evaluación.
 *
 * Campos principales:
 * - `bestCriterion`: criterio marcado como mejor en BWM.
 * - `worstCriterion`: criterio marcado como peor en BWM.
 * - `bestToOthers`: comparaciones del mejor criterio frente al resto.
 * - `othersToWorst`: comparaciones del resto frente al peor criterio.
 * - `manualWeights`: pesos introducidos manualmente.
 * - `consensusPhase`: fase de consenso a la que pertenece la evaluación.
 * - `completed`: indica si el experto ha completado esta fase.
 *
 * Notas de dominio:
 * - Se mantienen campos flexibles `Mixed` porque la estructura exacta
 *   puede variar según la forma de entrada y el número de criterios hoja.
 */
const criteriaWeightEvaluationSchema = new Schema({
  issue: {
    type: Schema.Types.ObjectId,
    ref: "Issue",
    required: true,
  },
  expert: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  bestCriterion: {
    type: String,
    default: "",
  },
  worstCriterion: {
    type: String,
    default: "",
  },
  bestToOthers: {
    type: Schema.Types.Mixed,
    default: {},
  },
  othersToWorst: {
    type: Schema.Types.Mixed,
    default: {},
  },
  manualWeights: {
    type: Schema.Types.Mixed,
    default: {},
  },
  consensusPhase: {
    type: Number,
    default: 1,
  },
  completed: {
    type: Boolean,
    default: false,
  },
});

export const CriteriaWeightEvaluation = model(
  "CriteriaWeightEvaluation",
  criteriaWeightEvaluationSchema
);