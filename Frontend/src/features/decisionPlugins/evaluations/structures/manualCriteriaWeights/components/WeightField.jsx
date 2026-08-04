import { Chip, Stack, TextField, Typography } from "@mui/material";

import { formatCollectiveDisplayValue } from "../../../shared/formatCollectiveDisplayValue";
import { weightFieldSx } from "../styles/WeightField.styles";

const preventInvalidNumberKeys = (event) => {
  if (["e", "E", "+", "-", ","].includes(event.key)) {
    event.preventDefault();
  }
};

const WeightField = ({
  criterion,
  value,
  collectiveValue,
  permitEdit,
  onChange,
}) => (
  <Stack
    direction={{ xs: "column", md: "row" }}
    spacing={1}
    alignItems={{ xs: "stretch", md: "center" }}
  >
    <Typography variant="body2" sx={weightFieldSx.label}>
      {criterion.name}
    </Typography>
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={weightFieldSx.values}
    >
      <TextField
        type="number"
        size="small"
        color="secondary"
        variant="outlined"
        disabled={!permitEdit}
        value={value}
        onKeyDown={preventInvalidNumberKeys}
        onChange={(event) => onChange(event.target.value)}
        inputProps={{ min: 0, max: 1, step: 0.01 }}
        sx={weightFieldSx.input}
      />
      {collectiveValue !== null ? (
        <Chip
          size="small"
          color="secondary"
          variant="outlined"
          label={`Collective ${formatCollectiveDisplayValue(collectiveValue)}`}
          sx={weightFieldSx.collectiveChip}
        />
      ) : null}
    </Stack>
  </Stack>
);

export default WeightField;
