/**
 * @module models/Issue
 */

import { Schema, model } from "mongoose";

import { Alternative } from "./Alternatives.js";
import { Consensus } from "./Consensus.js";
import { Criterion } from "./Criteria.js";
import { IssueExpressionDomain } from "./IssueExpressionDomains.js";
import { Participation } from "./Participations.js";
import { IssueEvaluation } from "./IssueEvaluations.js";
import { IssueStageResult } from "./IssueStageResults.js";
import { IssueScenario } from "./IssueScenarios.js";
import { Notification } from "./Notificacions.js";
import { ExitUserIssue } from "./ExitUserIssue.js";


/**
 * Documento persistido del issue o problema de decisión.
 *
 * @typedef {Object} IssueDocument
 * @property {*} _id Identificador del documento.
 * @property {*} admin Usuario administrador creador.
 * @property {*} model Modelo de decisión asociado.
 * @property {string} name Nombre del issue.
 * @property {boolean} isConsensus Indica si usa consenso.
 * @property {number|null} consensusMaxPhases Máximo de fases.
 * @property {number|null} consensusThreshold Umbral de consenso.
 * @property {string} description Descripción funcional.
 * @property {boolean} active Indica si el issue sigue activo.
 * @property {string|null} creationDate Fecha funcional de creación.
 * @property {string|null} closureDate Fecha funcional de cierre.
 * @property {Date|null} finishedAt Fecha real de finalización del issue.
 * @property {*} modelParameters Parámetros efectivos del modelo.
 * @property {string} currentStage Etapa actual del flujo.
 * @property {Array<*>} alternativeOrder Orden persistido de alternativas.
 * @property {Array<*>} leafCriteriaOrder Orden persistido de criterios hoja.
 */


/**
 * Modelo principal de problema de decisión.
 *
 * Representa un issue creado por un administrador y asociado a un modelo
 * de decisión concreto. Almacena la configuración general del proceso,
 * el estado actual del flujo y el orden estable de alternativas y criterios hoja.
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
 * - `active`: indica si el issue sigue activo o ya ha finalizado.
 * - `creationDate` y `closureDate`: fechas funcionales de dominio.
 * - `finishedAt`: fecha real en la que el issue pasó a finalizado.
 *
 * Auditoría:
 * - El schema usa `timestamps`, por lo que también mantiene `createdAt`
 *   y `updatedAt` como fechas técnicas.
 *
 * Comportamiento:
 * - Antes de eliminar un issue mediante `remove`, se eliminan en cascada
 *   documentos asociados del issue (alternativas, criterios, evaluaciones,
 *   resultados de etapa, escenarios, participaciones, consensos, notificaciones
 *   y salidas de visibilidad).
 */

/**
 * Schema Mongoose que define la estructura persistida del documento.
 *
 * @constant
 * @type {Object}
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
    criteriaWeightingAggregationMode: {
      type: String,
      trim: true,
      enum: ["none", "mean", "bwmMean", "cmccSimulation"],
      required: true,
      default: "none",
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

/**
 * Elimina en cascada los documentos dependientes de un issue antes de borrarlo.
 *
 * @this {Object}
 * @param {Function} next Siguiente middleware de mongoose.
 * @returns {Promise<void>}
 */
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


/**
 * Modelo Mongoose compilado desde el schema del módulo.
 *
 * @class Issue
 * @classdesc Modelo Mongoose principal del problema de decisión o issue.
 */
export const Issue = model("Issue", issueSchema);
