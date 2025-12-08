import { Schema, model } from "mongoose";

const criteriaWeightEvaluationSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  expert: { type: Schema.Types.ObjectId, ref: "User", required: true },

  // BWM
  bestCriterion: { type: String, default: "" },
  worstCriterion: { type: String, default: "" },
  bestToOthers: { type: Schema.Types.Mixed, default: {} },
  othersToWorst: { type: Schema.Types.Mixed, default: {} },

  // MANUAL consensus weights
  manualWeights: {
    type: Schema.Types.Mixed,  // { "Criterio1": 0.5, "Criterio2": 0.3, ... }
    default: {},
  },

  consensusPhase: { type: Number, default: 1 },
  completed: { type: Boolean, default: false },
});


export const CriteriaWeightEvaluation = model("CriteriaWeightEvaluation",criteriaWeightEvaluationSchema);
