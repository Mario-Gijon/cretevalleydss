import { describe, expect, it } from "vitest";
import { buildResultStructureRegistry } from "../../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js";
import { serializeScenarios } from "../../../modules/issues/finished/finishedPayload/serializers/serializeScenarios.js";

const targetModel = { _id: "model-1", name: "Replay model", moreInfoUrl: "https://example.test/model" };
const createdBy = { _id: "user-1", name: "Owner", email: "owner@example.test" };

describe("serializeScenarios", () => {
  it("exposes every new-format scenario phase in canonical ascending order", () => {
    const [scenario] = serializeScenarios({ scenarios: [{
      _id: "scenario-1", name: "Historical replay", targetModel, createdBy,
      config: { parameterOverrides: { alpha: 0.8 } },
      phaseResults: [
        { phase: 2, source: { stageResult: "stage-2", domainType: "numeric" }, requestSnapshot: { modelParameters: { alpha: 0.8 } }, result: { standardResult: { consensusMeasure: 0.9 }, modelExecution: { phase: 2 }, rawOutput: { phase: 2 } }, execution: { attemptId: "attempt-2", startedAt: new Date("2026-01-01T00:02:00Z"), completedAt: new Date("2026-01-01T00:03:00Z") } },
        { phase: 0, source: { stageResult: "stage-0", domainType: "numeric" }, requestSnapshot: { modelParameters: { alpha: 0.8 } }, result: { standardResult: { consensusMeasure: 0.4 }, modelExecution: { phase: 0 }, rawOutput: { phase: 0 } }, execution: { attemptId: "attempt-0", startedAt: new Date("2026-01-01T00:00:00Z"), completedAt: new Date("2026-01-01T00:01:00Z") } },
      ],
    }] });

    expect(scenario.phaseResults.map((entry) => entry.phase)).toEqual([0, 2]);
    expect(scenario.phaseResults[1]).toMatchObject({ source: { stageResult: "stage-2" }, requestSnapshot: { modelParameters: { alpha: 0.8 } }, standardizedOutput: { consensusMeasure: 0.9 }, modelSpecificOutput: { phase: 2 }, rawOutput: { phase: 2 }, execution: { attemptId: "attempt-2" } });
    expect(scenario.phaseResults[1]).toMatchObject({
      resultStructureKey: "ranking",
      resultStructureVersion: 1,
      consensusMeasure: 0.9,
    });
    expect(scenario).not.toHaveProperty("source");
  });

  it("preserves a scenario result from its persisted non-ranking structure", () => {
    const registry = buildResultStructureRegistry([{
      key: "synthetic-results",
      version: 1,
      validateAndNormalize: ({ result }) => result,
      projectNormalizedResult: ({ result, target }) => {
        if (target === "finishedIssueScenarioPhaseResult") {
          return { standardizedOutput: result };
        }
        throw new TypeError(`Unsupported synthetic projection '${target}'`);
      },
    }]);
    const standardizedResult = {
      assignments: [{ itemId: "item-1", group: "preferred" }],
      confidence: { level: 0.93 },
      customField: "scenario-preserved",
    };
    const [scenario] = serializeScenarios({
      registry,
      scenarios: [{
        _id: "scenario-1",
        name: "Synthetic result",
        targetModel: { _id: "model-1", name: "Current catalog model", resultStructureKey: "ranking", resultStructureVersion: 1 },
        phaseResults: [{
          phase: 0,
          source: {},
          requestSnapshot: { pluginRequest: { threshold: 0.7 } },
          result: {
            resultStructureKey: "synthetic-results",
            resultStructureVersion: 1,
            standardResult: standardizedResult,
            modelExecution: { customExecutionField: "execution-preserved" },
            rawOutput: { customRawField: "raw-preserved" },
          },
          execution: {
            attemptId: "attempt-1",
            startedAt: new Date("2026-02-03T10:00:00.000Z"),
            completedAt: new Date("2026-02-03T10:01:00.000Z"),
          },
        }],
      }],
    });

    expect(scenario.phaseResults[0]).toMatchObject({
      resultStructureKey: "synthetic-results",
      resultStructureVersion: 1,
      standardizedOutput: standardizedResult,
      requestSnapshot: { pluginRequest: { threshold: 0.7 } },
      modelSpecificOutput: { customExecutionField: "execution-preserved" },
      rawOutput: { customRawField: "raw-preserved" },
      execution: {
        attemptId: "attempt-1",
        startedAt: "2026-02-03T10:00:00.000Z",
        completedAt: "2026-02-03T10:01:00.000Z",
      },
    });
    expect(scenario.phaseResults[0]).not.toHaveProperty("rankedAlternatives");
    expect(scenario.phaseResults[0].standardizedOutput).not.toHaveProperty("rankedAlternatives");
  });

  it("serializes historical sorting scenario assignments with their structure version", () => {
    const standardResult = {
      categories: [{ categoryId: "hold", label: "Hold", order: 0 }],
      categoryOrderSemantics: "lower-order-is-less-preferred",
      assignments: [{ alternativeId: "historical-alt-id", categoryId: "hold" }],
    };
    const [scenario] = serializeScenarios({
      scenarios: [{
        _id: "scenario-sorting",
        name: "Historical sorting replay",
        targetModel,
        phaseResults: [{
          phase: 0,
          source: {},
          requestSnapshot: { context: { alternatives: [{ id: "historical-alt-id" }] } },
          result: {
            resultStructureKey: "sorting",
            resultStructureVersion: 1,
            standardResult,
            modelExecution: {},
            rawOutput: {},
          },
          execution: {},
        }],
      }],
    });

    expect(scenario.phaseResults[0]).toMatchObject({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      standardizedOutput: standardResult,
      requestSnapshot: { context: { alternatives: [{ id: "historical-alt-id" }] } },
    });
    expect(scenario.phaseResults[0]).not.toHaveProperty("rankedAlternatives");
  });

  it.each([
    [{ resultStructureKey: "missing", resultStructureVersion: 1 }, "Unsupported resultStructureKey"],
    [{ resultStructureKey: "ranking", resultStructureVersion: 99 }, "Unsupported resultStructureVersion"],
  ])("rejects incompatible scenario result metadata %j", (metadata, message) => {
    expect(() => serializeScenarios({
      scenarios: [{
        _id: "scenario-1",
        targetModel,
        phaseResults: [{
          phase: 0,
          result: { ...metadata, standardResult: {}, modelExecution: {}, rawOutput: {} },
          execution: {},
        }],
      }],
    })).toThrow(message);
  });

});
