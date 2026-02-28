import mongoose from "mongoose";
const { Schema, model } = mongoose;

const issueScenarioSchema = new Schema(
  {
    issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Nombre opcional para UI
    name: { type: String, default: "" },

    // Modelo objetivo del scenario
    targetModel: { type: Schema.Types.ObjectId, ref: "IssueModel", required: true },
    targetModelName: { type: String, required: true },

    // Perfil de compatibilidad congelado
    domainType: { type: String, enum: ["numeric", "linguistic"], required: true },
    isPairwise: { type: Boolean, required: true },

    // Estado del run (por si luego quieres async/colas)
    status: { type: String, enum: ["running", "done", "error"], default: "done" },
    error: { type: String, default: null },

    // Config usada (params finales)
    config: {
      modelParameters: { type: Schema.Types.Mixed, default: {} },       // params usados (ya mergeados)
      normalizedModelParameters: { type: Schema.Types.Mixed, default: {} }, // opcional debug
      criterionTypes: { type: [String], default: [] }, // ["max","min"] si aplica
    },

    // Inputs congelados (lo que pedías guardar todo)
    inputs: {
      consensusPhaseUsed: { type: Number, default: 1 },

      expertsOrder: { type: [String], default: [] }, // emails en orden estable
      alternatives: {
        type: [{ id: Schema.Types.ObjectId, name: String }],
        default: [],
      },
      criteria: {
        type: [
          {
            id: { type: Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            criterionType: { type: String, required: true },
          }
        ],
        default: [],
      },

      // Pesos finales usados (pueden ser crisp o fuzzy)
      weightsUsed: { type: Schema.Types.Mixed, default: null },

      // Matrices EXACTAS enviadas a la API de modelos (pueden ser grandes)
      matricesUsed: { type: Schema.Types.Mixed, default: {} },

      // Snapshots usados (IssueExpressionDomain ids)
      snapshotIdsUsed: { type: [Schema.Types.ObjectId], default: [] },
    },

    // Outputs congelados
    outputs: {
      // Forma “tipo Consensus.details”
      details: { type: Schema.Types.Mixed, default: {} },

      // Forma “tipo Consensus.collectiveEvaluations”
      collectiveEvaluations: { type: Schema.Types.Mixed, default: {} },

      // Resultado bruto de la API (por si luego quieres re-render)
      rawResults: { type: Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: true }
);

issueScenarioSchema.index({ issue: 1, createdAt: -1 });

export const IssueScenario = model("IssueScenario", issueScenarioSchema);