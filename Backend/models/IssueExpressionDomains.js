/**
 * @module models/IssueExpressionDomain
 */

import { Schema, model } from "mongoose";
import { orderedNumericArrayValidator } from "./validators/orderedNumericArrayValidator.js";


/**
 * Documento persistido de snapshot de dominio de expresión por issue.
 *
 * @typedef {Object} IssueExpressionDomainDocument
 * @property {*} _id Identificador del documento.
 * @property {*} issue Issue asociado.
 * @property {*} sourceDomain Dominio origen o null.
 * @property {string} name Nombre congelado del dominio.
 * @property {string} type Tipo de dominio congelado.
 * @property {Object} numericRange Rango numérico congelado.
 * @property {Array<Object>} linguisticLabels Etiquetas lingüísticas congeladas.
 */


/**
 * Snapshot de dominio de expresión asociado a un issue.
 *
 * Congela la definición de un dominio de expresión en el momento en que
 * un issue se crea o se prepara para evaluación. De este modo, el issue
 * no depende de futuras modificaciones del dominio original reutilizable.
 *
 * Relaciones:
 * - `issue` -> issue al que pertenece el snapshot.
 * - `sourceDomain` -> dominio original desde el que se generó el snapshot.
 *
 * Campos principales:
 * - `name`: nombre del dominio copiado al snapshot.
 * - `type`: tipo del dominio (`numeric` o `linguistic`).
 * - `numericRange`: rango numérico congelado para el issue.
 * - `linguisticLabels`: etiquetas lingüísticas congeladas para el issue.
 *
 * Restricciones:
 * - La combinación `issue + sourceDomain` es única para evitar
 *   duplicar snapshots del mismo dominio dentro de un mismo issue.
 *
 * Notas de dominio:
 * - Este modelo se usa como referencia estable desde las evaluaciones
 *   del issue.
 * - Si el dominio origen cambia más adelante, el snapshot del issue
 *   permanece inalterado.
 */

/**
 * Schema Mongoose que define la estructura persistida del documento.
 *
 * @constant
 * @type {Object}
 */
const issueExpressionDomainSchema = new Schema(
  {
    issue: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    sourceDomain: {
      type: Schema.Types.ObjectId,
      ref: "ExpressionDomain",
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["numeric", "linguistic"],
      required: true,
    },

    numericRange: {
      min: {
        type: Number,
        default: null,
      },
      max: {
        type: Number,
        default: null,
      },
    },

    linguisticLabels: [
      {
        label: {
          type: String,
          required: true,
          trim: true,
        },
        values: {
          type: [Number],
          validate: orderedNumericArrayValidator,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

/**
 * Evita duplicar snapshots del mismo dominio origen dentro de un mismo issue.
 */
issueExpressionDomainSchema.index(
  { issue: 1, sourceDomain: 1 },
  { unique: true }
);


/**
 * Modelo Mongoose compilado desde el schema del módulo.
 *
 * @class IssueExpressionDomain
 * @classdesc Modelo Mongoose de snapshots de dominios de expresión congelados por issue.
 */
export const IssueExpressionDomain = model(
  "IssueExpressionDomain",
  issueExpressionDomainSchema
);