import { describe, expect, it } from "vitest";

import { getBestWorstCriteriaPayload } from "../../../../modules/decisionPlugins/evaluations/structures/bestWorstCriteria/bestWorstCriteria.get.js";
import { saveBestWorstCriteriaPayload } from "../../../../modules/decisionPlugins/evaluations/structures/bestWorstCriteria/bestWorstCriteria.save.js";

const criteria = [
  { id: "quality", name: "Quality" },
  { id: "cost", name: "Cost" },
  { id: "delivery", name: "Delivery" },
];
const decisionContext = { leafCriteria: criteria };

const buildEmptyComparisons = () => ({
  quality: "",
  cost: "",
  delivery: "",
});

const buildEmptyPayload = () => ({
  bestCriterionId: "",
  worstCriterionId: "",
  bestToOthers: buildEmptyComparisons(),
  othersToWorst: buildEmptyComparisons(),
});

const buildCompletePayload = () => ({
  bestCriterionId: "quality",
  worstCriterionId: "cost",
  bestToOthers: { quality: 1, cost: 5, delivery: 3 },
  othersToWorst: { quality: 5, cost: 1, delivery: 3 },
});

const save = ({ payload, mode = "draft", context = decisionContext }) =>
  saveBestWorstCriteriaPayload({
    payload,
    decisionContext: context,
    mode,
  });

describe("bestWorstCriteria canonical payload", () => {
  it("builds an empty payload without implicit selections", async () => {
    await expect(
      getBestWorstCriteriaPayload({
        payload: undefined,
        decisionContext,
      })
    ).resolves.toEqual(buildEmptyPayload());
  });

  it("accepts canonical draft and submit payloads", async () => {
    await expect(
      save({ payload: buildEmptyPayload() })
    ).resolves.toEqual(buildEmptyPayload());
    await expect(
      save({ payload: buildCompletePayload(), mode: "submit" })
    ).resolves.toEqual(buildCompletePayload());
  });

  it("normalizes numeric comparison strings", async () => {
    const payload = buildCompletePayload();
    payload.bestToOthers.cost = "5";
    payload.othersToWorst.delivery = "3";

    await expect(save({ payload })).resolves.toEqual(buildCompletePayload());
  });

  it.each(["bestCriterion", "worstCriterion", "unknown"])(
    "rejects legacy or unknown top-level field %s",
    async (field) => {
      const payload = { ...buildCompletePayload(), [field]: "quality" };

      await expect(save({ payload })).rejects.toMatchObject({
        field: "payload",
      });
    }
  );

  it.each([
    "bestCriterionId",
    "worstCriterionId",
    "bestToOthers",
    "othersToWorst",
  ])("rejects missing top-level field %s", async (field) => {
    const payload = buildCompletePayload();
    delete payload[field];

    await expect(save({ payload })).rejects.toMatchObject({
      field: `payload.${field}`,
    });
  });

  it("rejects unknown and missing comparison keys", async () => {
    const unknown = buildCompletePayload();
    unknown.bestToOthers.unknown = 4;
    await expect(save({ payload: unknown })).rejects.toMatchObject({
      field: "payload.bestToOthers",
    });

    const missing = buildCompletePayload();
    delete missing.othersToWorst.delivery;
    await expect(save({ payload: missing })).rejects.toMatchObject({
      field: "payload.othersToWorst.delivery",
    });
  });

  it("rejects unknown and conflicting selected criteria", async () => {
    const unknown = buildCompletePayload();
    unknown.bestCriterionId = "unknown";
    await expect(save({ payload: unknown })).rejects.toMatchObject({
      field: "payload.bestCriterionId",
    });

    const conflicting = buildCompletePayload();
    conflicting.worstCriterionId = "quality";
    conflicting.othersToWorst = { quality: 1, cost: 4, delivery: 3 };
    await expect(save({ payload: conflicting })).rejects.toMatchObject({
      field: "payload.worstCriterionId",
    });
  });

  it("allows one criterion to be both best and worst", async () => {
    const context = {
      leafCriteria: [{ id: "only", name: "Only criterion" }],
    };
    const payload = {
      bestCriterionId: "only",
      worstCriterionId: "only",
      bestToOthers: { only: 1 },
      othersToWorst: { only: 1 },
    };

    await expect(
      save({ payload, mode: "submit", context })
    ).resolves.toEqual(payload);
  });

  it.each([0, 10, 1.5, Infinity, "abc", {}, []])(
    "rejects invalid comparison value %j",
    async (value) => {
      const payload = buildCompletePayload();
      payload.bestToOthers.delivery = value;

      await expect(save({ payload })).rejects.toMatchObject({
        field: "payload.bestToOthers.delivery",
      });
    }
  );

  it("requires selections and complete values for submit", async () => {
    await expect(
      save({ payload: buildEmptyPayload(), mode: "submit" })
    ).rejects.toMatchObject({
      field: "payload.bestCriterionId",
    });

    const incomplete = buildCompletePayload();
    incomplete.bestToOthers.delivery = "";
    await expect(
      save({ payload: incomplete, mode: "submit" })
    ).rejects.toMatchObject({
      field: "payload.bestToOthers.delivery",
    });
  });

  it("validates self-comparisons instead of overwriting them", async () => {
    const invalidBest = buildCompletePayload();
    invalidBest.bestToOthers.quality = 4;
    await expect(save({ payload: invalidBest })).rejects.toMatchObject({
      field: "payload.bestToOthers.quality",
    });

    const invalidWorst = buildCompletePayload();
    invalidWorst.othersToWorst.cost = 2;
    await expect(save({ payload: invalidWorst })).rejects.toMatchObject({
      field: "payload.othersToWorst.cost",
    });
  });

  it("requires an empty vector when its selection is blank", async () => {
    const payload = buildEmptyPayload();
    payload.bestToOthers.quality = 3;

    await expect(save({ payload })).rejects.toMatchObject({
      field: "payload.bestToOthers.quality",
    });
  });
});
