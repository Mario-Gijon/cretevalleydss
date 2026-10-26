import { describe, expect, it } from "vitest";

import { getCriteriaPairwiseAHPPayload } from "../../../../modules/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/criteriaPairwiseAHP.get.js";
import { saveCriteriaPairwiseAHPPayload } from "../../../../modules/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/criteriaPairwiseAHP.save.js";
import { remapCriteriaPairwiseAHPCriterionIds } from "../../../../modules/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/remapCriterionIds.js";
import { criteriaPairwiseAHPStructure } from "../../../../modules/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/index.js";

const criteria = [
  { id: "quality", name: "Quality" },
  { id: "cost", name: "Cost" },
  { id: "delivery", name: "Delivery" },
];
const decisionContext = { criteriaWeightingCriteria: criteria, leafCriteria: [] };
const empty = { comparisons: [] };
const complete = {
  comparisons: [
    { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
    { criterionId: "quality", comparedCriterionId: "delivery", value: 1 / 5 },
    { criterionId: "cost", comparedCriterionId: "delivery", value: 2 },
  ],
};

const save = ({ payload, mode = "draft", context = decisionContext }) =>
  saveCriteriaPairwiseAHPPayload({ payload, decisionContext: context, mode });

describe("criteriaPairwiseAHP evaluation structure", () => {
  it("registers criteriaWeighting get, save and ID-remapping operations", () => {
    expect(criteriaPairwiseAHPStructure).toMatchObject({
      key: "criteriaPairwiseAHP",
      stage: "criteriaWeighting",
      get: getCriteriaPairwiseAHPPayload,
      save: saveCriteriaPairwiseAHPPayload,
      remapCriterionIds: remapCriteriaPairwiseAHPCriterionIds,
    });
  });

  it("builds an empty draft and keeps comparisons independent of matrix order", async () => {
    await expect(
      getCriteriaPairwiseAHPPayload({ payload: undefined, decisionContext })
    ).resolves.toEqual(empty);

    const reversedContext = {
      criteriaWeightingCriteria: [...criteria].reverse(),
    };
    const readBack = await getCriteriaPairwiseAHPPayload({
      payload: complete,
      decisionContext: reversedContext,
    });
    expect(new Set(readBack.comparisons.map((item) => JSON.stringify(item)))).toEqual(
      new Set(complete.comparisons.map((item) => JSON.stringify(item)))
    );
  });

  it("accepts drafts and complete submit payloads, normalizing string values", async () => {
    await expect(save({ payload: empty })).resolves.toEqual(empty);
    const payload = structuredClone(complete);
    payload.comparisons[0].value = "3";
    await expect(save({ payload, mode: "submit" })).resolves.toEqual(complete);
  });

  it.each(["extra", "weightsByCriterion"]) (
    "rejects unsupported top-level field %s",
    async (field) => {
      await expect(save({ payload: { ...complete, [field]: {} } })).rejects.toMatchObject({
        field: "payload.comparisons",
      });
    }
  );

  it.each([
    { criterionId: "unknown", comparedCriterionId: "cost", value: 3 },
    { criterionId: "cost", comparedCriterionId: "cost", value: 3 },
    { criterionId: "quality", comparedCriterionId: "cost", value: 1.5 },
    { criterionId: "quality", comparedCriterionId: "cost", value: 0 },
    { criterionId: "quality", comparedCriterionId: "cost", value: Infinity },
  ])("rejects invalid or out-of-scale judgments", async (comparison) => {
    await expect(save({ payload: { comparisons: [comparison] } })).rejects.toBeDefined();
  });

  it("rejects a duplicate unordered pair, including its reverse orientation", async () => {
    await expect(
      save({
        payload: {
          comparisons: [
            { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
            { criterionId: "cost", comparedCriterionId: "quality", value: 1 / 3 },
          ],
        },
      })
    ).rejects.toMatchObject({ field: "payload.comparisons[1]" });
  });

  it("requires each independent pair on submit but allows incomplete drafts", async () => {
    const partial = {
      comparisons: complete.comparisons.slice(0, 2),
    };
    await expect(save({ payload: partial })).resolves.toMatchObject(partial);
    await expect(save({ payload: partial, mode: "submit" })).rejects.toMatchObject({
      field: "payload.comparisons",
    });
  });

  it("allows a single criterion with zero comparisons", async () => {
    const context = { criteriaWeightingCriteria: [{ id: "only", name: "Only" }] };
    await expect(
      save({ payload: empty, mode: "submit", context })
    ).resolves.toEqual(empty);
  });

  it("uses hierarchy-selected parent criteria when the weighting context provides them", async () => {
    const parentContext = {
      criteriaWeightingCriteria: [{ id: "parent-a", name: "A" }, { id: "parent-b", name: "B" }],
      leafCriteria: criteria,
    };
    await expect(
      save({
        payload: {
          comparisons: [
            { criterionId: "parent-a", comparedCriterionId: "parent-b", value: 4 },
          ],
        },
        mode: "submit",
        context: parentContext,
      })
    ).resolves.toEqual({
      comparisons: [
        { criterionId: "parent-a", comparedCriterionId: "parent-b", value: 4 },
      ],
    });
  });

  it("remaps both criterion IDs while preserving judgments", () => {
    expect(
      remapCriteriaPairwiseAHPCriterionIds({
        payload: complete,
        criterionIdMap: new Map([
          ["quality", "persisted-quality"],
          ["cost", "persisted-cost"],
          ["delivery", "persisted-delivery"],
        ]),
      })
    ).toEqual({
      comparisons: [
        { criterionId: "persisted-quality", comparedCriterionId: "persisted-cost", value: 3 },
        { criterionId: "persisted-quality", comparedCriterionId: "persisted-delivery", value: 1 / 5 },
        { criterionId: "persisted-cost", comparedCriterionId: "persisted-delivery", value: 2 },
      ],
    });
  });
});
