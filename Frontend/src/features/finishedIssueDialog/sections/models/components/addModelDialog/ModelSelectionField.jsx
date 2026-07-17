import {
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";

import { addModelOptionSx } from "../../addModelDialog.styles.js";

const MODEL_LABEL_ID = "models-dialog-model-label";

const ModelSelectionField = ({
  modelOptions,
  selectedModel,
  selectedModelCompatible,
  selectedModelId,
  selectedModelReason,
  onChange,
}) => (
  <>
    <FormControl color="secondary" fullWidth>
      <InputLabel id={MODEL_LABEL_ID}>Model</InputLabel>
      <Select
        color="secondary"
        labelId={MODEL_LABEL_ID}
        label="Model"
        value={selectedModelId}
        onChange={(event) => onChange(event.target.value)}
      >
        {modelOptions.map((option) => (
          <MenuItem
            key={option.id}
            value={option.id}
            disabled={!option.compatible}
            title={option.compatible ? undefined : option.reason || "Disabled"}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={addModelOptionSx}
            >
              <Typography noWrap sx={{ minWidth: 0, flex: 1 }}>
                {option.name}
              </Typography>
              <Chip
                size="small"
                color={option.statusColor}
                variant="outlined"
                label={option.statusLabel}
              />
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </FormControl>

    {selectedModel && !selectedModelCompatible ? (
      <Typography color="error" variant="caption">
        {selectedModelReason ||
          "Selected model is not compatible with this issue scenario."}
      </Typography>
    ) : null}
  </>
);

export default ModelSelectionField;
