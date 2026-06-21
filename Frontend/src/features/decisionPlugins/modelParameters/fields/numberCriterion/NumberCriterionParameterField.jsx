import { Box, Stack, TextField, Typography } from "@mui/material";
import { isPlainObject } from "../../../../modelParameters/logic/isPlainObject";
import {
  buildCriterionParameterRows,
  resolveCriterionRowValue,
} from "../../../../modelParameters/logic/modelParameterCriteria";

const FIELD_HEIGHT = 36;

const labelSx = {
  display: "block",
  color: "text.secondary",
  fontWeight: 700,
  whiteSpace: "normal",
  lineHeight: 1,
  textAlign: "center",
};

const titleSx = {
  color: "text.primary",
  fontWeight: 800,
  mb: 0.5,
};

const textFieldSx = {
  width: 96,
  "& .MuiOutlinedInput-root": {
    height: FIELD_HEIGHT,
  },
  "& input": {
    py: 0,
  },
};

const normalizeNumberInput = (rawValue) => {
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    return "";
  }

  const normalized = String(rawValue).replace(",", ".");
  const clean = normalized.replace(/[^0-9.-]/g, "");

  const startsWithMinus = clean.startsWith("-");
  const withoutExtraMinus = clean.replace(/-/g, "");
  const [integerPart = "", ...decimalParts] = withoutExtraMinus.split(".");
  const decimalPart = decimalParts.join("");

  const sign = startsWithMinus ? "-" : "";

  if (!normalized.includes(".")) {
    return `${sign}${integerPart}`;
  }

  return `${sign}${integerPart}.${decimalPart}`;
};

export const NumberCriterionParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
  parameterContext,
}) => {
  const rows = buildCriterionParameterRows({ parameterContext });
  const { label, default: defaultValue = "", restrictions = {} } = parameter;

  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 750 }}>
        No criteria available for {label}.
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography variant="body2" sx={titleSx}>
        {label}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${rows.length}, max-content)`,
          columnGap: 1,
          rowGap: 0.75,
          alignItems: "start",
          width: "fit-content",
          maxWidth: "100%",
          overflowX: "auto",
        }}
      >
        {rows.map((row) => (
          <Typography key={`label-${row.key}`} variant="caption" sx={labelSx}>
            {row.name}
          </Typography>
        ))}

        {rows.map((row) => (
          <TextField
            key={`input-${row.key}`}
            type="text"
            variant="outlined"
            color="secondary"
            size="small"
            value={resolveCriterionRowValue({
              value,
              defaultValue,
              rowKey: row.key,
            })}
            onChange={(event) => {
              const previous = isPlainObject(value) ? value : {};
              onChange({
                ...previous,
                [row.key]: normalizeNumberInput(event.target.value),
              });
            }}
            inputProps={{
              min: restrictions.min ?? undefined,
              max: restrictions.max ?? undefined,
            }}
            sx={textFieldSx}
            disabled={disabled}
            error={Boolean(error)}
          />
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

export default NumberCriterionParameterField;
