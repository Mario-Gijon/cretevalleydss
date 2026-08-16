import { Schema, model } from "mongoose";

const issueResultsAnalysisSchema = new Schema(
  {
    issue: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    executionKey: {
      type: String,
      required: true,
      trim: true,
    },
    executionType: {
      type: String,
      enum: ["base", "scenario"],
      required: true,
    },
    scenario: {
      type: Schema.Types.ObjectId,
      ref: "IssueScenario",
      default: null,
    },
    genericAnalysis: {
      type: Schema.Types.Mixed,
      required: true,
    },
    generatedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

issueResultsAnalysisSchema.index({ issue: 1, executionKey: 1 }, { unique: true });
issueResultsAnalysisSchema.index({ scenario: 1 });

export const IssueResultsAnalysis = model("IssueResultsAnalysis", issueResultsAnalysisSchema);
