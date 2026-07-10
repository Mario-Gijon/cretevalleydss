import { Typography } from "@mui/material";

import { getExpressionDomainType } from "./expressionDomainTypeCatalog";

const buildFallbackMessage = (expressionDomain) => {
  if (
    expressionDomain === null ||
    typeof expressionDomain !== "object" ||
    Array.isArray(expressionDomain)
  ) {
    return "Expression domain is unavailable.";
  }

  const typeKey =
    typeof expressionDomain.typeKey === "string"
      ? expressionDomain.typeKey.trim()
      : "";

  if (!typeKey) {
    return "Expression domain type is unavailable.";
  }

  return `Unsupported expression domain type "${typeKey}".`;
};

const ExpressionDomainEvaluationInput = ({
  expressionDomain,
  value,
  onChange,
  disabled = false,
  error = false,
  helperText = "",
  showHelperText = true,
  fallback = null,
}) => {
  const typeKey =
    typeof expressionDomain?.typeKey === "string"
      ? expressionDomain.typeKey.trim()
      : "";
  const entry = typeKey ? getExpressionDomainType(typeKey) : null;

  if (!entry?.EvaluationInput) {
    if (fallback !== null) {
      return fallback;
    }

    return (
      <Typography variant="body2" color="warning.main">
        {buildFallbackMessage(expressionDomain)}
      </Typography>
    );
  }

  const EvaluationInput = entry.EvaluationInput;

  return (
    <EvaluationInput
      expressionDomain={expressionDomain}
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={error}
      helperText={helperText}
      showHelperText={showHelperText}
    />
  );
};

export default ExpressionDomainEvaluationInput;
