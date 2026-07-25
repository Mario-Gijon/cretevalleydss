import { Stack, TextField, Typography } from "@mui/material";

import { comparisonRowSx } from "./ComparisonRow.styles";

const preventInvalidNumberKeys = (event) => {
  if (["e", "E", "+", "-", ".", ","].includes(event.key)) {
    event.preventDefault();
  }
};

const ComparisonRow = ({
  criterion,
  value,
  labelWidth,
  permitEdit,
  onChange,
}) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={0.75}
    alignItems={{ xs: "stretch", sm: "center" }}
  >
    <Typography
      variant="body2"
      noWrap
      title={criterion.name}
      sx={comparisonRowSx.label(labelWidth)}
    >
      {criterion.name}
    </Typography>

    <TextField
      variant="outlined"
      type="number"
      size="small"
      color="info"
      disabled={!permitEdit}
      value={value}
      onKeyDown={preventInvalidNumberKeys}
      onChange={(event) => onChange(event.target.value)}
      inputProps={{ min: 1, max: 9, step: 1 }}
      sx={comparisonRowSx.input}
    />
  </Stack>
);

export default ComparisonRow;
