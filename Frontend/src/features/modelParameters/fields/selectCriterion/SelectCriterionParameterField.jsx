import { Box, MenuItem, Stack, TextField, Typography } from "@mui/material";

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
  width: 128,
  "& .MuiOutlinedInput-root": {
    height: FIELD_HEIGHT,
  },
  "& .MuiSelect-select": {
    py: 0,
    display: "flex",
    alignItems: "center",
  },
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const readAllowedValues = (parameter) =>
  Array.isArray(parameter?.restrictions?.allowed) ? parameter.restrictions.allowed : [];

const resolveLeafRows = ({ context }) => {
  const leafCriteria =
    context?.leafCriteria ||
    context?.criteria ||
    context?.leafCriteriaForParams ||
    [];

  return (Array.isArray(leafCriteria) ? leafCriteria : [])
    .map((criterion, index) => {
      const key = String(
        criterion?.id ||
          criterion?._id ||
          criterion?.key ||
          criterion?.name ||
          ""
      ).trim();
      const name = String(criterion?.name || "").trim() || `Criterion ${index + 1}`;
      if (!key && !name) return null;

      return { key, name };
    })
    .filter(Boolean);
};

const resolveCurrentValue = ({ value, parameter, criterionKey }) => {
  if (isPlainObject(value) && Object.prototype.hasOwnProperty.call(value, criterionKey)) {
    return value[criterionKey];
  }

  if (!isPlainObject(value) && value !== undefined && value !== null && value !== "") {
    return value;
  }

  return parameter?.default ?? "";
};

export const SelectCriterionParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
  context,
}) => {
  const rows = resolveLeafRows({ context });
  const allowed = readAllowedValues(parameter);
  const label = parameter?.label || parameter?.key || "Parameter";

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
            select
            variant="outlined"
            color="secondary"
            size="small"
            value={resolveCurrentValue({
              value,
              parameter,
              criterionKey: row.key,
            })}
            onChange={(event) => {
              const previous = isPlainObject(value) ? value : {};
              onChange({
                ...previous,
                [row.key]: event.target.value,
              });
            }}
            sx={textFieldSx}
            disabled={disabled}
            error={Boolean(error)}
          >
            {allowed.map((option) => (
              <MenuItem key={String(option)} value={option}>
                {String(option)}
              </MenuItem>
            ))}
          </TextField>
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

export default SelectCriterionParameterField;
