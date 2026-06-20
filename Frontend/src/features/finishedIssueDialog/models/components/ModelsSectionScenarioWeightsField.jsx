import { Fragment } from "react";
import { Box, Stack, TextField, Typography } from "@mui/material";
import {
  formatScenarioWeightValue,
  modelUsesScenarioCriteriaWeights,
} from "../../logic/buildFinishedScenarioParameters";

const FIELD_HEIGHT = 36;

const labelSx = {
  height: FIELD_HEIGHT,
  display: "flex",
  alignItems: "center",
  color: "text.secondary",
  fontWeight: 750,
  whiteSpace: "nowrap",
  lineHeight: 1,
};

const textFieldSx = {
  width: 100,
  "& .MuiOutlinedInput-root": {
    height: FIELD_HEIGHT,
  },
  "& input": {
    py: 0,
  },
};

const normalizeWeightInput = (rawValue) => {
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    return "";
  }

  const clean = String(rawValue).replace(/[^0-9.]/g, "");
  const [integerPart = "", decimalPart = ""] = clean.split(".");
  if (!clean.includes(".")) {
    return integerPart;
  }

  return `${integerPart}.${decimalPart.slice(0, 3)}`;
};

const ensureWeightsObject = (weights, rows) => {
  const normalized = weights && typeof weights === "object" && !Array.isArray(weights)
    ? { ...weights }
    : {};

  return rows.reduce((accumulator, row) => {
    accumulator[row.key] = normalized[row.key] ?? "";
    return accumulator;
  }, {});
};

const resolveLeafRows = ({ leafCriteria, leafNames }) => {
  const rowsFromCriteria = (Array.isArray(leafCriteria) ? leafCriteria : [])
    .map((criterion, index) => ({
      key: String(criterion?.id || criterion?._id || `criterion-${index}`),
      name:
        typeof criterion?.name === "string" && criterion.name.trim()
          ? criterion.name.trim()
          : `Criterion ${index + 1}`,
    }))
    .filter((row) => Boolean(row.key));

  if (rowsFromCriteria.length > 0) {
    return rowsFromCriteria;
  }

  return (Array.isArray(leafNames) ? leafNames : [])
    .map((leafName, index) => {
      const normalizedName = String(leafName || "").trim();
      if (!normalizedName) return null;
      return {
        key: `leaf-name-${index}`,
        name: normalizedName,
      };
    })
    .filter(Boolean);
};

const ModelsSectionScenarioWeightsField = ({
  model,
  values,
  setValues,
  leafCriteria,
  leafNames,
  error = "",
  onClearError,
}) => {
  if (!modelUsesScenarioCriteriaWeights(model)) {
    return null;
  }

  const rows = resolveLeafRows({ leafCriteria, leafNames });
  if (rows.length === 0) {
    return null;
  }

  const weights = ensureWeightsObject(values?.weights, rows);

  return (
    <Stack spacing={0.75}>
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        Criteria weights
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "max-content max-content",
          columnGap: 1,
          rowGap: 0.75,
          alignItems: "center",
          width: "fit-content",
        }}
      >
        {rows.map((row) => (
          <Fragment key={row.key}>
            <Typography variant="body2" sx={labelSx}>
              {row.name}:
            </Typography>

            <TextField
              type="text"
              variant="outlined"
              color="secondary"
              size="small"
              value={
                typeof weights[row.key] === "string"
                  ? normalizeWeightInput(weights[row.key])
                  : weights[row.key] === "" || weights[row.key] == null
                    ? ""
                    : formatScenarioWeightValue(weights[row.key])
              }
              onChange={(event) => {
                const next = {
                  ...weights,
                  [row.key]: normalizeWeightInput(event.target.value),
                };
                setValues((previous) => ({
                  ...(previous || {}),
                  weights: next,
                }));
                if (onClearError) {
                  onClearError();
                }
              }}
              sx={textFieldSx}
              error={Boolean(error)}
            />
          </Fragment>
        ))}
      </Box>

      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default ModelsSectionScenarioWeightsField;
