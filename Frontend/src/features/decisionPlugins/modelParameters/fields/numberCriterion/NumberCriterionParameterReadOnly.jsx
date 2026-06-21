import { Box, Typography } from "@mui/material";
import {
  buildCriterionParameterRows,
  resolveCriterionRowValue,
} from "../../../../modelParameters/logic/modelParameterCriteria";

const formatNumber = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return value === null || value === undefined || value === "" ? "—" : String(value);
  }

  return Number(parsed.toFixed(3)).toString();
};

export const NumberCriterionParameterReadOnly = ({
  parameter,
  value,
  parameterContext,
}) => {
  const rows = buildCriterionParameterRows({ parameterContext });

  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 800 }}>
        —
      </Typography>
    );
  }

  return (
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
        <Typography
          key={`label-${row.key}`}
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {row.name}
        </Typography>
      ))}

      {rows.map((row) => (
        <Typography
          key={`value-${row.key}`}
          variant="body2"
          sx={{
            fontWeight: 850,
            whiteSpace: "nowrap",
            textAlign: "center",
          }}
        >
          {formatNumber(
            resolveCriterionRowValue({
              value,
              defaultValue: parameter.default,
              rowKey: row.key,
            })
          )}
        </Typography>
      ))}
    </Box>
  );
};

export default NumberCriterionParameterReadOnly;
