
import { Schema, model } from "mongoose";

function isAllowedValue(value, allowed) {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return true;
  }

  return allowed.includes(value);
}

function validateParameterDefault(value) {
  const restrictions = this.restrictions || {};

  if (!isAllowedValue(value, restrictions.allowed)) {
    return false;
  }

  return true;
}

const parameterSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    valueType: {
      type: String,
      trim: true,
      default: null,
    },
    parameterStructureKey: {
      type: String,
      trim: true,
      required: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    default: {
      type: Schema.Types.Mixed,
    },
    restrictions: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    _id: false,
  }
);

parameterSchema.path("default").validate(
  validateParameterDefault,
  "Valor inválido para el parámetro según sus restricciones"
);

const issueModelSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  apiModelKey: {
    type: String,
    trim: true,
    required: true,
    index: true,
  },
  modelKind: {
    type: String,
    required: true,
    enum: ["issue", "criteriaWeighting"],
    trim: true,
  },
  supportsCreatorCriteriaWeighting: {
    type: Boolean,
    required: true,
    default: false,
  },
  supportsExpertCriteriaWeighting: {
    type: Boolean,
    required: true,
    default: false,
  },
  requiresHomogeneousExpressionDomains: {
    type: Boolean,
    required: true,
    default: false,
  },
  visibleInIssueCreation: {
    type: Boolean,
    default: function resolveDefaultVisibility() {
      return this.modelKind === "issue";
    },
  },
  visibleInCriteriaWeighting: {
    type: Boolean,
    default: function resolveDefaultCriteriaWeightingVisibility() {
      return this.modelKind === "criteriaWeighting";
    },
  },
  apiEndpoint: {
    method: {
      type: String,
      trim: true,
      default: null,
    },
    path: {
      type: String,
      trim: true,
      required: true,
    },
  },
  manifestSync: {
    source: {
      type: String,
      trim: true,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    isStale: {
      type: Boolean,
      default: false,
    },
  },
  isMultiCriteria: {
    type: Boolean,
    required: true,
  },
  smallDescription: {
    type: String,
    trim: true,
    default: null,
  },
  extendDescription: {
    type: String,
    trim: true,
    default: null,
  },
  modelSection: {
    type: Schema.Types.Mixed,
    default: {},
  },
  moreInfoUrl: {
    type: String,
    trim: true,
    default: null,
  },
  implementationStatus: {
    type: String,
    enum: ["ready", "scaffold"],
    default: "ready",
  },
  publicUsable: {
    type: Boolean,
    default: true,
  },
  issueExecutionAuthorized: {
    type: Boolean,
    default: undefined,
  },
  parameters: {
    type: [parameterSchema],
    default: [],
  },
  evaluationStructureKey: {
    type: String,
    trim: true,
    required: true,
  },
  resultStructureKey: {
    type: String,
    validate: {
      validator: (value) =>
        value === undefined || (typeof value === "string" && value.trim().length > 0),
      message: "resultStructureKey must be a non-empty string",
    },
  },
  resultStructureVersion: {
    type: Schema.Types.Mixed,
    validate: {
      validator: (value) => value === undefined || (Number.isInteger(value) && value > 0),
      message: "resultStructureVersion must be a positive integer",
    },
  },
  supportsConsensus: {
    type: Boolean,
    default: false,
  },
  supportsConsensusSimulation: {
    type: Boolean,
    default: false,
  },
  usesCriteriaWeights: {
    type: Boolean,
    default: false,
  },
  usesExpertWeights: {
    type: Boolean,
    default: false,
  },
  usesFuzzyCriteriaWeights: {
    type: Boolean,
    default: false,
  },
  usesCriterionTypes: {
    type: Boolean,
    default: false,
  },
  supportedExpressionDomains: {
    type: [
      new Schema(
        {
          typeKey: {
            type: String,
            required: true,
            trim: true,
          },
          constraints: {
            type: Schema.Types.Mixed,
            default: {},
          },
        },
        { _id: false }
      ),
    ],
    default: [],
  },
  request: {
    type: Schema.Types.Mixed,
    default: null,
  },
  response: {
    type: Schema.Types.Mixed,
    default: null,
  },
});

export const IssueModel = model("IssueModel", issueModelSchema);
