import { MenuItem, Stack, TextField, Typography } from "@mui/material";

import ComparisonRow from "./ComparisonRow";
import { comparisonSectionSx } from "../styles/ComparisonSection.styles";

const ComparisonSection = ({
  title,
  selectorLabel,
  selectedCriterionId,
  excludedCriterionId,
  criteria,
  comparisons,
  labelWidth,
  permitEdit,
  onSelect,
  onComparisonChange,
}) => {
  const availableCriteria =
    criteria.length > 1 && excludedCriterionId
      ? criteria.filter((criterion) => criterion.id !== excludedCriterionId)
      : criteria;
  const comparisonCriteria = selectedCriterionId
    ? criteria.filter((criterion) => criterion.id !== selectedCriterionId)
    : [];

  return (
    <Stack spacing={0.75} sx={comparisonSectionSx.container}>
      <TextField
        select
        variant="outlined"
        label={selectorLabel}
        size="small"
        color="info"
        disabled={!permitEdit}
        value={selectedCriterionId}
        onChange={(event) => onSelect(event.target.value)}
      >
        <MenuItem value="">Select criterion</MenuItem>
        {availableCriteria.map((criterion) => (
          <MenuItem key={criterion.id} value={criterion.id}>
            {criterion.name}
          </MenuItem>
        ))}
      </TextField>

      <Typography variant="subtitle1" sx={comparisonSectionSx.title}>
        {title}
      </Typography>

      {selectedCriterionId ? (
        comparisonCriteria.map((criterion) => (
          <ComparisonRow
            key={criterion.id}
            criterion={criterion}
            value={comparisons[criterion.id]}
            labelWidth={labelWidth}
            permitEdit={permitEdit}
            onChange={(value) => onComparisonChange(criterion.id, value)}
          />
        ))
      ) : (
        <Typography variant="body2" sx={comparisonSectionSx.instruction}>
          Select a criterion to enter its comparisons.
        </Typography>
      )}
    </Stack>
  );
};

export default ComparisonSection;
