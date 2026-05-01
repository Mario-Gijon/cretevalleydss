/**
 * @module models/IssueModel
 */

import { Schema, model } from "mongoose";
import { LIFECYCLE_KINDS } from "../modules/issues/issue.lifecycleKind.js";


/**
 * Documento persistido de definición de modelo de decisión.
 *
 * @typedef {Object} IssueModelDocument
 * @property {*} _id Identificador del documento.
 * @property {string} name Nombre del modelo.
 * @property {string} [apiModelKey] Clave estable del modelo en ApiModels.
 * @property {string} [modelRole] Rol declarado en el manifest.
 * @property {string} [modelStatus] Estado declarado en el manifest.
 * @property {boolean} [publicInIssueCatalog] Indica si aparece en el catálogo público de issues.
 * @property {boolean} [supportsScenarios] Indica si soporta escenarios.
 * @property {Object} [apiEndpoint] Endpoint publicado por ApiModels.
 * @property {Object} [manifestSync] Metadatos de sincronización con el manifest.
 * @property {boolean} isConsensus Indica si el modelo soporta consenso.
 * @property {boolean} isMultiCriteria Indica si el modelo es multicriterio.
 * @property {string} smallDescription Descripción breve.
 * @property {string} extendDescription Descripción ampliada.
 * @property {string} moreInfoUrl Enlace externo de referencia.
 * @property {Array<Object>} parameters Parámetros configurables.
 * @property {string} evaluationStructure Estructura de evaluación exigida.
 * @property {string | null} [lifecycleKind] Tipo de ciclo de vida de resolución.
 * @property {string | null} [inputKind] Tipo de payload de entrada publicado por ApiModels.
 * @property {string | null} [outputKind] Tipo de salida/resultado publicado por ApiModels.
 * @property {Object} [criterionTypes] Vocabulario de tipos de criterio y aliases publicados por ApiModels.
 * @property {Object} supportedDomains Dominios de expresión soportados.
 */


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

/**
 * Subschema de parámetro configurable de un modelo de decisión.
 *
 * Define un parámetro declarativo del modelo, incluyendo su tipo,
 * valor por defecto y restricciones de validación.
 *
 * Tipos soportados:
 * - `number`
 * - `integer`
 * - `boolean`
 * - `string`
 * - `enum`
 * - `array`
 * - `interval`
 * - `tuple`
 * - `fuzzyNumber`
 * - `fuzzyArray`
 *
 * Restricciones soportadas:
 * - `min`, `max`, `step`
 * - `length`, `itemType`, `tupleLength`
 * - `sum`, `normalize`, `ordered`
 * - `allowed`
 */
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
      enum: [
        "number",
        "integer",
        "boolean",
        "string",
        "enum",
        "array",
        "interval",
        "tuple",
        "fuzzyNumber",
        "fuzzyArray",
      ],
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
      min: {
        type: Number,
        default: null,
      },
      max: {
        type: Number,
        default: null,
      },
      step: {
        type: Number,
        default: null,
      },
      length: {
        type: Schema.Types.Mixed,
        default: null,
      },
      itemType: {
        type: String,
        trim: true,
        default: null,
      },
      tupleLength: {
        type: Number,
        default: null,
      },
      sum: {
        type: Number,
        default: null,
      },
      normalize: {
        type: Boolean,
        default: false,
      },
      ordered: {
        type: String,
        trim: true,
        default: null,
      },
      allowed: {
        type: [Schema.Types.Mixed],
        default: null,
      },
    },
    ui: {
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

/**
 * Modelo de definición de algoritmo o método de decisión.
 *
 * Describe un modelo disponible para crear issues, incluyendo su nombre,
 * descripción funcional, parámetros configurables, estructura de evaluación
 * y tipos de dominios de expresión soportados.
 *
 * Campos principales:
 * - `name`: nombre del modelo.
 * - `apiModelKey`: clave estable del modelo en ApiModels.
 * - `isConsensus`: indica si el modelo está orientado a procesos con consenso.
 * - `isMultiCriteria`: indica si el modelo trabaja con múltiples criterios.
 * - `smallDescription`: descripción breve del modelo.
 * - `extendDescription`: descripción ampliada.
 * - `moreInfoUrl`: enlace informativo externo.
 * - `parameters`: parámetros configurables del modelo.
 * - `evaluationStructure`: estructura de evaluación exigida por el modelo.
 * - `inputKind`: clase de payload de entrada esperada por ApiModels.
 * - `outputKind`: clase de resultado devuelta por ApiModels.
 * - `criterionTypes`: vocabulario canónico y aliases de tipos de criterio.
 * - `supportedDomains`: capacidades del modelo respecto a dominios numéricos
 *   y lingüísticos.
 *
 * Notas de dominio:
 * - Este modelo actúa como catálogo de modelos disponibles.
 * - No almacena ejecuciones ni resultados de issues concretos.
 */

/**
 * Schema Mongoose que define la estructura persistida del documento.
 *
 * @constant
 * @type {Object}
 */
const issueModelSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  apiModelKey: {
    type: String,
    trim: true,
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
  modelRole: {
    type: String,
    enum: ["issueModel", "weightingService", "utilityModel"],
    default: "issueModel",
  },
  modelStatus: {
    type: String,
    enum: [
      "available",
      "experimental",
      "pendingIntegration",
      "deprecated",
      "stale",
      "unavailable",
    ],
    default: "available",
  },
  publicInIssueCatalog: {
    type: Boolean,
    default: true,
  },
  supportsScenarios: {
    type: Boolean,
    default: true,
  },
  apiEndpoint: {
    method: {
      type: String,
      trim: true,
    },
    path: {
      type: String,
      trim: true,
    },
    operationId: {
      type: String,
      trim: true,
    },
  },
  manifestSync: {
    source: {
      type: String,
      trim: true,
    },
    manifestVersion: {
      type: String,
      trim: true,
    },
    apiVersion: {
      type: String,
      trim: true,
    },
    lastSyncedAt: {
      type: Date,
    },
    lastSeenAt: {
      type: Date,
    },
  },
  isConsensus: {
    type: Boolean,
    required: true,
  },
  isMultiCriteria: {
    type: Boolean,
    required: true,
  },
  smallDescription: {
    type: String,
    required: true,
  },
  extendDescription: {
    type: String,
    required: true,
  },
  moreInfoUrl: {
    type: String,
    required: true,
  },
  parameters: {
    type: [parameterSchema],
    default: [],
  },
  evaluationStructure: {
    type: String,
    enum: ["direct", "pairwiseAlternatives"],
    required: true,
  },
  lifecycleKind: {
    type: String,
    trim: true,
    enum: Object.values(LIFECYCLE_KINDS),
  },
  inputKind: {
    type: String,
    trim: true,
    default: null,
  },
  outputKind: {
    type: String,
    trim: true,
    default: null,
  },
  criterionTypes: {
    canonical: {
      type: [String],
      default: [],
    },
    aliases: {
      type: Map,
      of: String,
      default: undefined,
    },
  },
  supportedDomains: {
    numeric: {
      enabled: {
        type: Boolean,
        default: false,
      },
      range: {
        min: {
          type: Number,
          default: null,
        },
        max: {
          type: Number,
          default: null,
        },
      },
    },
    linguistic: {
      enabled: {
        type: Boolean,
        default: false,
      },
      minLabels: {
        type: Number,
        default: null,
      },
      maxLabels: {
        type: Number,
        default: null,
      },
      oddOnly: {
        type: Boolean,
        default: false,
      },
    },
  },
});


/**
 * Modelo Mongoose compilado desde el schema del módulo.
 *
 * @class IssueModel
 * @classdesc Modelo Mongoose que actúa como catálogo de modelos y algoritmos de decisión.
 */
export const IssueModel = model("IssueModel", issueModelSchema);
