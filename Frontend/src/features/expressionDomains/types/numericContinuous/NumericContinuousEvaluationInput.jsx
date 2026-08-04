import { useEffect, useMemo, useState } from "react";
import { TextField } from "@mui/material";

import { validateNumericContinuousEvaluation } from "./evaluation";

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

const countDecimalPlaces = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return Number.POSITIVE_INFINITY;
  }

  const match = String(value).match(/(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
  const fractionalLength = match?.[1]?.length ?? 0;
  const exponent = Number(match?.[2] ?? 0);

  return Math.max(0, fractionalLength - exponent);
};

const formatReadOnlyValue = ({ value, maxDecimalPlaces }) => {
  const text = String(value ?? "");
  const decimalIndex = text.indexOf(".");

  if (decimalIndex < 0) {
    return text;
  }

  const fractionalPart = text.slice(decimalIndex + 1);

  if (fractionalPart.length <= maxDecimalPlaces) {
    return text;
  }

  if (maxDecimalPlaces === 0) {
    return `${text.slice(0, decimalIndex)}…`;
  }

  return `${text.slice(0, decimalIndex + maxDecimalPlaces + 1)}…`;
};

const resolveRawValue = ({
  value,
  disabled,
  hasDecimalLimit,
  maxDecimalPlaces,
}) => {
  if (value === "") {
    return "";
  }

  return disabled && hasDecimalLimit
    ? formatReadOnlyValue({
        value,
        maxDecimalPlaces,
      })
    : String(value ?? "");
};

export const NumericContinuousEvaluationInput = ({
  expressionDomain,
  value,
  onChange,
  disabled = false,
  error = false,
  helperText = "",
  showHelperText = true,
  maxDecimalPlaces,
}) => {
  const definition = normalizeDefinition(expressionDomain);
  const hasDecimalLimit =
    Number.isInteger(maxDecimalPlaces) && maxDecimalPlaces >= 0;
  const [rawValue, setRawValue] = useState(() =>
    resolveRawValue({
      value,
      disabled,
      hasDecimalLimit,
      maxDecimalPlaces,
    })
  );

  useEffect(() => {
    setRawValue(
      resolveRawValue({
        value,
        disabled,
        hasDecimalLimit,
        maxDecimalPlaces,
      })
    );
  }, [disabled, hasDecimalLimit, maxDecimalPlaces, value]);

  const parsedState = useMemo(() => parseNumericInput(rawValue), [rawValue]);
  const min = Number.isFinite(definition.min) ? definition.min : undefined;
  const max = Number.isFinite(definition.max) ? definition.max : undefined;
  const localHelperText = useMemo(() => {
    if (parsedState.kind === "invalid") {
      return "Enter a valid number.";
    }

    if (parsedState.kind !== "number") {
      return "";
    }

    try {
      validateNumericContinuousEvaluation({
        value: parsedState.value,
        expressionDomain,
      });
      if (
        hasDecimalLimit &&
        countDecimalPlaces(parsedState.value) > maxDecimalPlaces
      ) {
        return `Use at most ${maxDecimalPlaces} decimal places.`;
      }

      return "";
    } catch (validationError) {
      return validationError instanceof Error ? validationError.message : "Enter a valid number.";
    }
  }, [expressionDomain, hasDecimalLimit, maxDecimalPlaces, parsedState]);
  const resolvedHelperText = showHelperText ? localHelperText || helperText : "";

  return (
    <TextField
      type={disabled && hasDecimalLimit ? "text" : "number"}
      color="info"
      value={rawValue}
      onChange={(event) => {
        const nextRawValue = event.target.value;
        setRawValue(nextRawValue);

        const nextParsedState = parseNumericInput(nextRawValue);

        if (
          nextParsedState.kind === "empty" ||
          (nextParsedState.kind === "number" &&
            (!hasDecimalLimit ||
              countDecimalPlaces(nextParsedState.value) <= maxDecimalPlaces))
        ) {
          onChange?.(nextParsedState.value);
        }
      }}
      disabled={disabled}
      error={Boolean(error) || Boolean(localHelperText)}
      helperText={resolvedHelperText}
      fullWidth
      inputProps={{
        min,
        max,
        step: hasDecimalLimit ? 10 ** -maxDecimalPlaces : undefined,
      }}
    />
  );
};

export default NumericContinuousEvaluationInput;
