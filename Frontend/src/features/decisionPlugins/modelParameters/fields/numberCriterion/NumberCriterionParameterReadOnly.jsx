import { Box, Typography } from "@mui/material";
import {
  buildNumberCriterionRows,
  resolveNumberCriterionRowValue,
} from "./numberCriterionValues";

const displayValue = (value) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

export const NumberCriterionParameterReadOnly = ({ value, parameterContext }) => {
  const rows = buildNumberCriterionRows(parameterContext);
  if (rows.length === 0) {
    return <Typography variant="body2" sx={{ fontWeight: 800 }}>—</Typography>;
  }

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${rows.length}, max-content)`, columnGap: 1, rowGap: 0.75, alignItems: "start", width: "fit-content", maxWidth: "100%", overflowX: "auto" }}>
      {rows.map((row) => <Typography key={`label-${row.key}`} variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textAlign: "center" }}>{row.name}</Typography>)}
      {rows.map((row) => <Typography key={`value-${row.key}`} variant="body2" sx={{ fontWeight: 850, whiteSpace: "nowrap", textAlign: "center" }}>{displayValue(resolveNumberCriterionRowValue({ value, rowKey: row.key }))}</Typography>)}
    </Box>
  );
};

export default NumberCriterionParameterReadOnly;
