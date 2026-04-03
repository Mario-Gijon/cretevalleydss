import { Schema, model } from "mongoose";

/**
 * Escenario calculado o simulado de un issue.
 *
 * Permite almacenar una ejecución derivada de un issue usando un modelo objetivo,
 * una configuración concreta y los datos normalizados utilizados para el cálculo.
 * También conserva el resultado generado y cualquier error asociado.
 *
 * Relaciones:
 * - `issue` -> issue base sobre el que se ejecuta el escenario.
 * - `createdBy` -> usuario que creó el escenario.
 * - `targetModel` -> modelo de decisión utilizado en la ejecución.
 *
 * Campos principales:
 * - `name`: nombre libre del escenario.
 * - `targetModelName`: nombre del modelo objetivo en el momento de la ejecución.
 * - `domainType`: tipo de dominio usado (`numeric` o `linguistic`).
 * - `evaluationStructure`: estructura de evaluación aplicada.
 * - `status`: estado de ejecución (`running`, `done`, `error`).
 * - `error`: mensaje de error si la ejecución falla.
 *
 * Bloques de datos:
 * - `config`: configuración del modelo y metadatos normalizados usados.
 * - `inputs`: datos de entrada efectivos empleados en la simulación.
 * - `outputs`: resultados devueltos por la ejecución.
 *
 * Notas de dominio:
 * - Se usan varios campos `Mixed` porque el contenido puede variar según
 *   el modelo de decisión y la estructura de evaluación.
 *
 * Auditoría:
 * - El schema usa `timestamps`.
 */
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
    },

    domainType: {
      type: String,
      enum: ["numeric", "linguistic"],
      required: true,
    },
    evaluationStructure: {
      type: String,
      enum: ["direct", "pairwiseAlternatives"],
      required: true,
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
      criterionTypes: {
        type: [String],
        default: [],
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
        type: [{ id: Schema.Types.ObjectId, name: String }],
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
      matricesUsed: {
        type: Schema.Types.Mixed,
        default: {},
      },
      snapshotIdsUsed: {
        type: [Schema.Types.ObjectId],
        default: [],
      },
    },

    outputs: {
      details: {
        type: Schema.Types.Mixed,
        default: {},
      },
      collectiveEvaluations: {
        type: Schema.Types.Mixed,
        default: {},
      },
      rawResults: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Facilita recuperar escenarios recientes de un issue.
 */
issueScenarioSchema.index({ issue: 1, createdAt: -1 });

export const IssueScenario = model("IssueScenario", issueScenarioSchema);