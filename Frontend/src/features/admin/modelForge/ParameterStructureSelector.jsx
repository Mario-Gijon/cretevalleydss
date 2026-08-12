import {
  Alert,
  Autocomplete,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

import { PARAMETER_STRUCTURE_MODES } from "./scaffoldPayloadHelpers.js";

const getOptionLabel = (option) => option?.key || "";

export default function ParameterStructureSelector({
  mode,
  value,
  options,
  error,
  onModeChange,
  onValueChange,
}) {
  const isNew = mode === PARAMETER_STRUCTURE_MODES.NEW;

  return (
    <Stack spacing={0.8}>
      <ToggleButtonGroup
        exclusive
        size="small"
        color="info"
        value={mode}
        onChange={(_event, nextMode) => {
          if (nextMode) onModeChange(nextMode);
        }}
        aria-label="Structure source"
      >
        <ToggleButton value={PARAMETER_STRUCTURE_MODES.EXISTING}>
          Use existing
        </ToggleButton>
        <ToggleButton value={PARAMETER_STRUCTURE_MODES.NEW}>
          Create new
        </ToggleButton>
      </ToggleButtonGroup>

      {isNew ? (
        <>
          <TextField
            label="New structure key"
            size="small"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            error={Boolean(error)}
            helperText={error || "Use lower camelCase."}
            color="info"
            fullWidth
          />
          <Alert severity="info" variant="outlined">
            Model Forge will create a new Backend + Frontend parameter-structure
            scaffold. It remains inactive until implemented, tested and marked ready.
          </Alert>
        </>
      ) : (
        <Autocomplete
          options={options}
          value={options.find((item) => item.key === value) || null}
          onChange={(_event, option) => onValueChange(option?.key || "")}
          getOptionLabel={getOptionLabel}
          isOptionEqualToValue={(option, selected) => option.key === selected.key}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Structure"
              size="small"
              error={Boolean(error)}
              helperText={error || "Choose a runtime-ready parameter structure."}
              color="info"
              fullWidth
            />
          )}
        />
      )}
    </Stack>
  );
}
