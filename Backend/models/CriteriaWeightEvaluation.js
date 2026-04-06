/**
 * @module models/CriteriaWeightEvaluation
 */

import { Schema, model } from "mongoose";


/**
 * Documento persistido de evaluación de pesos de criterios.
 *
 * @typedef {Object} CriteriaWeightEvaluationDocument
 * @property {*} _id Identificador del documento.
 * @property {*} issue Issue asociado.
 * @property {*} expert Usuario experto que emite la evaluación.
 * @property {string} bestCriterion Mejor criterio seleccionado en BWM.
 * @property {string} worstCriterion Peor criterio seleccionado en BWM.
 * @property {*} bestToOthers Comparaciones del mejor criterio frente al resto.
 * @property {*} othersToWorst Comparaciones del resto frente al peor criterio.
 * @property {*} manualWeights Pesos manuales persistidos.
 * @property {number} consensusPhase Fase de consenso asociada.
 * @property {boolean} completed Indica si la evaluación está completada.
 */


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

/**
 * Schema Mongoose que define la estructura persistida del documento.
 *
 * @constant
 * @type {Object}
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


/**
 * Modelo Mongoose compilado desde el schema del módulo.
 *
 * @class CriteriaWeightEvaluation
 * @classdesc Modelo Mongoose de evaluaciones de pesos de criterios emitidas por expertos.
 */
export const CriteriaWeightEvaluation = model(
  "CriteriaWeightEvaluation",
  criteriaWeightEvaluationSchema
);