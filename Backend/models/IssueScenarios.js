
import { Schema, model } from "mongoose";

const issueScenarioSchema = new Schema(
  {
    issue: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },

    targetModel: {
      type: Schema.Types.ObjectId,
      ref: "IssueModel",
      required: true,
    },

    config: {
      parameterOverrides: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },

    phaseResults: {
      type: [
        {
          phase: { type: Number, required: true, min: 0 },
          source: {
            stageResult: {
              type: Schema.Types.ObjectId,
              ref: "IssueStageResult",
              default: null,
            },
            domainType: {
              type: String,
              enum: ["numeric", "linguistic"],
              default: null,
            },
          },
          requestSnapshot: {
            type: Schema.Types.Mixed,
            required: true,
          },
          result: {
            standardResult: { type: Schema.Types.Mixed, required: true },
            modelExecution: { type: Schema.Types.Mixed, required: true },
            rawOutput: { type: Schema.Types.Mixed, required: true },
          },
          execution: {
            attemptId: {
              type: Schema.Types.ObjectId,
              ref: "IssueExecutionAttempt",
              required: true,
            },
            startedAt: { type: Date, required: true },
            completedAt: { type: Date, required: true },
          },
        },
      ],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "phaseResults must contain at least one phase result",
      },
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

issueScenarioSchema.index({ issue: 1, createdAt: -1 });

export const IssueScenario = model("IssueScenario", issueScenarioSchema);
