import { describe, expect, it } from "vitest";

import { buildAnalyticalScatterViewModel } from "../../../../src/features/finishedIssueDialog/graphs/logic/buildAnalyticalScatterViewModel.js";

describe("buildAnalyticalScatterViewModel", () => {
  it("normalizes canonical expert and collective points and derives padded ranges", () => {
    const result = buildAnalyticalScatterViewModel({
      data: {
        2: {
          expertPoints: [
            { x: "1", y: 2, label: "  Expert A  " },
            { x: "invalid", y: 3, label: "Ignored" },
            { x: 2, y: 4, label: "" },
          ],
          collectivePoint: { x: "3", y: "5" },
        },
      },
      phase: 2,
    });

    expect(result).toEqual({
      expertPoints: [
        { x: 1, y: 2, label: "Expert A", email: "Expert A", identity: "Expert A" },
        { x: 2, y: 4, label: "Expert 3", email: "Expert 3", identity: "Expert 3" },
      ],
      collectivePoint: { x: 3, y: 5 },
      xRange: { min: 0.6, max: 3.4 },
      yRange: { min: 1.4, max: 5.6 },
    });
  });

  it("preserves expert_points_by_email and collective_point compatibility", () => {
    const result = buildAnalyticalScatterViewModel({
      data: {
        0: {
          expert_points_by_email: {
            "one@example.test": [0.5, 0.25],
            invalid: [1],
            "two@example.test": [1.5, 0.75],
          },
          collective_point: [1, 0.5],
        },
      },
      phase: 0,
    });

    expect(result.expertPoints).toEqual([
      { x: 0.5, y: 0.25, label: "one@example.test", email: "one@example.test", identity: "one@example.test" },
      { x: 1.5, y: 0.75, label: "two@example.test", email: "two@example.test", identity: "two@example.test" },
    ]);
    expect(result.collectivePoint).toEqual({ x: 1, y: 0.5 });
  });

  it("preserves expert_points labels and the origin fallback for a missing collective point", () => {
    const result = buildAnalyticalScatterViewModel({
      data: {
        final: {
          expert_points: [[2, 3], [4, 5], ["bad", 6]],
          expert_labels: ["  First  ", ""],
        },
      },
      phase: "final",
    });

    expect(result.expertPoints).toEqual([
      { x: 2, y: 3, label: "First", email: "First", identity: "First" },
      { x: 4, y: 5, label: "Expert 2", email: "Expert 2", identity: "Expert 2" },
    ]);
    expect(result.collectivePoint).toEqual({ x: 0, y: 0 });
  });

  it("keeps the existing source precedence instead of mixing canonical and legacy points", () => {
    expect(
      buildAnalyticalScatterViewModel({
        data: {
          0: {
            expertPoints: [],
            expert_points_by_email: { legacy: [1, 2] },
            expert_points: [[3, 4]],
          },
        },
        phase: 0,
      })
    ).toBeNull();

    const emailMapResult = buildAnalyticalScatterViewModel({
      data: {
        0: {
          expert_points_by_email: { email: [1, 2] },
          expert_points: [[3, 4]],
        },
      },
      phase: 0,
    });

    expect(emailMapResult.expertPoints).toEqual([
      { x: 1, y: 2, label: "email", email: "email", identity: "email" },
    ]);
  });

  it("preserves duplicate visible labels with stable IDs and email identities", () => {
    const result = buildAnalyticalScatterViewModel({
      data: {
        0: {
          expertPoints: [
            { x: 0, y: 0, label: "Shared name", identity: "expert-1", email: "one@example.test" },
            { x: 1, y: 1, label: "Shared name", identity: "expert-2", email: "two@example.test" },
          ],
          collectivePoint: { x: 0.5, y: 0.5 },
        },
      },
      phase: 0,
    });

    expect(result.expertPoints.map(({ label, identity, email }) => ({ label, identity, email }))).toEqual([
      { label: "Shared name", identity: "expert-1", email: "one@example.test" },
      { label: "Shared name", identity: "expert-2", email: "two@example.test" },
    ]);
  });

  it("returns null for missing phases and phases without valid expert points", () => {
    expect(
      buildAnalyticalScatterViewModel({ data: {}, phase: 0 })
    ).toBeNull();
    expect(
      buildAnalyticalScatterViewModel({
        data: { 0: { expert_points: [["bad", 2]] } },
        phase: 0,
      })
    ).toBeNull();
  });
});
