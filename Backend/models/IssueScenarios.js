
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

    source: {
      consensusPhase: {
        type: Number,
        required: true,
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
      startedAt: {
        type: Date,
        required: true,
      },
      completedAt: {
        type: Date,
        required: true,
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
