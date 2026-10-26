import { Box, FormControl, MenuItem, Select, Typography } from "@mui/material";

import { formatJudgment } from "../operations/formatJudgment";
import { judgmentCellSx } from "../styles/CriteriaPairwiseAHPView.styles";

const INTENSITY_LABELS = {
  1: "equal importance",
  2: "between equal and moderate",
  3: "moderately more important",
  4: "between moderate and strong",
  5: "strongly more important",
  6: "between strong and very strong",
  7: "very strongly more important",
  8: "between very strong and extreme",
  9: "extremely more important",
};

const options = [
  ...Array.from({ length: 8 }, (_, index) => {
    const denominator = index + 2;
    const value = 1 / denominator;
    const intensity = denominator;
    return {
      value,
      label: `1/${denominator} · column ${INTENSITY_LABELS[intensity]}`,
      shortLabel: `1/${denominator}`,
    };
  }).reverse(),
  { value: 1, label: "1 · equal importance", shortLabel: "1" },
  ...Array.from({ length: 8 }, (_, index) => {
    const value = index + 2;
    return {
      value,
      label: `${value} · row ${INTENSITY_LABELS[value]}`,
      shortLabel: String(value),
    };
  }),
];

const ComparisonCell = ({
  rowCriterion,
  columnCriterion,
  value,
  diagonal,
  editable,
  permitEdit,
  onChange,
}) => {
  if (diagonal) {
    return (
      <Box sx={judgmentCellSx.fixed} aria-label="Fixed self-comparison: 1">
        1
      </Box>
    );
  }

  if (editable && permitEdit) {
    const inputId = `ahp-${rowCriterion.id}-${columnCriterion.id}`;
    return (
      <FormControl size="small" fullWidth sx={judgmentCellSx.control}>
        <Select
          id={inputId}
          value={value === "" ? "" : String(value)}
          displayEmpty
          color="secondary"
          onChange={(event) =>
            onChange(
              event.target.value === "" ? null : Number(event.target.value)
            )
          }
          inputProps={{
            "aria-label": `Compare ${rowCriterion.name} with ${columnCriterion.name}`,
          }}
          renderValue={(selected) =>
            selected === "" ? (
              <Typography variant="caption" sx={judgmentCellSx.placeholder}>
                Choose
              </Typography>
            ) : (
              <Typography variant="body2" sx={judgmentCellSx.value}>
                {formatJudgment(Number(selected))}
              </Typography>
            )
          }
          MenuProps={{ PaperProps: { sx: judgmentCellSx.menu } }}
        >
          <MenuItem value="">
            <em>Clear comparison</em>
          </MenuItem>
          {options.map((option) => (
            <MenuItem
              key={option.value}
              value={String(option.value)}
              aria-label={option.label}
            >
              <Box sx={judgmentCellSx.option}>
                <Typography variant="body2" sx={judgmentCellSx.optionValue}>
                  {option.shortLabel}
                </Typography>
                <Typography variant="caption" sx={judgmentCellSx.optionLabel}>
                  {option.label.slice(option.label.indexOf("·") + 1).trim()}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  const isDerived = !editable;
  return (
    <Box
      sx={isDerived ? judgmentCellSx.derived : judgmentCellSx.readOnly}
      title={isDerived && value !== "" ? "Reciprocal comparison" : undefined}
      aria-label={
        isDerived
          ? `Reciprocal comparison ${formatJudgment(value) || "not entered"}`
          : `Comparison ${formatJudgment(value) || "not entered"}`
      }
    >
      <Typography variant="body2" sx={judgmentCellSx.value}>
        {formatJudgment(value) || "—"}
      </Typography>
      {isDerived && value !== "" ? (
        <Typography variant="caption" sx={judgmentCellSx.derivedLabel}>
          Reciprocal
        </Typography>
      ) : null}
    </Box>
  );
};

export default ComparisonCell;
