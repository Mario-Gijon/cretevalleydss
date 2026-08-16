import { describe, expect, it } from "vitest";
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
    expect(scenario).not.toHaveProperty("source");
  });

  it("adapts a legacy single-phase document into one phase result", () => {
    const [scenario] = serializeScenarios({ scenarios: [{
      _id: "legacy-1", name: "Legacy", targetModel, createdBy,
      source: { consensusPhase: 3, stageResult: "stage-3", domainType: "numeric" },
      requestSnapshot: { modelParameters: { beta: 1 } },
      result: { standardResult: { consensusMeasure: 0.7 }, modelExecution: { legacy: true }, rawOutput: { legacy: true } },
      execution: { startedAt: new Date("2026-01-01T00:00:00Z"), completedAt: new Date("2026-01-01T00:01:00Z") },
    }] });

    expect(scenario.phaseResults).toMatchObject([{ phase: 3, source: { stageResult: "stage-3" }, requestSnapshot: { modelParameters: { beta: 1 } } }]);
  });
});
