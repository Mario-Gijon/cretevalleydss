import { useEffect, useMemo, useState } from "react";
import { TextField } from "@mui/material";

const normalizeDefinition = (expressionDomain) =>
  expressionDomain?.definition && typeof expressionDomain.definition === "object"
    ? expressionDomain.definition
    : {};

const isIntermediateNumericText = (value) =>
  value === "." || value === "-" || value === "+" || value === "-." || value === "+.";

const parseNumericInput = (rawValue) => {
  const text = String(rawValue ?? "");

  if (text === "") {
    return { kind: "empty", value: "" };
  }

  if (isIntermediateNumericText(text)) {
    return { kind: "intermediate", value: text };
  }

  const parsed = Number(text);

  if (Number.isFinite(parsed)) {
    return { kind: "number", value: parsed };
  }

  return { kind: "invalid", value: text };
};

const buildRangeHelperText = ({ min, max }) => {
  if (Number.isFinite(min) && Number.isFinite(max)) {
    return `Value must be between ${min} and ${max}.`;
  }

  if (Number.isFinite(min)) {
    return `Value must be at least ${min}.`;
  }

  if (Number.isFinite(max)) {
    return `Value must be at most ${max}.`;
  }

  return "";
};

export const NumericContinuousEvaluationInput = ({
  expressionDomain,
  value,
  onChange,
  disabled = false,
  error = false,
  helperText = "",
}) => {
  const definition = normalizeDefinition(expressionDomain);
  const [rawValue, setRawValue] = useState(value === "" ? "" : String(value ?? ""));

  useEffect(() => {
    setRawValue(value === "" ? "" : String(value ?? ""));
  }, [value]);

  const parsedState = useMemo(() => parseNumericInput(rawValue), [rawValue]);
  const min = Number.isFinite(definition.min) ? definition.min : undefined;
  const max = Number.isFinite(definition.max) ? definition.max : undefined;
  const numericValue =
    parsedState.kind === "number" ? parsedState.value : null;
  const isOutOfRange =
    numericValue !== null &&
    ((min !== undefined && numericValue < min) ||
      (max !== undefined && numericValue > max));
  const localHelperText =
    isOutOfRange
      ? buildRangeHelperText({ min, max })
      : parsedState.kind === "invalid"
        ? "Enter a valid number."
        : "";

  return (
    <TextField
      type="number"
      color="info"
      value={rawValue}
      onChange={(event) => {
        const nextRawValue = event.target.value;
        setRawValue(nextRawValue);

        const nextParsedState = parseNumericInput(nextRawValue);

        if (nextParsedState.kind === "number" || nextParsedState.kind === "empty") {
          onChange?.(nextParsedState.value);
        }
      }}
      disabled={disabled}
      error={Boolean(error) || Boolean(localHelperText)}
      helperText={localHelperText || helperText}
      fullWidth
      inputProps={{
        min,
        max,
      }}
    />
  );
};

export default NumericContinuousEvaluationInput;
