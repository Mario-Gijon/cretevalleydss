import { Schema, model } from "mongoose";

// Registro de niveles de consenso en un problema
const consensusSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true }, // Problema asociado
  phase: { type: Number, required: true, default: 1 }, // Número de la fase de consenso
  level: { type: Schema.Types.Mixed, required: true, default: null }, // Nivel de consenso alcanzado
  timestamp: { type: Date, default: null }, // Fecha del registro
  details: { type: Object, default: {} }, // Datos adicionales del consenso
  collectiveEvaluations: {type: Schema.Types.Mixed, default: {}} // Evaluaciones colectivas por criterio
});

export const Consensus = model("Consensus", consensusSchema);
