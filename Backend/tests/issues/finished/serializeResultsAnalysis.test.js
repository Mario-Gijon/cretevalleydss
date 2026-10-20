import { describe, expect, it } from "vitest";

import { serializeResultsAnalysis } from "../../../modules/issues/finished/finishedPayload/serializers/serializeResultsAnalysis.js";

const analysis = (executionKey, executionType, scenario = null) => ({
  executionKey,
  executionType,
  scenario,
  genericAnalysis: { interpretation: "synthetic" },
  generatedAt: new Date("2026-10-20T12:00:00.000Z"),
});

describe("Finished Issue result analysis serialization", () => {
  it("does not expose analysis for sorting base results", () => {
    const serialized = serializeResultsAnalysis({
      issue: {
        resultStructureKey: "sorting",
        resultStructureVersion: 1,
      },
      scenarios: [],
      analyses: [analysis("base", "base")],
    });

    expect(serialized).toEqual({ executions: [] });
  });

  it("does not expose analysis for sorting scenarios on a ranking issue", () => {
    const scenarioId = "scenario-1";
    const serialized = serializeResultsAnalysis({
      issue: {
        resultStructureKey: "ranking",
        resultStructureVersion: 1,
      },
      scenarios: [{
        _id: scenarioId,
        phaseResults: [{
          result: {
            resultStructureKey: "sorting",
            resultStructureVersion: 1,
          },
        }],
      }],
      analyses: [analysis(scenarioId, "scenario", scenarioId)],
    });

    expect(serialized).toEqual({ executions: [] });
  });

  it("preserves ranking analysis output", () => {
    const serialized = serializeResultsAnalysis({
      issue: {
        resultStructureKey: "ranking",
        resultStructureVersion: 1,
      },
      scenarios: [],
      analyses: [analysis("base", "base")],
    });

    expect(serialized.executions).toHaveLength(1);
    expect(serialized.executions[0]).toMatchObject({
      executionKey: "base",
      executionType: "base",
      genericAnalysis: { interpretation: "synthetic" },
    });
  });
});
