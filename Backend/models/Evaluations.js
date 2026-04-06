/**
 * @module models/Evaluation
 */

import { Schema, model } from "mongoose";


/**
 * Documento persistido de evaluación individual.
 *
 * @typedef {Object} EvaluationDocument
 * @property {*} _id Identificador del documento.
 * @property {*} issue Issue asociado.
 * @property {*} expert Usuario experto que evalúa.
 * @property {*} alternative Alternativa principal evaluada.
 * @property {*} comparedAlternative Alternativa comparada o null.
 * @property {*} criterion Criterio evaluado.
 * @property {*} expressionDomain Snapshot del dominio de expresión usado.
 * @property {*} value Valor actual de la evaluación.
 * @property {Date|null} timestamp Instante de última actualización.
 * @property {number} consensusPhase Fase de consenso asociada.
 * @property {Array<Object>} history Historial de valores por fase.
 */


/**
 * Evaluación individual emitida por un experto para un issue.
 *
 * Representa una valoración asociada a una alternativa y a un criterio
 * concretos. En estructuras pairwise también puede incluir una alternativa
 * comparada.
 *
 * Relaciones:
 * - `issue` -> issue al que pertenece la evaluación.
 * - `expert` -> usuario que evalúa.
 * - `alternative` -> alternativa principal evaluada.
 * - `comparedAlternative` -> alternativa comparada en estructuras pairwise.
 * - `criterion` -> criterio evaluado.
 * - `expressionDomain` -> snapshot del dominio de expresión usado.
 *
 * Campos principales:
 * - `value`: valor actual de la evaluación.
 * - `timestamp`: instante de la última actualización del valor actual.
 * - `consensusPhase`: fase de consenso asociada a la evaluación.
 * - `history`: historial de cambios por fase.
 *
 * Notas de dominio:
 * - En evaluación directa, `comparedAlternative` normalmente permanece en `null`.
 * - En evaluación pairwise, `alternative` y `comparedAlternative` representan
 *   la pareja comparada bajo un criterio concreto.
 * - `history` conserva trazabilidad de los valores emitidos.
 */

/**
 * Schema Mongoose que define la estructura persistida del documento.
 *
 * @constant
 * @type {Object}
 */
const evaluationSchema = new Schema({
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
  alternative: {
    type: Schema.Types.ObjectId,
    ref: "Alternative",
    required: true,
  },
  comparedAlternative: {
    type: Schema.Types.ObjectId,
    ref: "Alternative",
    default: null,
  },
  criterion: {
    type: Schema.Types.ObjectId,
    ref: "Criterion",
    required: true,
  },
  expressionDomain: {
    type: Schema.Types.ObjectId,
    ref: "IssueExpressionDomain",
  },
  value: {
    type: Schema.Types.Mixed,
    default: null,
  },
  timestamp: {
    type: Date,
    default: null,
  },
  consensusPhase: {
    type: Number,
    default: 1,
  },
  history: [
    {
      phase: {
        type: Number,
        required: true,
      },
      value: {
        type: Schema.Types.Mixed,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});


/**
 * Modelo Mongoose compilado desde el schema del módulo.
 *
 * @class Evaluation
 * @classdesc Modelo Mongoose de evaluaciones individuales por alternativa y criterio.
 */
export const Evaluation = model("Evaluation", evaluationSchema);