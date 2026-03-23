import { Schema, model } from "mongoose";

const evaluationSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  expert: { type: Schema.Types.ObjectId, ref: "User", required: true },
  alternative: { type: Schema.Types.ObjectId, ref: "Alternative", required: true },
  comparedAlternative: {
    type: Schema.Types.ObjectId,
    ref: "Alternative",
    default: null,
  },
  criterion: { type: Schema.Types.ObjectId, ref: "Criterion", required: true },
  expressionDomain: { type: Schema.Types.ObjectId, ref: "IssueExpressionDomain" },
  value: { type: Schema.Types.Mixed, default: null },
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