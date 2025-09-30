import { Schema, model } from "mongoose";

const evaluationSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  expert: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Experto que evalúa
  alternative: { type: Schema.Types.ObjectId, ref: "Alternative", required: true }, // Alternativa evaluada
  comparedAlternative: { type: Schema.Types.ObjectId, ref: "Alternative", default: null }, // Alternativa contra la que se compara (null si es AxC)
  criterion: { type: Schema.Types.ObjectId, ref: "Criterion", required: true }, // Criterio evaluado
  expressionDomain: {
    type: Schema.Types.ObjectId,
    ref: "ExpressionDomain", // 👈 referencia explícita
    required: true,
  },

  value: { type: Schema.Types.Mixed, default: null }, // Para numérico = número | Para lingüístico = nombre de la etiqueta
  timestamp: { type: Date, default: null },
  consensusPhase: { type: Number, default: 1 },
  history: [
    {
      phase: { type: Number, required: true },
      value: { type: Schema.Types.Mixed, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

export const Evaluation = model("Evaluation", evaluationSchema);
