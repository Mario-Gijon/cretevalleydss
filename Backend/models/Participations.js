import { Schema, model } from "mongoose";

// Participación activa de expertos en un problema
const participationSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  expert: { type: Schema.Types.ObjectId, ref: "User", required: true },

  invitationStatus: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    required: true,
  },

  evaluationCompleted: { type: Boolean, default: false }, // Evaluaciones de alternativas completadas
  weightsCompleted: { type: Boolean, default: false },    // 🔹 Evaluación de pesos BWM completada

  entryPhase: { type: Number, default: null },             // Fase de consenso en la que entró
  entryStage: {
    type: String,
    enum: ["criteriaWeighting", "alternativeEvaluation", null],
    default: null,                                         // Etapa en la que entró
  },

  joinedAt: { type: Date, default: Date.now },             // Fecha/hora exacta de entrada
}, {
  timestamps: true, // createdAt, updatedAt automáticos
});

participationSchema.index({ issue: 1, expert: 1 }, { unique: true }); // Evita duplicados

export const Participation = model("Participation", participationSchema);
