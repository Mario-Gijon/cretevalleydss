/**
 * @module models/Consensus
 */

import { Schema, model } from "mongoose";


/**
 * Documento persistido de una fase de consenso.
 *
 * @typedef {Object} ConsensusDocument
 * @property {*} _id Identificador del documento.
 * @property {*} issue Issue asociado.
 * @property {number} phase Número de fase.
 * @property {*} level Nivel global de consenso.
 * @property {Date|null} timestamp Fecha de cómputo.
 * @property {Object} details Datos agregados del cálculo.
 * @property {*} collectiveEvaluations Evaluaciones colectivas.
 */


/**
 * Registro de consenso agregado para un issue y una fase concreta.
 *
 * Almacena el nivel de consenso alcanzado, el instante de cómputo y
 * los datos agregados resultantes de una fase del proceso.
 *
 * Relaciones:
 * - `issue` -> issue al que pertenece el consenso.
 *
 * Campos principales:
 * - `phase`: número de fase de consenso.
 * - `level`: nivel global de consenso calculado.
 * - `timestamp`: instante en el que se generó el consenso.
 * - `details`: información adicional del cálculo de consenso.
 * - `collectiveEvaluations`: evaluaciones agregadas resultantes.
 *
 * Notas de dominio:
 * - `details` y `collectiveEvaluations` se mantienen flexibles porque
 *   su estructura puede variar según el modelo y el algoritmo aplicado.
 */

/**
 * Schema Mongoose que define la estructura persistida del documento.
 *
 * @constant
 * @type {Object}
 */
const consensusSchema = new Schema({
  issue: {
    type: Schema.Types.ObjectId,
    ref: "Issue",
    required: true,
  },
  phase: {
    type: Number,
    required: true,
    default: 1,
  },
  level: {
    type: Schema.Types.Mixed,
    default: null,
  },
  timestamp: {
    type: Date,
    default: null,
  },
  details: {
    type: Object,
    default: {},
  },
  collectiveEvaluations: {
    type: Schema.Types.Mixed,
    default: {},
  },
});


/**
 * Modelo Mongoose compilado desde el schema del módulo.
 *
 * @class Consensus
 * @classdesc Modelo Mongoose de fases y resultados agregados de consenso.
 */
export const Consensus = model("Consensus", consensusSchema);