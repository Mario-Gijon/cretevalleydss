import { Schema, model } from "mongoose";
import {
  ISSUE_DESCRIPTION_MAX_LENGTH,
  ISSUE_NAME_MAX_LENGTH,
} from "../modules/issues/shared/entityLimits.js";

const issueSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    model: {
      type: Schema.Types.ObjectId,
      ref: "IssueModel",
      required: true,
    },
    apiModelKey: {
      type: String,
      required: true,
      trim: true,
    },
    apiEndpoint: {
      method: {
        type: String,
        trim: true,
      },
      path: {
        type: String,
        required: true,
        trim: true,
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: ISSUE_NAME_MAX_LENGTH,
    },
    isConsensus: {
      type: Boolean,
      default: false,
    },
    supportsConsensus: {
      type: Boolean,
      default: false,
    },
    simulateConsensus: {
      type: Boolean,
      default: false,
    },
    criteriaWeightsStructureKey: {
      type: String,
      trim: true,
      default: null,
    },
    criteriaWeightingModel: {
      type: Schema.Types.ObjectId,
      ref: "IssueModel",
      default: null,
    },
    criteriaWeightingApiModelKey: {
      type: String,
      trim: true,
      default: null,
    },
    criteriaWeightingApiEndpoint: {
      method: {
        type: String,
        trim: true,
        default: null,
      },
      path: {
        type: String,
        trim: true,
        default: null,
      },
    },
    criteriaWeightingParameters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    criteriaWeightingLevel: {
      type: String,
      enum: ["leaf", "parent"],
      default: "leaf",
    },
    criteriaWeightingSourceWeights: {
      type: Schema.Types.Mixed,
      default: null,
    },
    evaluationStructureKey: {
      type: String,
      trim: true,
      required: true,
    },
    consensusMaxPhases: {
      type: Number,
      default: null,
    },
    consensusThreshold: {
      type: Number,
      default: null,
    },
    description: {
      type: String,
      required: true,
      maxlength: ISSUE_DESCRIPTION_MAX_LENGTH,
    },
    active: {
      type: Boolean,
      default: true,
    },
    creationDate: {
      type: String,
      default: null,
    },
    closureDate: {
      type: String,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    modelParameters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    currentStage: {
      type: String,
      enum: [
        "criteriaWeighting",
        "weightsFinished",
        "alternativeEvaluation",
        "finished",
      ],
      default: "criteriaWeighting",
    },
    consensusPhase: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

export const Issue = model("Issue", issueSchema);
