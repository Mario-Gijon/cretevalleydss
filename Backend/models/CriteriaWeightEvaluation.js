import { Schema, model } from "mongoose";

const criteriaWeightEvaluationSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  expert: { type: Schema.Types.ObjectId, ref: "User", required: true },
  bestCriterion: { type: String, default: "" },
  worstCriterion: { type: String, default: "" },
  bestToOthers: { type: Schema.Types.Mixed, default: {} },
  othersToWorst: { type: Schema.Types.Mixed, default: {} },
  manualWeights: {
    type: Schema.Types.Mixed,
    default: {},
  },
  consensusPhase: { type: Number, default: 1 },
  completed: { type: Boolean, default: false },
});

export const CriteriaWeightEvaluation = model(
  "CriteriaWeightEvaluation",
  criteriaWeightEvaluationSchema
);