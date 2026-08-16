
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

    // Legacy single-phase fields. New scenarios persist their executions in
    // phaseResults; these remain optional so existing documents stay readable.
    source: {
      consensusPhase: {
        type: Number,
        min: 0,
      },
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

    config: {
      parameterOverrides: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },

    requestSnapshot: {
      modelParameters: {
        type: Schema.Types.Mixed,
        default: {},
      },
      evaluations: {
        type: Schema.Types.Mixed,
        default: [],
      },
      context: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },

    result: {
      standardResult: {
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

    execution: {
      attemptId: { type: Schema.Types.ObjectId, ref: "IssueExecutionAttempt", default: null },
      startedAt: {
        type: Date,
      },
      completedAt: {
        type: Date,
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
      default: [],
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

issueScenarioSchema.index({ issue: 1, createdAt: -1 });

export const IssueScenario = model("IssueScenario", issueScenarioSchema);
