import { Schema, model } from "mongoose";

/**
 * Relación de participación de un experto en un issue.
 *
 * Registra el estado de invitación del experto, su progreso dentro del issue
 * y el contexto en el que entró al proceso.
 *
 * Relaciones:
 * - `issue` -> issue en el que participa.
 * - `expert` -> usuario experto invitado o participante.
 *
 * Campos principales:
 * - `invitationStatus`: estado de la invitación (`pending`, `accepted`, `declined`).
 * - `evaluationCompleted`: indica si completó sus evaluaciones.
 * - `weightsCompleted`: indica si completó la fase de pesos.
 * - `entryPhase`: fase de consenso en la que entró.
 * - `entryStage`: etapa del flujo en la que se incorporó.
 * - `joinedAt`: fecha de incorporación efectiva.
 *
 * Restricciones:
 * - La combinación `issue + expert` es única.
 *
 * Auditoría:
 * - El schema usa `timestamps`.
 */
const participationSchema = new Schema(
  {
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

    invitationStatus: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      required: true,
    },

    evaluationCompleted: {
      type: Boolean,
      default: false,
    },
    weightsCompleted: {
      type: Boolean,
      default: false,
    },

    entryPhase: {
      type: Number,
      default: null,
    },
    entryStage: {
      type: String,
      enum: ["criteriaWeighting", "alternativeEvaluation", null],
      default: null,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Evita duplicar la participación del mismo experto en un mismo issue.
 */
participationSchema.index({ issue: 1, expert: 1 }, { unique: true });

export const Participation = model("Participation", participationSchema);