/**
 * @module models/IssueScenario
 */

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

    targetModel: {
      type: Schema.Types.ObjectId,
      ref: "IssueModel",
      required: true,
    },
    targetModelName: {
      type: String,
      required: true,
      trim: true,
    },
    targetApiModelKey: {
      type: String,
      required: true,
      trim: true,
    },
    targetApiEndpoint: {
      method: {
        type: String,
        trim: true,
      },
      path: {
        type: String,
        required: true,
        trim: true,
      },
      operationId: {
        type: String,
        trim: true,
      },
    },
    targetModelFamilyKey: {
      type: String,
      required: true,
      trim: true,
    },
    targetModelVersion: {
      type: String,
      required: true,
      trim: true,
    },
    targetVersionLabel: {
      type: String,
      required: true,
      trim: true,
    },
    targetAlternativeEvaluationStructureKey: {
      type: String,
      required: true,
      trim: true,
    },
    targetCriteriaWeightingStructureKey: {
      type: String,
      default: null,
      trim: true,
    },
    targetSupportsConsensus: {
      type: Boolean,
      default: false,
    },

    alternativeEvaluationStructureKey: {
      type: String,
      required: true,
      trim: true,
    },
    criteriaWeightingStructureKey: {
      type: String,
      default: null,
      trim: true,
    },

    domainType: {
      type: String,
      enum: ["numeric", "linguistic"],
      default: null,
    },

    status: {
      type: String,
      enum: ["running", "done", "error"],
      default: "done",
    },
    error: {
      type: String,
      default: null,
    },

    config: {
      modelParameters: {
        type: Schema.Types.Mixed,
        default: {},
      },
      normalizedModelParameters: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },

    inputs: {
      consensusPhaseUsed: {
        type: Number,
        default: 1,
      },
      expertsOrder: {
        type: [String],
        default: [],
      },
      alternatives: {
        type: [
          {
            id: {
              type: Schema.Types.ObjectId,
              required: true,
            },
            name: {
              type: String,
              required: true,
            },
          },
        ],
        default: [],
      },
      criteria: {
        type: [
          {
            id: {
              type: Schema.Types.ObjectId,
              required: true,
            },
            name: {
              type: String,
              required: true,
            },
            criterionType: {
              type: String,
              required: true,
            },
          },
        ],
        default: [],
      },
      weightsUsed: {
        type: Schema.Types.Mixed,
        default: null,
      },
      evaluationPayloads: {
        type: Schema.Types.Mixed,
        default: [],
      },
      context: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },

    outputs: {
      standardResult: {
        type: Schema.Types.Mixed,
        default: {},
      },
      computedPayload: {
        type: Schema.Types.Mixed,
        default: {},
      },
      collectivePayload: {
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
  },
  {
    timestamps: true,
  }
);

issueScenarioSchema.index({ issue: 1, createdAt: -1 });

export const IssueScenario = model("IssueScenario", issueScenarioSchema);
