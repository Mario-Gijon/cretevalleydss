/**
 * @module models/Criterion
 */

import { Schema, model } from "mongoose";


/**
 * Documento persistido de un criterio.
 *
 * @typedef {Object} CriterionDocument
 * @property {*} _id Identificador del documento.
 * @property {*} issue Issue al que pertenece.
 * @property {*} parentCriterion Criterio padre o null.
 * @property {string} name Nombre del criterio.
 * @property {string} type Tipo funcional del criterio.
 * @property {boolean} isLeaf Indica si el criterio es hoja.
 */


/**
 * Criterio perteneciente a un issue.
 *
 * Permite representar tanto criterios raíz como criterios anidados,
 * formando una estructura en árbol. Cada criterio puede ser hoja o no,
 * y puede tener asociado un tipo funcional de evaluación.
 *
 * Relaciones:
 * - `issue` -> issue al que pertenece el criterio.
 * - `parentCriterion` -> criterio padre cuando existe jerarquía.
 *
 * Campos principales:
 * - `name`: nombre visible del criterio.
 * - `type`: tipo funcional del criterio.
 * - `isLeaf`: indica si el criterio es hoja y, por tanto, evaluable directamente.
 *
 * Notas de dominio:
 * - La jerarquía se construye mediante `parentCriterion`.
 * - Los criterios hoja suelen usarse como base para pesos y evaluaciones.
 */

/**
 * Schema Mongoose que define la estructura persistida del documento.
 *
 * @constant
 * @type {Object}
 */
const criterionSchema = new Schema({
  issue: {
    type: Schema.Types.ObjectId,
    ref: "Issue",
    required: true,
  },
  parentCriterion: {
    type: Schema.Types.ObjectId,
    ref: "Criterion",
    default: null,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
  },
  isLeaf: {
    type: Boolean,
    required: true,
  },
});


/**
 * Modelo Mongoose compilado desde el schema del módulo.
 *
 * @class Criterion
 * @classdesc Modelo Mongoose de criterios jerárquicos asociados a un issue.
 */
export const Criterion = model("Criterion", criterionSchema);