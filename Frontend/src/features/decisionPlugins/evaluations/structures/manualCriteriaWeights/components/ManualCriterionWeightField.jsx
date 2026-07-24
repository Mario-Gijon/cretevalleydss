import { Chip, Stack, TextField, Typography } from "@mui/material";

const ManualCriterionWeightField = ({
  criterion,
  value,
  collectiveValue,
  readOnly,
  onChange,
}) => (
  <Stack
    direction={{ xs: "column", md: "row" }}
    spacing={1}
    alignItems={{ xs: "stretch", md: "center" }}
  >
    <Typography variant="body2" sx={{ flex: 1, fontWeight: 800 }}>
      {criterion.name}
    </Typography>
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{ minWidth: 0 }}
    >
      <TextField
        type="number"
        size="small"
        color="secondary"
        variant="outlined"
        disabled={readOnly}
        value={value ?? ""}
        onChange={(event) => {
          if (!readOnly) {
            onChange(event.target.value);
          }
        }}
        inputProps={{ min: 0, max: 1, step: 0.1 }}
        sx={{ width: { xs: "100%", md: 150 } }}
      />
      {typeof collectiveValue === "number" ? (
        <Chip
          size="small"
          color="secondary"
          variant="outlined"
          label={`Collective ${collectiveValue}`}
          sx={{
            height: 25,
            fontSize: 10.5,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        />
      ) : null}
    </Stack>
  </Stack>
);

export default ManualCriterionWeightField;
