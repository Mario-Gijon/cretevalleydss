import { describe, expect, it } from "vitest";

import { serializeModels } from "../../../modules/issues/finished/finishedPayload/serializers/serializeModels.js";

const model = (overrides = {}) => ({
  _id: "model-ranking",
  name: "Ranking model",
  modelKind: "issue",
  evaluationStructureKey: "alternativeCriteriaMatrix",
  resultStructureKey: "ranking",
  resultStructureVersion: 1,
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  parameters: [],
  supportedExpressionDomains: [],
  ...overrides,
});

describe("Finished Issue model compatibility serialization", () => {
  it("does not offer sorting contract only models as scenario targets", () => {
    const baseModel = model();
    const payload = serializeModels({
      issue: {
        model: baseModel,
        modelParameters: {},
        criteriaWeightingModel: null,
        apiModelKey: "ranking-model",
        apiEndpoint: { path: "/ranking" },
        resultStructureKey: "ranking",
        resultStructureVersion: 1,
        evaluationStructureKey: "alternativeCriteriaMatrix",
        isConsensus: false,
      },
      compatibleModels: [
        model({
          _id: "model-sorting",
          name: "Sorting contract only",
          resultStructureKey: "sorting",
          supportsConsensus: true,
        }),
        model({
          _id: "model-ranking-compatible",
          name: "Another ranking model",
        }),
      ],
      expressionDomains: [],
      criteria: { nodes: [{ isLeaf: true }] },
    });

    expect(payload.compatible.map((entry) => entry.id)).toEqual([
      "model-ranking-compatible",
    ]);
  });
});
