import { Schema, model } from "mongoose";

// Evaluación de un experto sobre una alternativa
const evaluationSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  expert: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Experto que evalúa
  alternative: { type: Schema.Types.ObjectId, ref: "Alternative", required: true }, // Alternativa evaluada
  comparedAlternative: { type: Schema.Types.ObjectId, ref: "Alternative", default: null }, // Alternativa contra la que se compara (null si es evaluación estándar)
  criterion: { type: Schema.Types.ObjectId, ref: "Criterion", required: true }, // Criterio evaluado
  expressionDomain: { type: String, required: true }, // Tipo de evaluación ("integer", "float", etc.)
  value: { type: Schema.Types.Mixed, default: null }, // Inicialmente null hasta que el experto valore
  timestamp: { type: Date, default: null }, // También null hasta que se haga la evaluación
  consensusPhase: { type: Number, default: 1 }, // Fase de consenso (si aplica)
  history: [
    {
      phase: { type: Number, required: true }, // Número de fase de consenso
      value: { type: Schema.Types.Mixed, required: true }, // Valor anterior
      timestamp: { type: Date, default: Date.now }, // Fecha de modificación
    },
  ],
});

export const Evaluation = model("Evaluation", evaluationSchema);