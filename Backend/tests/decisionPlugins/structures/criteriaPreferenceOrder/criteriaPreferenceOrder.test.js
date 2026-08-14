import { describe, expect, it } from "vitest";

import { getCriteriaPreferenceOrderPayload } from "../../../../modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/criteriaPreferenceOrder.get.js";
import { saveCriteriaPreferenceOrderPayload } from "../../../../modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/criteriaPreferenceOrder.save.js";
import { remapCriteriaPreferenceOrderCriterionIds } from "../../../../modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/operations/remapCriterionIds.js";

const decisionContext = {
  leafCriteria: [
    { id: "quality", name: "Quality" },
    { id: "cost", name: "Cost" },
    { id: "delivery", name: "Delivery" },
  ],
};

const save = ({ payload, mode = "draft", context = decisionContext }) =>
  saveCriteriaPreferenceOrderPayload({
    payload,
    decisionContext: context,
    mode,
  });

describe("criteriaPreferenceOrder canonical payload", () => {
  it("returns the canonical empty payload for missing stored state while validating criteria", async () => {
    await expect(
      getCriteriaPreferenceOrderPayload({ payload: null, decisionContext })
    ).resolves.toEqual({ criterionOrder: [] });
    await expect(
      getCriteriaPreferenceOrderPayload({ payload: undefined, decisionContext })
    ).resolves.toEqual({ criterionOrder: [] });
    await expect(
      getCriteriaPreferenceOrderPayload({
        payload: null,
        decisionContext: { leafCriteria: [{ id: " ", name: "Invalid" }] },
      })
    ).rejects.toMatchObject({ field: "decisionContext.leafCriteria[0].id" });
  });

  it("accepts empty, partial, and complete draft orders", async () => {
    await expect(save({ payload: { criterionOrder: [] } })).resolves.toEqual({
      criterionOrder: [],
    });
    await expect(
      save({ payload: { criterionOrder: ["delivery", "quality"] } })
    ).resolves.toEqual({ criterionOrder: ["delivery", "quality"] });
    await expect(
      save({ payload: { criterionOrder: ["quality", "cost", "delivery"] } })
    ).resolves.toEqual({ criterionOrder: ["quality", "cost", "delivery"] });
  });

  it("requires a complete strict order when submitting", async () => {
    await expect(
      save({ payload: { criterionOrder: ["quality", "cost"] }, mode: "submit" })
    ).rejects.toMatchObject({ field: "payload.criterionOrder" });
    await expect(
      save({
        payload: { criterionOrder: ["delivery", "quality", "cost"] },
        mode: "submit",
      })
    ).resolves.toEqual({ criterionOrder: ["delivery", "quality", "cost"] });
  });

  it.each([
    [null, "payload"],
    [[], "payload"],
    [{}, "payload.criterionOrder"],
    [{ criterionOrder: "quality" }, "payload.criterionOrder"],
    [{ criterionOrder: [""] }, "payload.criterionOrder[0]"],
    [{ criterionOrder: [1] }, "payload.criterionOrder[0]"],
    [{ criterionOrder: ["unknown"] }, "payload.criterionOrder[0]"],
    [{ criterionOrder: ["quality", "quality"] }, "payload.criterionOrder[1]"],
  ])("rejects invalid payload %#", async (payload, field) => {
    await expect(save({ payload })).rejects.toMatchObject({ field });
  });

  it("trims ids, preserves their semantic order, and discards unrelated fields", async () => {
    await expect(
      save({
        payload: {
          criterionOrder: [" delivery ", "quality", " cost"],
          displayRanks: [1, 2, 3],
        },
        mode: "submit",
      })
    ).resolves.toEqual({ criterionOrder: ["delivery", "quality", "cost"] });
  });

  it.each([
    [{}, "decisionContext.leafCriteria"],
    [{ leafCriteria: "criteria" }, "decisionContext.leafCriteria"],
    [{ leafCriteria: [{ id: "", name: "Invalid" }] }, "decisionContext.leafCriteria[0].id"],
    [
      { leafCriteria: [{ id: "quality" }, { id: " quality " }] },
      "decisionContext.leafCriteria[1].id",
    ],
  ])("rejects malformed canonical criteria %#", async (context, field) => {
    await expect(
      save({ payload: { criterionOrder: [] }, context })
    ).rejects.toMatchObject({ field });
  });
});

describe("criteriaPreferenceOrder criterion-id remapping", () => {
  const payload = { criterionOrder: ["temporary-b", "temporary-a"] };
  const idMap = new Map([
    ["temporary-a", "persisted-a"],
    ["temporary-b", "persisted-b"],
  ]);

  it("remaps every id in exact preference order and returns only the canonical payload", () => {
    expect(
      remapCriteriaPreferenceOrderCriterionIds({ payload, criterionIdMap: idMap })
    ).toEqual({ criterionOrder: ["persisted-b", "persisted-a"] });
  });

  it.each([null, {}, [], "map"])('requires a Map (%#)', (criterionIdMap) => {
    expect(() =>
      remapCriteriaPreferenceOrderCriterionIds({ payload, criterionIdMap })
    ).toThrow();
  });

  it.each([
    [{ criterionOrder: ["temporary-a", "missing"] }, idMap],
    [{ criterionOrder: ["temporary-a", " "] }, idMap],
    [{ criterionOrder: ["temporary-a", "temporary-a"] }, idMap],
    [{ criterionOrder: ["temporary-a"] }, new Map([["temporary-a", " "]])],
    [
      { criterionOrder: ["temporary-a", "temporary-b"] },
      new Map([["temporary-a", "same"], ["temporary-b", "same"]]),
    ],
  ])("rejects an invalid remapping %#", (invalidPayload, criterionIdMap) => {
    expect(() =>
      remapCriteriaPreferenceOrderCriterionIds({
        payload: invalidPayload,
        criterionIdMap,
      })
    ).toThrow();
  });
});
