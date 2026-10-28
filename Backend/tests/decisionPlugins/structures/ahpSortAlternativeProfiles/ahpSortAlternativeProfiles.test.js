import { describe, expect, it } from "vitest";

import {
  EVALUATION_STRUCTURE_REGISTRY,
} from "../../../../modules/decisionPlugins/evaluations/evaluationStructureRegistry.js";
import {
  getAHPSortAlternativeProfilesPayload,
} from "../../../../modules/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/ahpSortAlternativeProfiles.get.js";
import {
  saveAHPSortAlternativeProfilesPayload,
} from "../../../../modules/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/ahpSortAlternativeProfiles.save.js";
import {
  remapAHPSortAlternativeProfilesCriterionIds,
} from "../../../../modules/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/operations/remapCriterionIds.js";
import {
  ahpSortAlternativeProfilesStructure,
} from "../../../../modules/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/index.js";

const categories = [
  { categoryId: "low", label: "Low", order: 0 },
  { categoryId: "medium", label: "Medium", order: 1 },
  { categoryId: "high", label: "High", order: 2 },
];
const profileConfiguration = {
  mode: "central",
  profiles: [
    { profileId: "center-low", categoryId: "low" },
    { profileId: "center-medium", categoryId: "medium" },
    { profileId: "center-high", categoryId: "high" },
  ],
  tiePolicy: "pessimistic",
};
const decisionContext = {
  alternatives: [
    { id: "alternative-a", name: "Alternative A" },
    { id: "alternative-b", name: "Alternative B" },
  ],
  leafCriteria: [
    { id: "criterion-quality", name: "Quality" },
    { id: "criterion-cost", name: "Cost" },
  ],
  modelParameters: {
    orderedCategories: categories,
    ahpSortProfiles: profileConfiguration,
  },
};
const empty = {
  alternativeProfileComparisons: [],
  profileComparisons: [],
};

const fullPayload = (context = decisionContext) => {
  const profiles = context.modelParameters.ahpSortProfiles.profiles;
  const alternatives = context.alternatives;
  const criteria = context.leafCriteria;
  const alternativeProfileComparisons = [];
  const profileComparisons = [];
  for (const criterion of criteria) {
    for (const alternative of alternatives) {
      for (const profile of profiles) {
        alternativeProfileComparisons.push({
          alternativeId: alternative.id,
          criterionId: criterion.id,
          profileId: profile.profileId,
          alternativeToProfile: 3,
        });
      }
    }
    for (let firstIndex = 0; firstIndex < profiles.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < profiles.length; secondIndex += 1) {
        profileComparisons.push({
          criterionId: criterion.id,
          firstProfileId: profiles[firstIndex].profileId,
          secondProfileId: profiles[secondIndex].profileId,
          firstToSecond: 1 / 3,
        });
      }
    }
  }
  return { alternativeProfileComparisons, profileComparisons };
};

const save = ({ payload, mode = "draft", context = decisionContext }) =>
  saveAHPSortAlternativeProfilesPayload({ payload, decisionContext: context, mode });

describe("ahpSortAlternativeProfiles evaluation structure", () => {
  it("registers the alternativeEvaluation get, save and criterion remapping operations", () => {
    expect(EVALUATION_STRUCTURE_REGISTRY.ahpSortAlternativeProfiles).toBe(
      ahpSortAlternativeProfilesStructure
    );
    expect(ahpSortAlternativeProfilesStructure).toMatchObject({
      key: "ahpSortAlternativeProfiles",
      stage: "alternativeEvaluation",
      get: getAHPSortAlternativeProfilesPayload,
      save: saveAHPSortAlternativeProfilesPayload,
      remapCriterionIds: remapAHPSortAlternativeProfilesCriterionIds,
    });
  });

  it("returns empty drafts without creating implicit comparisons", async () => {
    await expect(
      getAHPSortAlternativeProfilesPayload({ payload: null, decisionContext })
    ).resolves.toEqual(empty);
    await expect(save({ payload: empty })).resolves.toEqual(empty);
  });

  it("saves partial drafts and recovers their comparisons in deterministic order", async () => {
    const partial = {
      alternativeProfileComparisons: [
        {
          alternativeId: "alternative-b",
          criterionId: "criterion-cost",
          profileId: "center-high",
          alternativeToProfile: "5",
        },
        {
          alternativeId: "alternative-a",
          criterionId: "criterion-quality",
          profileId: "center-low",
          alternativeToProfile: 1 / 5,
        },
      ],
      profileComparisons: [
        {
          criterionId: "criterion-cost",
          firstProfileId: "center-high",
          secondProfileId: "center-low",
          firstToSecond: 1 / 7,
        },
      ],
    };
    const saved = await save({ payload: partial });
    expect(saved).toEqual({
      alternativeProfileComparisons: [
        partial.alternativeProfileComparisons[1],
        { ...partial.alternativeProfileComparisons[0], alternativeToProfile: 5 },
      ],
      profileComparisons: partial.profileComparisons,
    });
    await expect(
      getAHPSortAlternativeProfilesPayload({ payload: saved, decisionContext })
    ).resolves.toEqual(saved);
  });

  it("requires all alternative-profile and unordered profile-pair comparisons on submit", async () => {
    const payload = fullPayload();
    expect(payload.alternativeProfileComparisons).toHaveLength(12);
    expect(payload.profileComparisons).toHaveLength(6);
    await expect(save({ payload, mode: "submit" })).resolves.toEqual(payload);
    await expect(
      save({
        payload: {
          alternativeProfileComparisons: payload.alternativeProfileComparisons.slice(1),
          profileComparisons: payload.profileComparisons,
        },
        mode: "submit",
      })
    ).rejects.toMatchObject({
      field: "payload.alternativeProfileComparisons",
      details: {
        expectedCount: 18,
        receivedCount: 17,
        missingAlternativeComparisonCount: 1,
      },
    });
  });

  it("produces the same stored arrays regardless of comparison arrival order", async () => {
    const payload = fullPayload();
    const reversedPayload = {
      alternativeProfileComparisons: [...payload.alternativeProfileComparisons].reverse(),
      profileComparisons: [...payload.profileComparisons].reverse(),
    };
    await expect(save({ payload: reversedPayload, mode: "submit" })).resolves.toEqual(
      await save({ payload, mode: "submit" })
    );
  });

  it("derives complete coverage from real alternatives, criteria and configured profiles", async () => {
    const context = {
      ...decisionContext,
      alternatives: [decisionContext.alternatives[0]],
      leafCriteria: [decisionContext.leafCriteria[0]],
      modelParameters: {
        ...decisionContext.modelParameters,
        ahpSortProfiles: {
          mode: "limiting",
          profiles: [
            {
              profileId: "low-medium",
              lowerCategoryId: "low",
              upperCategoryId: "medium",
            },
            {
              profileId: "medium-high",
              lowerCategoryId: "medium",
              upperCategoryId: "high",
            },
          ],
        },
      },
    };
    const payload = {
      alternativeProfileComparisons: [
        {
          alternativeId: "alternative-a",
          criterionId: "criterion-quality",
          profileId: "low-medium",
          alternativeToProfile: 2,
        },
        {
          alternativeId: "alternative-a",
          criterionId: "criterion-quality",
          profileId: "medium-high",
          alternativeToProfile: 4,
        },
      ],
      profileComparisons: [
        {
          criterionId: "criterion-quality",
          firstProfileId: "medium-high",
          secondProfileId: "low-medium",
          firstToSecond: 1 / 3,
        },
      ],
    };
    expect(await save({ payload, mode: "submit", context })).toEqual(payload);
  });

  it.each([
    1 / 9,
    1 / 8,
    1 / 7,
    1 / 6,
    1 / 5,
    1 / 4,
    1 / 3,
    1 / 2,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
  ])("accepts Saaty value %s and preserves its orientation", async (value) => {
    const context = {
      alternatives: [{ id: "a", name: "A" }],
      leafCriteria: [{ id: "c", name: "Criterion" }],
      modelParameters: {
        orderedCategories: categories.slice(0, 2),
        ahpSortProfiles: {
          mode: "limiting",
          profiles: [
            { profileId: "low-medium", lowerCategoryId: "low", upperCategoryId: "medium" },
          ],
        },
      },
    };
    await expect(
      save({
        context,
        mode: "submit",
        payload: {
          alternativeProfileComparisons: [
            { alternativeId: "a", criterionId: "c", profileId: "low-medium", alternativeToProfile: value },
          ],
          profileComparisons: [],
        },
      })
    ).resolves.toMatchObject({
      alternativeProfileComparisons: [{ alternativeToProfile: value }],
    });
  });

  it("canonicalizes tolerated numeric strings to exact Saaty values without changing orientation", async () => {
    const result = await save({
      payload: {
        alternativeProfileComparisons: [
          {
            alternativeId: "alternative-a",
            criterionId: "criterion-quality",
            profileId: "center-low",
            alternativeToProfile: " 0.3333333333333 ",
          },
          {
            alternativeId: "alternative-b",
            criterionId: "criterion-cost",
            profileId: "center-high",
            alternativeToProfile: "3.0000000000005",
          },
        ],
        profileComparisons: [
          {
            criterionId: "criterion-quality",
            firstProfileId: "center-high",
            secondProfileId: "center-low",
            firstToSecond: "0.3333333333333",
          },
        ],
      },
    });

    expect(result.alternativeProfileComparisons).toEqual([
      {
        alternativeId: "alternative-a",
        criterionId: "criterion-quality",
        profileId: "center-low",
        alternativeToProfile: 1 / 3,
      },
      {
        alternativeId: "alternative-b",
        criterionId: "criterion-cost",
        profileId: "center-high",
        alternativeToProfile: 3,
      },
    ]);
    expect(result.profileComparisons).toEqual([
      {
        criterionId: "criterion-quality",
        firstProfileId: "center-high",
        secondProfileId: "center-low",
        firstToSecond: 1 / 3,
      },
    ]);
  });

  it.each([1.5, 0, -1, 10, "", "1/3", "0.3333333", Infinity, NaN])(
    "rejects a comparison outside Saaty's 17 values: %s",
    async (value) => {
      const payload = fullPayload();
      payload.alternativeProfileComparisons[0].alternativeToProfile = value;
      await expect(save({ payload })).rejects.toMatchObject({
        field: "payload.alternativeProfileComparisons[0].alternativeToProfile",
      });
    }
  );

  it("rejects reverse-orientation duplicates for the same unordered profile pair", async () => {
    const payload = fullPayload();
    payload.profileComparisons.push({
      criterionId: "criterion-quality",
      firstProfileId: "center-high",
      secondProfileId: "center-low",
      firstToSecond: 3,
    });
    await expect(save({ payload })).rejects.toMatchObject({
      field: "payload.profileComparisons[6]",
    });
  });

  it("preserves an inverse-oriented profile comparison instead of rewriting its direction", async () => {
    const payload = fullPayload();
    payload.profileComparisons = [
      {
        criterionId: "criterion-quality",
        firstProfileId: "center-high",
        secondProfileId: "center-low",
        firstToSecond: 1 / 7,
      },
    ];
    const result = await save({ payload });
    expect(result.profileComparisons[0]).toEqual(payload.profileComparisons[0]);
  });

  it.each([
    ["unknown alternative", "alternativeId", "unknown-alt"],
    ["unknown criterion", "criterionId", "unknown-criterion"],
    ["unconfigured profile", "profileId", "removed-profile"],
  ])("rejects an %s reference", async (_label, field, value) => {
    const payload = fullPayload();
    payload.alternativeProfileComparisons[0][field] = value;
    await expect(save({ payload })).rejects.toBeDefined();
  });

  it("rejects duplicate alternative-profile comparisons and profile self-comparisons", async () => {
    const payload = fullPayload();
    payload.alternativeProfileComparisons.push(
      payload.alternativeProfileComparisons[0]
    );
    await expect(save({ payload })).rejects.toMatchObject({
      field: "payload.alternativeProfileComparisons[12]",
    });

    const selfComparison = fullPayload();
    selfComparison.profileComparisons[0].secondProfileId =
      selfComparison.profileComparisons[0].firstProfileId;
    await expect(save({ payload: selfComparison })).rejects.toMatchObject({
      field: "payload.profileComparisons[0]",
    });
  });

  it("rejects stale profile references when the saved Issue configuration changed", async () => {
    const changedContext = {
      ...decisionContext,
      modelParameters: {
        ...decisionContext.modelParameters,
        ahpSortProfiles: {
          ...profileConfiguration,
          profiles: profileConfiguration.profiles.map((profile) => ({
            ...profile,
            profileId: `new-${profile.profileId}`,
          })),
        },
      },
    };
    await expect(
      getAHPSortAlternativeProfilesPayload({
        payload: fullPayload(),
        decisionContext: changedContext,
      })
    ).rejects.toMatchObject({ field: "payload.alternativeProfileComparisons[0].profileId" });
  });

  it("rejects absent or extra payload fields rather than creating implicit judgments", async () => {
    await expect(save({ payload: { alternativeProfileComparisons: [] } })).rejects.toMatchObject({
      field: "payload.profileComparisons",
    });
    await expect(save({ payload: { ...empty, defaultValues: [] } })).rejects.toMatchObject({
      field: "payload.defaultValues",
    });
  });

  it("remaps criterion IDs in both arrays and preserves all judgments and profile IDs", () => {
    const payload = {
      alternativeProfileComparisons: [
        { alternativeId: "a", criterionId: "temporary-c", profileId: "center-low", alternativeToProfile: 5 },
      ],
      profileComparisons: [
        { criterionId: "temporary-c", firstProfileId: "center-high", secondProfileId: "center-low", firstToSecond: 1 / 7 },
      ],
    };
    expect(
      remapAHPSortAlternativeProfilesCriterionIds({
        payload,
        criterionIdMap: new Map([["temporary-c", "mongo-c"]]),
      })
    ).toEqual({
      alternativeProfileComparisons: [
        { ...payload.alternativeProfileComparisons[0], criterionId: "mongo-c" },
      ],
      profileComparisons: [
        { ...payload.profileComparisons[0], criterionId: "mongo-c" },
      ],
    });
  });

  it("rejects criterion remapping when a source ID has no persisted mapping", () => {
    expect(() =>
      remapAHPSortAlternativeProfilesCriterionIds({
        payload: {
          alternativeProfileComparisons: [
            { alternativeId: "a", criterionId: "missing", profileId: "p", alternativeToProfile: 1 },
          ],
          profileComparisons: [],
        },
        criterionIdMap: new Map(),
      })
    ).toThrow("Unable to remap AHPSort I evaluation to persisted criteria");
  });
});
