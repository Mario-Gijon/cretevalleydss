import { Schema, model } from "mongoose";
import { Alternative } from "./Alternatives.js";
import { Criterion } from "./Criteria.js";
import { Evaluation } from "./Evaluations.js";
import { Participation } from "./Participations.js";
import { Consensus } from "./Consensus.js";

const issueSchema = new Schema({
  admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
  model: { type: Schema.Types.ObjectId, ref: "IssueModel", required: true },
  name: { type: String, required: true },
  isConsensus: { type: Boolean, required: true },
  consensusMaxPhases: { type: Number, default: null },
  consensusThreshold: { type: Number, default: null },
  description: { type: String, required: true },
  active: { type: Boolean, default: true },
  creationDate: { type: String, default: null },
  closureDate: { type: String, default: null },
  modelParameters: { type: Schema.Types.Mixed, default: {} },
  currentStage: {
    type: String,
    enum: [
      "criteriaWeighting",
      "weightsFinished",
      "alternativeEvaluation",
      "finished",
    ],
    default: "criteriaWeighting",
  },
  weightingMode: {
    type: String,
    enum: ["manual", "consensus", "bwm", "consensusBwm", "simulatedConsensusBwm"],
    default: "manual",
  },
  alternativeOrder: [{ type: Schema.Types.ObjectId, ref: "Alternative" }],
  leafCriteriaOrder: [{ type: Schema.Types.ObjectId, ref: "Criterion" }],
});

issueSchema.pre("remove", async function (next) {
  try {
    await Promise.all([
      Alternative.deleteMany({ issue: this._id }),
      Criterion.deleteMany({ issue: this._id }),
      Evaluation.deleteMany({ issue: this._id }),
      Participation.deleteMany({ issue: this._id }),
      Consensus.deleteMany({ issue: this._id }),
    ]);

    next();
  } catch (error) {
    next(error);
  }
});

export const Issue = model("Issue", issueSchema);