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
 * @property {string} weightingMode Modo de ponderación usado en esta evaluación.
 * @property {*} input Entrada específica del método según weightingMode.
 * @property {number} consensusPhase Fase de consenso asociada.
 * @property {boolean} completed Indica si la evaluación está completada.
 */


/**
 * Evaluación de pesos de criterios emitida por un experto para un issue.
 *
 * El documento guarda la entrada individual del experto para una fase concreta
 * del proceso, usando un campo genérico `input` para almacenar el payload
 * específico de cada familia de ponderación.
 *
 * Relaciones:
 * - `issue` -> issue al que pertenece la evaluación de pesos.
 * - `expert` -> usuario experto que emite la evaluación.
 *
 * Campos principales:
 * - `weightingMode`: modo de ponderación de este documento.
 * - `input`: payload de entrada específico del método.
 * - `consensusPhase`: fase de consenso a la que pertenece la evaluación.
 * - `completed`: indica si el experto ha completado esta fase.
 *
 * Notas de dominio:
 * - Se mantienen campos flexibles `Mixed` porque la estructura exacta
 *   de `input` puede variar según el método de ponderación y el número de
 *   criterios hoja.
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
  weightingMode: {
    type: String,
    required: true,
  },
  input: {
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
