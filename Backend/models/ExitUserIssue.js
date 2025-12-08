import { Schema, model } from "mongoose";

const exitUserIssueSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },

  hidden: { type: Boolean, default: false },               // Si el issue está oculto para el usuario
  timestamp: { type: Date, default: Date.now, required: true }, // Último evento (entrada o salida)
  phase: { type: Number, default: null },                  // Fase de consenso actual
  stage: {
    type: String,
    enum: ["criteriaWeighting", "alternativeEvaluation", null],
    default: null,                                         // Etapa actual
  },
  reason: { type: String, default: null },                 // Motivo del último evento (opcional)

  // Historial de entradas y salidas
  history: {
    type: [
      {
        timestamp: { type: Date, default: Date.now, required: true },
        phase: { type: Number, default: null },
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
        reason: { type: String, default: null },
      },
    ],
    default: [],
  },
}, {
  timestamps: true, // createdAt, updatedAt automáticos
});

// Un registro por usuario e issue (se actualiza el history si entra/sale de nuevo)
exitUserIssueSchema.index({ user: 1, issue: 1 }, { unique: true });

export const ExitUserIssue = model("ExitUserIssue", exitUserIssueSchema);
