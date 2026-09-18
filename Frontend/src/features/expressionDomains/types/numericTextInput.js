const NUMERIC_TEXT_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d*)$/;

const INTERMEDIATE_NUMERIC_TEXT = new Set([".", "-", "+", "-.", "+."]);

export const parseNumericText = (rawValue) => {
  const text = String(rawValue ?? "");

  if (text === "") {
    return { kind: "empty", value: "" };
  }

  if (
    INTERMEDIATE_NUMERIC_TEXT.has(text) ||
    /^[+-]?\d+\.$/.test(text)
  ) {
    return { kind: "intermediate", value: text };
  }

  if (!NUMERIC_TEXT_PATTERN.test(text)) {
    return { kind: "invalid", value: text };
  }

  const parsed = Number(text);

  return Number.isFinite(parsed)
    ? { kind: "number", value: parsed }
    : { kind: "invalid", value: text };
};
