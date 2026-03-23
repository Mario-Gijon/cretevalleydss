import { Schema, model } from "mongoose";

const issueScenarioSchema = new Schema(
  {
    issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    name: { type: String, default: "" },

    targetModel: { type: Schema.Types.ObjectId, ref: "IssueModel", required: true },
    targetModelName: { type: String, required: true },

    domainType: { type: String, enum: ["numeric", "linguistic"], required: true },
    evaluationStructure: {
      type: String,
      enum: ["direct", "pairwiseAlternatives"],
      required: true,
    },

    status: { type: String, enum: ["running", "done", "error"], default: "done" },
    error: { type: String, default: null },

    config: {
      modelParameters: { type: Schema.Types.Mixed, default: {} },
      normalizedModelParameters: { type: Schema.Types.Mixed, default: {} },
      criterionTypes: { type: [String], default: [] },
    },

    inputs: {
      consensusPhaseUsed: { type: Number, default: 1 },

      expertsOrder: { type: [String], default: [] },
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
          },
        ],
        default: [],
      },

      weightsUsed: { type: Schema.Types.Mixed, default: null },
      matricesUsed: { type: Schema.Types.Mixed, default: {} },
      snapshotIdsUsed: { type: [Schema.Types.ObjectId], default: [] },
    },

    outputs: {
      details: { type: Schema.Types.Mixed, default: {} },
      collectiveEvaluations: { type: Schema.Types.Mixed, default: {} },
      rawResults: { type: Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: true }
);

issueScenarioSchema.index({ issue: 1, createdAt: -1 });

export const IssueScenario = model("IssueScenario", issueScenarioSchema);