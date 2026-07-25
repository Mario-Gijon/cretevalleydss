import { describe, expect, it } from "vitest";

import { getManualCriteriaWeightsPayload } from "../../../../modules/decisionPlugins/evaluations/structures/manualCriteriaWeights/manualCriteriaWeights.get.js";
import { saveManualCriteriaWeightsPayload } from "../../../../modules/decisionPlugins/evaluations/structures/manualCriteriaWeights/manualCriteriaWeights.save.js";

const decisionContext = {
  leafCriteria: [
    { id: "cost", name: "Cost" },
    { id: "quality", name: "Quality" },
    { id: "delivery", name: "Delivery" },
  ],
};

const buildEmptyPayload = () => ({
  weightsByCriterion: { cost: "", quality: "", delivery: "" },
});

const buildCompletePayload = () => ({
  weightsByCriterion: { cost: 0.3, quality: 0.5, delivery: 0.2 },
});

const save = ({ payload, mode = "draft", context = decisionContext }) =>
  saveManualCriteriaWeightsPayload({
    payload,
    decisionContext: context,
    mode,
  });

const captureError = (callback) => {
  try {
    callback();
  } catch (error) {
    return error;
  }

  throw new Error("Expected callback to throw");
};

describe("manualCriteriaWeights canonical payload", () => {
  it("builds a blank canonical payload without inventing equal weights", () => {
    expect(
      getManualCriteriaWeightsPayload({ payload: undefined, decisionContext })
    ).toEqual(buildEmptyPayload());
  });

  it("accepts canonical draft and submit payloads", () => {
    expect(save({ payload: buildEmptyPayload() })).toEqual(buildEmptyPayload());
    expect(
      save({ payload: buildCompletePayload(), mode: "submit" })
    ).toEqual(buildCompletePayload());
  });

  it("normalizes numeric strings while preserving zero, one, and draft blanks", () => {
    const payload = {
      weightsByCriterion: { cost: "0", quality: "1", delivery: "" },
    };

    expect(save({ payload })).toEqual({
      weightsByCriterion: { cost: 0, quality: 1, delivery: "" },
    });
  });

  it.each([-0.1, 1.1, Infinity, true, false, null, undefined, "abc", {}, []])(
    "rejects invalid draft weight %j",
    (value) => {
      const payload = buildEmptyPayload();
      payload.weightsByCriterion.cost = value;

      expect(() => save({ payload })).toThrow(
        /Weight must be a finite number between 0 and 1/
      );
      expect(captureError(() => save({ payload }))).toMatchObject({
        field: "payload.weightsByCriterion.cost",
      });
    }
  );

  it("requires every submitted weight", () => {
    expect(
      captureError(() => save({ payload: buildEmptyPayload(), mode: "submit" }))
    ).toMatchObject({ field: "payload.weightsByCriterion.cost" });
  });

  it("requires submitted weights to sum to one within the canonical tolerance", () => {
    const withinTolerance = buildCompletePayload();
    withinTolerance.weightsByCriterion.cost = 0.3005;
    expect(
      save({ payload: withinTolerance, mode: "submit" })
    ).toEqual(withinTolerance);

    const outsideTolerance = buildCompletePayload();
    outsideTolerance.weightsByCriterion.cost = 0.3011;
    expect(
      captureError(() => save({ payload: outsideTolerance, mode: "submit" }))
    ).toMatchObject({ field: "payload.weightsByCriterion" });
  });

  it("rejects malformed top-level and criterion map shapes", () => {
    expect(captureError(() => save({ payload: {} }))).toMatchObject({
      field: "payload",
    });
    expect(captureError(() =>
      save({
        payload: { ...buildCompletePayload(), unknown: true },
      })
    )).toMatchObject({ field: "payload" });

    const missing = buildCompletePayload();
    delete missing.weightsByCriterion.delivery;
    expect(captureError(() => save({ payload: missing }))).toMatchObject({
      field: "payload.weightsByCriterion.delivery",
    });

    const unknown = buildCompletePayload();
    unknown.weightsByCriterion.unknown = 0;
    expect(captureError(() => save({ payload: unknown }))).toMatchObject({
      field: "payload.weightsByCriterion",
    });
  });

  it("rejects malformed criteria and duplicate criterion ids", () => {
    expect(captureError(() =>
      getManualCriteriaWeightsPayload({
        payload: undefined,
        decisionContext: { leafCriteria: [{ id: "cost", name: "Cost" }, null] },
      })
    )).toMatchObject({ field: "decisionContext.leafCriteria[1]" });
    expect(captureError(() =>
      getManualCriteriaWeightsPayload({
        payload: undefined,
        decisionContext: {
          leafCriteria: [
            { id: "cost", name: "Cost" },
            { id: "cost", name: "Duplicate" },
          ],
        },
      })
    )).toMatchObject({ field: "decisionContext.leafCriteria[1].id" });
  });

  it("only creates an empty payload for an absent stored payload", () => {
    expect(captureError(() =>
      getManualCriteriaWeightsPayload({ payload: {}, decisionContext })
    )).toMatchObject({ field: "payload" });
  });
});
