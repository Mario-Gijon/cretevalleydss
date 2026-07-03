import { Stack, TextField } from "@mui/material";
import {
  normalizeDraftName,
  normalizeDraftNumber,
} from "../../helpers";

const buildNextValue = (value, patch) => {
  const definition = value?.definition && typeof value.definition === "object"
    ? value.definition
    : {};

  return {
    ...value,
    name: normalizeDraftName(value?.name),
    typeKey: "numericContinuous",
    definition: {
      min: normalizeDraftNumber(definition.min),
      max: normalizeDraftNumber(definition.max),
      ...patch.definition,
    },
    ...patch,
  };
};

export const NumericContinuousCreationForm = ({
  value,
  onChange,
  disabled = false,
}) => {
  const definition = value?.definition && typeof value.definition === "object"
    ? value.definition
    : {};

  const updateValue = (patch) => {
    onChange?.(buildNextValue(value, patch));
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="Name"
        value={normalizeDraftName(value?.name)}
        onChange={(event) => updateValue({ name: event.target.value })}
        disabled={disabled}
        fullWidth
      />

      <TextField
        label="Min"
        type="number"
        value={definition.min ?? ""}
        onChange={(event) =>
          updateValue({
            definition: {
              min: normalizeDraftNumber(event.target.value),
            },
          })}
        disabled={disabled}
        fullWidth
      />

      <TextField
        label="Max"
        type="number"
        value={definition.max ?? ""}
        onChange={(event) =>
          updateValue({
            definition: {
              max: normalizeDraftNumber(event.target.value),
            },
          })}
        disabled={disabled}
        fullWidth
      />
    </Stack>
  );
};

export default NumericContinuousCreationForm;

