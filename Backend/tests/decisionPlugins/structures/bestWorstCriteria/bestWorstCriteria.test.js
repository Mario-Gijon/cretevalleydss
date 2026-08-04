import { describe, expect, it } from "vitest";

import { getBestWorstCriteriaPayload } from "../../../../modules/decisionPlugins/evaluations/structures/bestWorstCriteria/bestWorstCriteria.get.js";
import { saveBestWorstCriteriaPayload } from "../../../../modules/decisionPlugins/evaluations/structures/bestWorstCriteria/bestWorstCriteria.save.js";
import { remapBestWorstCriteriaCriterionIds } from "../../../../modules/decisionPlugins/evaluations/structures/bestWorstCriteria/operations/remapCriterionIds.js";

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

describe("bestWorstCriteria criterion-id remapping", () => {
  const buildRemapPayload = () => ({
    bestCriterionId: "criterion-temp-2",
    worstCriterionId: "criterion-temp-1",
    bestToOthers: {
      "criterion-temp-1": 5,
      "criterion-temp-2": 1,
    },
    othersToWorst: {
      "criterion-temp-1": 1,
      "criterion-temp-2": 5,
    },
  });

  const buildCriterionIdMap = () =>
    new Map([
      ["criterion-temp-1", "66b0a123"],
      ["criterion-temp-2", "66b0a456"],
    ]);

  it("remaps every BWM criterion reference without changing comparison values", () => {
    expect(
      remapBestWorstCriteriaCriterionIds({
        payload: buildRemapPayload(),
        criterionIdMap: buildCriterionIdMap(),
      })
    ).toEqual({
      bestCriterionId: "66b0a456",
      worstCriterionId: "66b0a123",
      bestToOthers: {
        "66b0a123": 5,
        "66b0a456": 1,
      },
      othersToWorst: {
        "66b0a123": 1,
        "66b0a456": 5,
      },
    });
  });

  it("does not mutate the payload, comparison maps, or criterion-id map", () => {
    const payload = buildRemapPayload();
    const criterionIdMap = buildCriterionIdMap();
    const originalPayload = {
      ...payload,
      bestToOthers: { ...payload.bestToOthers },
      othersToWorst: { ...payload.othersToWorst },
    };
    const originalMapEntries = Array.from(criterionIdMap.entries());

    const remapped = remapBestWorstCriteriaCriterionIds({
      payload,
      criterionIdMap,
    });

    expect(payload).toEqual(originalPayload);
    expect(payload.bestToOthers).not.toBe(remapped.bestToOthers);
    expect(payload.othersToWorst).not.toBe(remapped.othersToWorst);
    expect(Array.from(criterionIdMap.entries())).toEqual(originalMapEntries);
  });

  it.each([null, [], "payload", 1])(
    "rejects an invalid payload container %j",
    (payload) => {
      expect(() =>
        remapBestWorstCriteriaCriterionIds({
          payload,
          criterionIdMap: buildCriterionIdMap(),
        })
      ).toThrow();
    }
  );

  it.each([
    ["bestToOthers", null],
    ["bestToOthers", []],
    ["othersToWorst", null],
    ["othersToWorst", []],
  ])("rejects an invalid %s container", (field, value) => {
    const payload = buildRemapPayload();
    payload[field] = value;

    expect(() =>
      remapBestWorstCriteriaCriterionIds({
        payload,
        criterionIdMap: buildCriterionIdMap(),
      })
    ).toThrow();
  });

  it.each([null, {}, [], "map"])("rejects a non-Map criterion-id map", (criterionIdMap) => {
    expect(() =>
      remapBestWorstCriteriaCriterionIds({
        payload: buildRemapPayload(),
        criterionIdMap,
      })
    ).toThrow();
  });

  it.each([
    ["bestCriterionId", undefined],
    ["worstCriterionId", ""],
  ])("rejects a missing or empty %s", (field, value) => {
    const payload = buildRemapPayload();
    payload[field] = value;

    expect(() =>
      remapBestWorstCriteriaCriterionIds({
        payload,
        criterionIdMap: buildCriterionIdMap(),
      })
    ).toThrow();
  });

  it.each([
    ["bestToOthers", ""],
    ["othersToWorst", ""],
  ])("rejects an empty %s criterion key", (field, criterionId) => {
    const payload = buildRemapPayload();
    payload[field] = { [criterionId]: 1 };

    expect(() =>
      remapBestWorstCriteriaCriterionIds({
        payload,
        criterionIdMap: buildCriterionIdMap(),
      })
    ).toThrow();
  });

  it("rejects unknown temporary IDs and empty mapped persisted IDs", () => {
    const unknownPayload = buildRemapPayload();
    unknownPayload.bestCriterionId = "unknown";

    expect(() =>
      remapBestWorstCriteriaCriterionIds({
        payload: unknownPayload,
        criterionIdMap: buildCriterionIdMap(),
      })
    ).toThrow();

    expect(() =>
      remapBestWorstCriteriaCriterionIds({
        payload: buildRemapPayload(),
        criterionIdMap: new Map([
          ["criterion-temp-1", "66b0a123"],
          ["criterion-temp-2", ""],
        ]),
      })
    ).toThrow();
  });
});
