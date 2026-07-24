import { Stack, TextField, Typography } from "@mui/material";

const preventInvalidNumberKeys = (event) => {
  if (["e", "E", "+", "-", ".", ","].includes(event.key)) {
    event.preventDefault();
  }
};

const BestWorstComparisonRow = ({
  criterionId,
  criterionName,
  value,
  labelColumnWidth,
  readOnly,
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
      title={criterionName}
      sx={{
        width: { xs: "auto", sm: labelColumnWidth },
        flexShrink: 0,
      }}
    >
      {criterionName}
    </Typography>

    <TextField
      variant="outlined"
      type="number"
      size="small"
      color="info"
      disabled={readOnly}
      value={value ?? ""}
      onKeyDown={preventInvalidNumberKeys}
      onChange={(event) => onChange(criterionId, event.target.value)}
      inputProps={{ min: 1, max: 9, step: 1 }}
      sx={{ width: { xs: "100%", sm: 96 } }}
    />
  </Stack>
);

export default BestWorstComparisonRow;
