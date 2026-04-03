import { Schema, model } from "mongoose";

/**
 * Registro de salida o visibilidad de un usuario respecto a un issue.
 *
 * Permite conservar el estado de ocultación del issue para un usuario
 * y el historial de entrada/salida asociado a distintas fases del proceso.
 *
 * Relaciones:
 * - `issue` -> issue afectado.
 * - `user` -> usuario al que pertenece el registro.
 *
 * Campos principales:
 * - `hidden`: indica si el issue está oculto para el usuario.
 * - `timestamp`: instante principal del último cambio relevante.
 * - `phase`: fase de consenso asociada al evento actual.
 * - `stage`: etapa del flujo asociada al evento actual.
 * - `reason`: motivo textual del cambio actual.
 *
 * Historial:
 * - `history` almacena eventos de entrada y salida con su contexto:
 *   fase, etapa, instante, acción y motivo.
 *
 * Restricciones:
 * - La combinación `user + issue` es única.
 *
 * Auditoría:
 * - El schema usa `timestamps`.
 */
const exitUserIssueSchema = new Schema(
  {
    issue: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    hidden: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    phase: {
      type: Number,
      default: null,
    },
    stage: {
      type: String,
      enum: ["criteriaWeighting", "alternativeEvaluation", null],
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },

    history: {
      type: [
        {
          timestamp: {
            type: Date,
            default: Date.now,
            required: true,
          },
          phase: {
            type: Number,
            default: null,
          },
          stage: {
            type: String,
            enum: ["criteriaWeighting", "alternativeEvaluation", null],
            default: null,
          },
          action: {
            type: String,
            enum: ["entered", "exited"],
            required: true,
          },
          reason: {
            type: String,
            default: null,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Evita duplicar el registro de salida/visibilidad del mismo usuario
 * para un mismo issue.
 */
exitUserIssueSchema.index({ user: 1, issue: 1 }, { unique: true });

export const ExitUserIssue = model("ExitUserIssue", exitUserIssueSchema);