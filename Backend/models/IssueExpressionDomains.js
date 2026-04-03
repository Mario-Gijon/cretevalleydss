import { Schema, model } from "mongoose";
import { orderedNumericArrayValidator } from "./validators/orderedNumericArrayValidator.js";

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

export const IssueExpressionDomain = model(
  "IssueExpressionDomain",
  issueExpressionDomainSchema
);