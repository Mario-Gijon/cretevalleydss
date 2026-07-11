import { Grid2, TextField } from "@mui/material";
import {
  normalizeDraftName,
  normalizeDraftNumber,
} from "../../expressionDomainFormFields";

const buildNextValue = (value, patch) => {
  const definition = value?.definition && typeof value.definition === "object"
    ? value.definition
    : {};
  const patchDefinition =
    patch?.definition && typeof patch.definition === "object"
      ? patch.definition
      : {};

  return {
    ...value,
    ...patch,
    name: normalizeDraftName(patch?.name ?? value?.name),
    typeKey: "numericDiscrete",
    definition: {
      min: normalizeDraftNumber(definition.min),
      max: normalizeDraftNumber(definition.max),
      step: normalizeDraftNumber(definition.step),
      ...patchDefinition,
    },
  };
};

export const NumericDiscreteCreationForm = ({
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
    <Grid2 container spacing={1.25}>
      <Grid2 size={{ xs: 12, md: 6 }}>
        <TextField
          label="Name"
          color="info"
          size="small"
          value={normalizeDraftName(value?.name)}
          onChange={(event) => updateValue({ name: event.target.value })}
          disabled={disabled}
          fullWidth
        />
      </Grid2>

      <Grid2 size={{ xs: 12, sm: 4, md: 2 }}>
        <TextField
          label="Min"
          color="info"
          size="small"
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
      </Grid2>

      <Grid2 size={{ xs: 12, sm: 4, md: 2 }}>
        <TextField
          label="Max"
          color="info"
          size="small"
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
      </Grid2>

      <Grid2 size={{ xs: 12, sm: 4, md: 2 }}>
        <TextField
          label="Step"
          color="info"
          size="small"
          type="number"
          value={definition.step ?? ""}
          onChange={(event) =>
            updateValue({
              definition: {
                step: normalizeDraftNumber(event.target.value),
              },
            })}
          disabled={disabled}
          fullWidth
        />
      </Grid2>
    </Grid2>
  );
};

export default NumericDiscreteCreationForm;
