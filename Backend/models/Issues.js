import { Schema, model } from "mongoose";

import { Alternative } from "./Alternatives.js";
import { Consensus } from "./Consensus.js";
import { Criterion } from "./Criteria.js";
import { Evaluation } from "./Evaluations.js";
import { Participation } from "./Participations.js";

/**
 * Modelo principal de problema de decisión.
 *
 * Representa un issue creado por un administrador y asociado a un modelo
 * de decisión concreto. Almacena la configuración general del proceso,
 * el estado actual del flujo, el modo de pesos, la estructura de evaluación
 * y el orden estable de alternativas y criterios hoja.
 *
 * Relaciones:
 * - `admin` -> usuario creador del issue.
 * - `model` -> modelo de decisión aplicado al issue.
 * - `alternativeOrder` -> orden persistido de alternativas.
 * - `leafCriteriaOrder` -> orden persistido de criterios hoja.
 *
 * Campos de negocio relevantes:
 * - `isConsensus`: indica si el issue usa consenso.
 * - `consensusMaxPhases`: número máximo de fases de consenso.
 * - `consensusThreshold`: umbral de consenso objetivo.
 * - `modelParameters`: parámetros efectivos del modelo.
 * - `currentStage`: fase actual del flujo del issue.
 * - `weightingMode`: estrategia de obtención de pesos.
 * - `evaluationStructure`: estructura de evaluación exigida por el modelo.
 * - `active`: indica si el issue sigue activo o ya ha finalizado.
 * - `creationDate` y `closureDate`: fechas funcionales de dominio.
 *
 * Auditoría:
 * - El schema usa `timestamps`, por lo que también mantiene `createdAt`
 *   y `updatedAt` como fechas técnicas.
 *
 * Comportamiento:
 * - Antes de eliminar un issue mediante `remove`, se eliminan en cascada
 *   alternativas, criterios, evaluaciones, participaciones y consensos asociados.
 */
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isConsensus: {
      type: Boolean,
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
    weightingMode: {
      type: String,
      enum: [
        "manual",
        "consensus",
        "bwm",
        "consensusBwm",
        "simulatedConsensusBwm",
      ],
      default: "manual",
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
    evaluationStructure: {
      type: String,
      enum: ["direct", "pairwiseAlternatives"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Elimina en cascada los documentos dependientes de un issue antes de borrarlo.
 *
 * @this {import("mongoose").Document & { _id: import("mongoose").Types.ObjectId }}
 * @param {Function} next Siguiente middleware de mongoose.
 * @returns {Promise<void>}
 */
async function removeIssueDependencies(next) {
  try {
    await Promise.all([
      Alternative.deleteMany({ issue: this._id }),
      Criterion.deleteMany({ issue: this._id }),
      Evaluation.deleteMany({ issue: this._id }),
      Participation.deleteMany({ issue: this._id }),
      Consensus.deleteMany({ issue: this._id }),
    ]);

    next();
  } catch (error) {
    next(error);
  }
}

issueSchema.pre("remove", removeIssueDependencies);

export const Issue = model("Issue", issueSchema);