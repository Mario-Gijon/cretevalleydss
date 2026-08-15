import { Schema, model } from "mongoose";

const expertWeightSnapshotSchema = new Schema(
  {
    expert: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    weight: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const stageResultInputSnapshotSchema = new Schema(
  {
    expertWeights: {
      type: [expertWeightSnapshotSchema],
      default: [],
    },
  },
  { _id: false }
);

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
    executionAttempt: { type: Schema.Types.ObjectId, ref: "IssueExecutionAttempt", default: null },
    inputSnapshot: {
      type: stageResultInputSnapshotSchema,
      required: true,
      default: () => ({ expertWeights: [] }),
    },
    result: {
      standardResult: {
        type: Schema.Types.Mixed,
        required: true,
      },
      modelExecution: {
        type: Schema.Types.Mixed,
        required: true,
      },
      rawOutput: {
        type: Schema.Types.Mixed,
        required: true,
      },
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
