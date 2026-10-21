import { describe, expect, it } from "vitest";

import { serializeModels } from "../../../modules/issues/finished/finishedPayload/serializers/serializeModels.js";

const model = (overrides = {}) => ({
  _id: "model-ranking",
  name: "Ranking model",
  modelKind: "issue",
  implementationStatus: "ready",
  publicUsable: true,
  issueExecutionAuthorized: true,
  manifestSync: { isStale: false },
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
  it("offers authorized sorting models and excludes other sorting models without individual authorization", () => {
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
          _id: "model-topsis-sort",
          name: "TOPSIS-Sort 2016",
          apiModelKey: "topsis_sort_2016",
          resultStructureKey: "sorting",
          supportsConsensus: false,
        }),
        model({
          _id: "model-sorting-unauthorized",
          name: "Unauthorized sorting model",
          apiModelKey: "another-sorting-plugin",
          resultStructureKey: "sorting",
          issueExecutionAuthorized: false,
        }),
        model({
          _id: "model-ranking-compatible",
          name: "Another ranking model",
        }),
        model({
          _id: "model-ranking-not-authorized",
          name: "Not authorized",
          issueExecutionAuthorized: false,
        }),
      ],
      expressionDomains: [],
      criteria: { nodes: [{ isLeaf: true }] },
    });

    expect(payload.compatible.map((entry) => entry.id)).toEqual([
      "model-ranking-compatible",
      "model-topsis-sort",
    ]);
  });
});
