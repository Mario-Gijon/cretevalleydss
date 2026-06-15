
import { Schema, model } from "mongoose";

function isAllowedValue(value, allowed) {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return true;
  }

  return allowed.includes(value);
}

function isValidLengthTwoArrayDefault(value, restrictions = {}) {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }

  if (value[0] >= value[1]) {
    return false;
  }

  if (
    restrictions.min !== null &&
    (value[0] < restrictions.min || value[1] < restrictions.min)
  ) {
    return false;
  }

  if (
    restrictions.max !== null &&
    (value[0] > restrictions.max || value[1] > restrictions.max)
  ) {
    return false;
  }

  return true;
}

function validateParameterDefault(value) {
  const restrictions = this.restrictions || {};

  if (this.type === "array" && restrictions.length === 2) {
    if (!isValidLengthTwoArrayDefault(value, restrictions)) {
      return false;
    }
  }

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
    type: {
      type: String,
      required: true,
    },
    valueType: {
      type: String,
      trim: true,
      default: null,
    },
    scope: {
      type: String,
      trim: true,
      default: null,
    },
    parameterStructureKey: {
      type: String,
      trim: true,
      default: null,
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
  isIssueModel: {
    type: Boolean,
    required: true,
    default: false,
  },
  isCriteriaWeightingModel: {
    type: Boolean,
    required: true,
    default: false,
  },
  visibleInIssueCreation: {
    type: Boolean,
    default: function resolveDefaultVisibility() {
      return this.isIssueModel === true;
    },
  },
  visibleInCriteriaWeighting: {
    type: Boolean,
    default: function resolveDefaultCriteriaWeightingVisibility() {
      return this.isCriteriaWeightingModel === true;
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
  moreInfoUrl: {
    type: String,
    trim: true,
    default: null,
  },
  parameters: {
    type: [parameterSchema],
    default: [],
  },
  alternativeEvaluationStructureKey: {
    type: String,
    trim: true,
    required: function resolveAlternativeStructureRequirement() {
      return this.isIssueModel === true;
    },
    default: null,
  },
  criteriaWeightingStructureKey: {
    type: String,
    trim: true,
    default: null,
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
  usesFuzzyCriteriaWeights: {
    type: Boolean,
    default: false,
  },
  usesCriterionTypes: {
    type: Boolean,
    default: false,
  },
  supportedDomains: {
    numeric: {
      continuous: {
        type: Boolean,
        default: false,
      },
      discrete: {
        type: Boolean,
        default: false,
      },
    },
    linguistic: {
      type: [String],
      default: [],
    },
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
