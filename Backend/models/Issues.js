
import { Schema, model } from "mongoose";

import { Alternative } from "./Alternatives.js";
import { Consensus } from "./Consensus.js";
import { Criterion } from "./Criteria.js";
import { IssueExpressionDomain } from "./IssueExpressionDomains.js";
import { Participation } from "./Participations.js";
import { IssueEvaluation } from "./IssueEvaluations.js";
import { IssueStageResult } from "./IssueStageResults.js";
import { IssueScenario } from "./IssueScenarios.js";
import { Notification } from "./Notifications.js";
import { ExitUserIssue } from "./ExitUserIssue.js";





const issueSchema = new Schema(
  {
    admin: {
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
      operationId: {
        type: String,
        trim: true,
      },
    },
    modelFamilyKey: {
      type: String,
      required: true,
      trim: true,
    },
    modelVersion: {
      type: String,
      required: true,
      trim: true,
    },
    versionLabel: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
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
    criteriaWeightingStructureKey: {
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
      operationId: {
        type: String,
        trim: true,
        default: null,
      },
    },
    criteriaWeightingParameters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    alternativeEvaluationStructureKey: {
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
    alternativeOrder: [
      {
        type: Schema.Types.ObjectId,
        ref: "Alternative",
      },
    ],
    leafCriteriaOrder: [
      {
        type: Schema.Types.ObjectId,
        ref: "Criterion",
      },
    ],
    consensusPhase: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

async function removeIssueDependencies(next) {
  try {
    await Promise.all([
      Alternative.deleteMany({ issue: this._id }),
      Criterion.deleteMany({ issue: this._id }),
      IssueExpressionDomain.deleteMany({ issue: this._id }),
      IssueEvaluation.deleteMany({ issue: this._id }),
      IssueStageResult.deleteMany({ issue: this._id }),
      IssueScenario.deleteMany({ issue: this._id }),
      Participation.deleteMany({ issue: this._id }),
      Consensus.deleteMany({ issue: this._id }),
      Notification.deleteMany({ issue: this._id }),
      ExitUserIssue.deleteMany({ issue: this._id }),
    ]);

    next();
  } catch (error) {
    next(error);
  }
}

issueSchema.pre("remove", removeIssueDependencies);


export const Issue = model("Issue", issueSchema);
