/**
 * @module models/IssueModel
 */

import { Schema, model } from "mongoose";

/**
 * Comprueba si un valor pertenece al conjunto permitido.
 *
 * @param {unknown} value Valor a validar.
 * @param {unknown[] | null | undefined} allowed Valores permitidos.
 * @returns {boolean}
 */
function isAllowedValue(value, allowed) {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return true;
  }

  return allowed.includes(value);
}

/**
 * Valida el valor por defecto de un parámetro de tipo array con longitud 2.
 *
 * Reglas aplicadas:
 * - debe ser un array de dos posiciones,
 * - el primer valor debe ser menor que el segundo,
 * - ambos deben respetar `min` y `max` cuando existan.
 *
 * @param {unknown} value Valor a validar.
 * @param {object} restrictions Restricciones del parámetro.
 * @param {number | null} restrictions.min Valor mínimo permitido.
 * @param {number | null} restrictions.max Valor máximo permitido.
 * @returns {boolean}
 */
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

/**
 * Valida el valor por defecto de un parámetro según su definición.
 *
 * @this {Object}
 * @param {unknown} value Valor por defecto a validar.
 * @returns {boolean}
 */
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
    handlerKey: {
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
  modelFamilyKey: {
    type: String,
    trim: true,
    required: true,
  },
  modelVersion: {
    type: String,
    trim: true,
    required: true,
  },
  versionLabel: {
    type: String,
    trim: true,
    required: true,
  },
  isIssueModel: {
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
    operationId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  manifestSync: {
    source: {
      type: String,
      trim: true,
      default: null,
    },
    manifestVersion: {
      type: String,
      trim: true,
      default: null,
    },
    apiVersion: {
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
    required: true,
  },
  supportsConsensus: {
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
  criterionTypes: {
    type: [String],
    default: [],
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
