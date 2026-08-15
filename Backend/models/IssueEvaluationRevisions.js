import { Schema, model } from "mongoose";

const issueEvaluationRevisionSchema = new Schema(
  {
    issue: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    evaluation: {
      type: Schema.Types.ObjectId,
      ref: "IssueEvaluation",
      required: true,
      index: true,
    },
    expert: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    action: {
      type: String,
      enum: ["draftSaved", "submitted"],
      required: true,
    },
    structureKey: {
      type: String,
      required: true,
      trim: true,
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    normalizedPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    decisionContext: {
      type: Schema.Types.Mixed,
      required: true,
    },
    previousRevision: {
      type: Schema.Types.ObjectId,
      ref: "IssueEvaluationRevision",
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    schemaVersion: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
    minimize: false,
  }
);

issueEvaluationRevisionSchema.index({
  issue: 1,
  expert: 1,
  stage: 1,
  consensusPhase: 1,
  createdAt: 1,
});

issueEvaluationRevisionSchema.index({
  evaluation: 1,
  createdAt: 1,
});

export const IssueEvaluationRevision = model(
  "IssueEvaluationRevision",
  issueEvaluationRevisionSchema
);
