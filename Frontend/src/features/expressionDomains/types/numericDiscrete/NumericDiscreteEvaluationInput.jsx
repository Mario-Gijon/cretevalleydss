import { useEffect, useMemo, useState } from "react";
import { TextField } from "@mui/material";

import { validateNumericDiscreteEvaluation } from "./evaluation";
import { parseNumericText } from "../numericTextInput";

const normalizeDefinition = (expressionDomain) =>
  expressionDomain?.definition && typeof expressionDomain.definition === "object"
    ? expressionDomain.definition
    : {};

export const NumericDiscreteEvaluationInput = ({
  expressionDomain,
  value,
  onChange,
  disabled = false,
  error = false,
  helperText = "",
  showHelperText = true,
}) => {
  const definition = normalizeDefinition(expressionDomain);
  const [rawValue, setRawValue] = useState(value === "" ? "" : String(value ?? ""));

  useEffect(() => {
    setRawValue(value === "" ? "" : String(value ?? ""));
  }, [value]);

  const parsedState = useMemo(() => parseNumericText(rawValue), [rawValue]);
  const min = Number.isFinite(definition.min) ? definition.min : undefined;
  const max = Number.isFinite(definition.max) ? definition.max : undefined;
  const step = Number.isFinite(definition.step) ? definition.step : undefined;
  const localHelperText = useMemo(() => {
    if (parsedState.kind === "invalid") {
      return "Enter a valid number.";
    }

    if (parsedState.kind !== "number") {
      return "";
    }

    try {
      validateNumericDiscreteEvaluation({
        value: parsedState.value,
        expressionDomain,
      });
      return "";
    } catch (validationError) {
      return validationError instanceof Error ? validationError.message : "Enter a valid number.";
    }
  }, [expressionDomain, parsedState]);
  const resolvedHelperText = showHelperText ? localHelperText || helperText : "";

  return (
    <TextField
      type="text"
      color="info"
      value={rawValue}
      onChange={(event) => {
        const nextRawValue = event.target.value;
        const nextParsedState = parseNumericText(nextRawValue);

        if (nextParsedState.kind === "invalid") {
          return;
        }

        setRawValue(nextRawValue);

        if (nextParsedState.kind === "number" || nextParsedState.kind === "empty") {
          onChange?.(nextParsedState.value);
        }
      }}
      disabled={disabled}
      error={Boolean(error) || Boolean(localHelperText)}
      helperText={resolvedHelperText}
      fullWidth
      inputProps={{
        inputMode: "decimal",
        min,
        max,
        step,
      }}
    />
  );
};

export default NumericDiscreteEvaluationInput;
