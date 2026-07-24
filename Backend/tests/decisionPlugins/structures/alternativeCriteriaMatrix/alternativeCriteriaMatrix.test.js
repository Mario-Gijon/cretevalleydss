import { describe, expect, it } from "vitest";

import { getAlternativeCriteriaMatrixPayload } from "../../../../modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/alternativeCriteriaMatrix.get.js";
import { saveAlternativeCriteriaMatrixPayload } from "../../../../modules/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/alternativeCriteriaMatrix.save.js";

const numericDomain = {
  typeKey: "numericContinuous",
  definition: {
    min: 0,
    max: 10,
  },
};

const ordinalDomain = {
  typeKey: "linguisticOrdinal",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "high", label: "High", index: 1 },
    ],
  },
};

const buildDecisionContext = (expressionDomain = numericDomain) => ({
  alternatives: [
    { id: "alternative1", name: "Alternative 1" },
    { id: "alternative2", name: "Alternative 2" },
  ],
  leafCriteria: [
    {
      id: "criterion1",
      name: "Criterion 1",
      expressionDomain,
    },
  ],
});

const buildPayload = (firstValue = 7.5, secondValue = 6.5) => ({
  alternative1: {
    criterion1: firstValue,
  },
  alternative2: {
    criterion1: secondValue,
  },
});

describe("alternativeCriteriaMatrix payload", () => {
  it("builds a complete direct draft matrix only when GET receives no payload", async () => {
    await expect(
      getAlternativeCriteriaMatrixPayload({
        payload: null,
        decisionContext: buildDecisionContext(),
      })
    ).resolves.toEqual(buildPayload("", ""));
  });

  it("returns validated existing GET payload values without changing the direct shape", async () => {
    await expect(
      getAlternativeCriteriaMatrixPayload({
        payload: buildPayload(7.5, 6.5),
        decisionContext: buildDecisionContext(),
      })
    ).resolves.toEqual(buildPayload(7.5, 6.5));
  });

  it("allows only the empty string as a missing draft value", async () => {
    await expect(
      saveAlternativeCriteriaMatrixPayload({
        payload: buildPayload("", 6.5),
        decisionContext: buildDecisionContext(),
        mode: "draft",
      })
    ).resolves.toEqual(buildPayload("", 6.5));

    for (const invalidValue of [null, undefined]) {
      const payload = buildPayload();
      payload.alternative1.criterion1 = invalidValue;

      await expect(
        saveAlternativeCriteriaMatrixPayload({
          payload,
          decisionContext: buildDecisionContext(),
          mode: "draft",
        })
      ).rejects.toThrow("Matrix evaluation value is invalid.");
    }
  });

  it("requires every direct value on submit", async () => {
    await expect(
      saveAlternativeCriteriaMatrixPayload({
        payload: buildPayload(),
        decisionContext: buildDecisionContext(),
        mode: "submit",
      })
    ).resolves.toEqual(buildPayload());

    await expect(
      saveAlternativeCriteriaMatrixPayload({
        payload: buildPayload("", 6.5),
        decisionContext: buildDecisionContext(),
        mode: "submit",
      })
    ).rejects.toThrow(
      "All matrix evaluations must include a value for submit."
    );
  });

  it("normalizes complex direct values through the criterion expression domain", async () => {
    await expect(
      saveAlternativeCriteriaMatrixPayload({
        payload: buildPayload(
          { labelKey: "high" },
          { labelKey: "low" }
        ),
        decisionContext: buildDecisionContext(ordinalDomain),
        mode: "submit",
      })
    ).resolves.toEqual(
      buildPayload({ labelKey: "high" }, { labelKey: "low" })
    );
  });

  it("rejects missing and unknown alternative rows", async () => {
    await expect(
      saveAlternativeCriteriaMatrixPayload({
        payload: {
          alternative1: { criterion1: 7.5 },
        },
        decisionContext: buildDecisionContext(),
        mode: "submit",
      })
    ).rejects.toThrow("payload is missing an alternative row.");

    await expect(
      saveAlternativeCriteriaMatrixPayload({
        payload: {
          ...buildPayload(),
          unknownAlternative: { criterion1: 1 },
        },
        decisionContext: buildDecisionContext(),
        mode: "submit",
      })
    ).rejects.toThrow("payload contains unknown alternative rows");
  });

  it("rejects missing and unknown criterion values", async () => {
    await expect(
      saveAlternativeCriteriaMatrixPayload({
        payload: {
          alternative1: {},
          alternative2: { criterion1: 6.5 },
        },
        decisionContext: buildDecisionContext(),
        mode: "submit",
      })
    ).rejects.toThrow(
      "Alternative criteria row is missing a criterion cell."
    );

    await expect(
      saveAlternativeCriteriaMatrixPayload({
        payload: {
          alternative1: {
            criterion1: 7.5,
            unknownCriterion: 1,
          },
          alternative2: { criterion1: 6.5 },
        },
        decisionContext: buildDecisionContext(),
        mode: "submit",
      })
    ).rejects.toThrow(
      "Alternative criteria row contains unknown criterion cells."
    );
  });

  it("rejects malformed payload rows and invalid domain values", async () => {
    await expect(
      saveAlternativeCriteriaMatrixPayload({
        payload: [],
        decisionContext: buildDecisionContext(),
        mode: "submit",
      })
    ).rejects.toThrow("payload must be an object");

    await expect(
      saveAlternativeCriteriaMatrixPayload({
        payload: {
          alternative1: 7.5,
          alternative2: { criterion1: 6.5 },
        },
        decisionContext: buildDecisionContext(),
        mode: "submit",
      })
    ).rejects.toThrow("Alternative criteria row must be an object.");

    await expect(
      saveAlternativeCriteriaMatrixPayload({
        payload: buildPayload(20, 6.5),
        decisionContext: buildDecisionContext(),
        mode: "submit",
      })
    ).rejects.toThrow();
  });

  it("requires canonical decisionContext ids without _id fallbacks", async () => {
    const decisionContext = buildDecisionContext();
    decisionContext.alternatives[0] = {
      _id: "alternative1",
      name: "Alternative 1",
    };

    await expect(
      getAlternativeCriteriaMatrixPayload({
        payload: null,
        decisionContext,
      })
    ).rejects.toThrow("Evaluation structure alternative is invalid");
  });
});
