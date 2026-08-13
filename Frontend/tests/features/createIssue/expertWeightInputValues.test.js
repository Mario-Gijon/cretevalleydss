import { describe, expect, it } from "vitest";

import {
  buildExpertWeightInputValues,
  commitExpertWeightInputValue,
  formatExpertWeightInputValue,
  haveExpertWeightInputsChanged,
  normalizeExpertWeightInput,
  toExpertWeightStateValue,
} from "../../../src/features/createIssue/experts/logic/expertWeightInputValues.js";

describe("expertWeightInputValues", () => {
  it("formats finite values with at most three decimal places", () => {
    expect(formatExpertWeightInputValue(0.5)).toBe("0.5");
    expect(formatExpertWeightInputValue(0.1254)).toBe("0.125");
    expect(formatExpertWeightInputValue(1)).toBe("1");
    expect(formatExpertWeightInputValue("")).toBe("");
    expect(formatExpertWeightInputValue("not-a-number")).toBe("");
  });

  it("normalizes valid in-progress input without discarding its editing state", () => {
    expect(normalizeExpertWeightInput(" 0,25 ")).toBe("0.25");
    expect(normalizeExpertWeightInput(".5")).toBe("0.5");
    expect(normalizeExpertWeightInput("0.")).toBe("0.");
    expect(normalizeExpertWeightInput("")).toBe("");
  });

  it("rejects invalid, out-of-range, and over-precise input", () => {
    expect(normalizeExpertWeightInput("weight")).toBeNull();
    expect(normalizeExpertWeightInput("2")).toBeNull();
    expect(normalizeExpertWeightInput("1.001")).toBeNull();
    expect(normalizeExpertWeightInput("0.1234")).toBeNull();
  });

  it("converts only complete input to the numeric state value", () => {
    expect(toExpertWeightStateValue("0.375")).toBe(0.375);
    expect(toExpertWeightStateValue("0.")).toBe("");
    expect(toExpertWeightStateValue("")).toBe("");
  });

  it("commits trailing decimal points and formats the final input", () => {
    expect(commitExpertWeightInputValue("0.")).toBe("0");
    expect(commitExpertWeightInputValue("0.500")).toBe("0.5");
    expect(commitExpertWeightInputValue("")).toBe("");
  });

  it("synchronizes weights while preserving the actively edited input", () => {
    expect(
      buildExpertWeightInputValues(
        ["first@example.com", "second@example.com"],
        {
          "first@example.com": 0.5,
          "second@example.com": 0.5,
          "removed@example.com": 0,
        },
        "first@example.com",
        { "first@example.com": "0." }
      )
    ).toEqual({
      "first@example.com": "0.",
      "second@example.com": "0.5",
    });
  });

  it("detects changed keys and values in synchronized inputs", () => {
    expect(
      haveExpertWeightInputsChanged(
        { "first@example.com": "0.5" },
        { "first@example.com": "0.5" }
      )
    ).toBe(false);
    expect(
      haveExpertWeightInputsChanged(
        { "first@example.com": "0.5" },
        { "first@example.com": "0.4" }
      )
    ).toBe(true);
    expect(
      haveExpertWeightInputsChanged(
        { "first@example.com": "0.5" },
        {
          "first@example.com": "0.5",
          "second@example.com": "0.5",
        }
      )
    ).toBe(true);
  });
});
