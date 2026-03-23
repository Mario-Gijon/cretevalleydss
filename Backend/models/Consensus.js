import { Schema, model } from "mongoose";

const consensusSchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  phase: { type: Number, required: true, default: 1 },
  level: { type: Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: null },
  details: { type: Object, default: {} },
  collectiveEvaluations: { type: Schema.Types.Mixed, default: {} },
});

export const Consensus = model("Consensus", consensusSchema);