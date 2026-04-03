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
 * @this {{
 *   type: string,
 *   restrictions?: {
 *     min?: number | null,
 *     max?: number | null,
 *     step?: number | null,
 *     length?: unknown,
 *     sum?: number | null,
 *     allowed?: unknown[] | null
 *   }
 * }}
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
 * - `array`
 * - `fuzzyArray`
 *
 * Restricciones soportadas:
 * - `min`, `max`, `step`
 * - `length`
 * - `sum`
 * - `allowed`
 */
const parameterSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["number", "array", "fuzzyArray"],
      required: true,
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
      sum: {
        type: Number,
        default: null,
      },
      allowed: {
        type: [Schema.Types.Mixed],
        default: null,
      },
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
 * - `isConsensus`: indica si el modelo está orientado a procesos con consenso.
 * - `isMultiCriteria`: indica si el modelo trabaja con múltiples criterios.
 * - `smallDescription`: descripción breve del modelo.
 * - `extendDescription`: descripción ampliada.
 * - `moreInfoUrl`: enlace informativo externo.
 * - `parameters`: parámetros configurables del modelo.
 * - `evaluationStructure`: estructura de evaluación exigida por el modelo.
 * - `supportedDomains`: capacidades del modelo respecto a dominios numéricos
 *   y lingüísticos.
 *
 * Notas de dominio:
 * - Este modelo actúa como catálogo de modelos disponibles.
 * - No almacena ejecuciones ni resultados de issues concretos.
 */
const issueModelSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
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

export const IssueModel = model("IssueModel", issueModelSchema);