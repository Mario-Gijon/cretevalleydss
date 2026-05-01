import { Schema, model } from "mongoose";

const issueResultsAnalysisSchema = new Schema(
  {
    issue: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    scenario: {
      type: Schema.Types.ObjectId,
      ref: "IssueScenario",
      default: null,
      index: true,
    },
    analysisTarget: {
      type: String,
      enum: ["issue", "scenario"],
      default: "issue",
    },
    phase: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["completed", "failed"],
      required: true,
    },
    source: {
      type: String,
      enum: ["manual", "regeneration", "resolution"],
      default: "manual",
    },
    contextVersion: {
      type: String,
      default: null,
    },
    analysisVersion: {
      type: String,
      default: null,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    modelSnapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },
    contextWarnings: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    analysis: {
      type: Schema.Types.Mixed,
      default: null,
    },
    error: {
      code: {
        type: String,
        default: null,
      },
      message: {
        type: String,
        default: null,
      },
      details: {
        type: Schema.Types.Mixed,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

issueResultsAnalysisSchema.index({ issue: 1, scenario: 1, generatedAt: -1 });
issueResultsAnalysisSchema.index({ issue: 1, scenario: 1, status: 1, generatedAt: -1 });
issueResultsAnalysisSchema.index({ issue: 1, scenario: 1, phase: 1, status: 1 });

export const IssueResultsAnalysis = model(
  "IssueResultsAnalysis",
  issueResultsAnalysisSchema
);
