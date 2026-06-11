import { Box, Typography } from "@mui/material";
import {
  buildCriterionParameterRows,
  resolveCriterionRowValue,
} from "../../logic/modelParameterCriteria";

const formatValue = (value) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

export const SelectCriterionParameterReadOnly = ({
  parameter,
  value,
  leafCriteria,
  leafNames,
}) => {
  const rows = buildCriterionParameterRows({ leafCriteria, leafNames });

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
          {formatValue(
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

export default SelectCriterionParameterReadOnly;
