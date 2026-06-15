import { Schema, model } from "mongoose";

const issueEvaluationSchema = new Schema(
  {
    issue: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    expert: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    completed: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

issueEvaluationSchema.index(
  {
    issue: 1,
    expert: 1,
    stage: 1,
    consensusPhase: 1,
  },
  { unique: true }
);

export const IssueEvaluation = model("IssueEvaluation", issueEvaluationSchema);
