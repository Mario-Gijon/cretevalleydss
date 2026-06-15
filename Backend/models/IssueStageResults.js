import { Schema, model } from "mongoose";

const issueStageResultSchema = new Schema(
  {
    issue: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    stage: {
      type: String,
      enum: ["criteriaWeighting", "alternativeEvaluation"],
      required: true,
      index: true,
    },
    consensusPhase: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      index: true,
    },
    consensusMeasure: {
      type: Number,
      default: null,
    },
    rankedAlternatives: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    collectiveEvaluations: {
      type: Schema.Types.Mixed,
      default: {},
    },
    plotsGraphic: {
      type: Schema.Types.Mixed,
      default: {},
    },
    modelExecution: {
      type: Schema.Types.Mixed,
      default: {},
    },
    rawOutput: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

issueStageResultSchema.index(
  {
    issue: 1,
    stage: 1,
    consensusPhase: 1,
  },
  { unique: true }
);

export const IssueStageResult = model("IssueStageResult", issueStageResultSchema);
