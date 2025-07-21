import { Schema, model } from "mongoose";

// Participación de expertos en un problema
const participationSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  expert: { type: Schema.Types.ObjectId, ref: "User", required: true },
  invitationStatus: {
    type: String,
    enum: ["pending", "accepted", "declined"], // Uso de enum para los posibles estados
    required: true
  },
  evaluationCompleted: { type: Boolean, required: true },
  entryPhase: { type: Number, default: 1 } // ← NUEVO CAMPO AÑADIDO
});

export const Participation = model("Participation", participationSchema);
