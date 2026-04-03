import { Schema, model } from "mongoose";

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

export const Evaluation = model("Evaluation", evaluationSchema);