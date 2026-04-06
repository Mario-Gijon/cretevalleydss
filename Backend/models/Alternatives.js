/**
 * @module models/Alternative
 */

import { Schema, model } from "mongoose";


/**
 * Documento persistido de una alternativa.
 *
 * @typedef {Object} AlternativeDocument
 * @property {*} _id Identificador del documento.
 * @property {*} issue Issue al que pertenece la alternativa.
 * @property {string} name Nombre visible de la alternativa.
 */


/**
 * Alternativa perteneciente a un issue.
 *
 * Representa una de las opciones que serán evaluadas dentro de un problema
 * de decisión.
 *
 * Relaciones:
 * - `issue` -> issue al que pertenece la alternativa.
 *
 * Campos principales:
 * - `name`: nombre visible de la alternativa.
 *
 * Notas de dominio:
 * - El orden estable de visualización o procesamiento no se guarda aquí,
 *   sino en `Issue.alternativeOrder`.
 */

/**
 * Schema Mongoose que define la estructura persistida del documento.
 *
 * @constant
 * @type {Object}
 */
const alternativeSchema = new Schema({
  issue: {
    type: Schema.Types.ObjectId,
    ref: "Issue",
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
});


/**
 * Modelo Mongoose compilado desde el schema del módulo.
 *
 * @class Alternative
 * @classdesc Modelo Mongoose de alternativas asociadas a un issue de decisión.
 */
export const Alternative = model("Alternative", alternativeSchema);