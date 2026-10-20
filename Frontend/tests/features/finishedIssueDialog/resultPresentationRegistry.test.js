import { describe, expect, it } from "vitest";

import {
  RESULT_PRESENTATION_REGISTRY,
  buildResultPresentationRegistry,
  resolveResultPresentation,
} from "../../../src/features/finishedIssueDialog/resultPresentations/registry.js";

describe("Finished Issue result presentation registry", () => {
  it("autodetects the ranking@1 and sorting@1 presentation entries", () => {
    expect(Object.keys(RESULT_PRESENTATION_REGISTRY).sort()).toEqual(["ranking@1", "sorting@1"]);
    expect(RESULT_PRESENTATION_REGISTRY["ranking@1"].capabilities.resultsAnalysis).toBe(true);
    expect(RESULT_PRESENTATION_REGISTRY["sorting@1"].capabilities.resultsAnalysis).toBe(false);
  });

  it("selects a presentation only by result structure key and version", () => {
    expect(resolveResultPresentation({ resultStructureKey: "sorting", resultStructureVersion: 1 }).presentation)
      .toBe(RESULT_PRESENTATION_REGISTRY["sorting@1"]);
    expect(resolveResultPresentation({ resultStructureKey: "ranking", resultStructureVersion: 1 }).presentation)
      .toBe(RESULT_PRESENTATION_REGISTRY["ranking@1"]);
    expect(resolveResultPresentation({ resultStructureKey: "sorting", resultStructureVersion: 2 }).available).toBe(false);
  });

  it("uses the ranking presentation only for the contract's historical missing-metadata cases", () => {
    expect(resolveResultPresentation({}).legacyFallback).toBe(true);
    expect(resolveResultPresentation({ resultStructureKey: null, resultStructureVersion: null }).presentation)
      .toBe(RESULT_PRESENTATION_REGISTRY["ranking@1"]);
    expect(resolveResultPresentation({ resultStructureKey: "sorting" }).available).toBe(false);
    expect(resolveResultPresentation({ resultStructureKey: "unknown", resultStructureVersion: 1 }).presentation).toBeNull();
  });

  it("rejects duplicate autodetected presentation identities", () => {
    const module = {
      default: {
        ...RESULT_PRESENTATION_REGISTRY["ranking@1"],
      },
    };
    expect(() => buildResultPresentationRegistry({
      "./presentations/ranking/v1/index.js": module,
      "./presentations/ranking/v2/index.js": { default: { ...module.default, resultStructureVersion: 1 } },
    })).toThrow(/Invalid presentation entry|Duplicate presentation/);
  });
});
