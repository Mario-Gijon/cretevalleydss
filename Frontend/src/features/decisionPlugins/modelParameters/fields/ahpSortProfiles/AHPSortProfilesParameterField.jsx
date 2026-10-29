import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { getParameterValueByStructureKey } from "../../../../modelParameters/context";
import { createAHPSortProfilesForMode } from "./ahpSortProfilesValues.js";
import ParameterInfoTooltip from "../../components/ParameterInfoTooltip.jsx";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const AHPSortProfilesParameterField = ({
  value,
  onChange,
  error = "",
  disabled = false,
  showValidation = false,
  parameterContext,
}) => {
  const [pendingMode, setPendingMode] = useState(null);
  const categories = getParameterValueByStructureKey(parameterContext, "orderedCategories");
  const orderedCategories = Array.isArray(categories) ? categories : [];
  const config = isPlainObject(value) ? value : {};
  const profiles = Array.isArray(config.profiles) ? config.profiles : [];
  const mode = config.mode === "limiting" || config.mode === "central" ? config.mode : "";
  const showError = showValidation && Boolean(error);

  const setMode = (nextMode) => {
    onChange(createAHPSortProfilesForMode(nextMode, orderedCategories));
    setPendingMode(null);
  };

  const requestModeChange = (_event, nextMode) => {
    if (!nextMode || disabled || nextMode === mode) return;
    const hasExistingConfiguration = Boolean(
      profiles.length || (isPlainObject(value) && Object.keys(value).length)
    );
    if (hasExistingConfiguration) {
      setPendingMode(nextMode);
      return;
    }
    setMode(nextMode);
  };

  const modeLabel = pendingMode === "central" ? "Central profiles" : "Limiting profiles";
  const description = mode === "limiting"
    ? "Compare alternatives with the boundaries between categories."
    : "Compare alternatives with a representative center for each category.";

  return (
    <Stack spacing={1.15} sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.25} alignItems="center">
        <Typography variant="body2" sx={{ fontWeight: 750 }}>Profile method</Typography>
        <ParameterInfoTooltip
          label="Profile method"
          text="Limiting profiles sit between neighboring categories. Central profiles represent each category."
        />
      </Stack>

      <FormControl disabled={disabled} error={showError} sx={{ minWidth: 0 }}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          color="secondary"
          value={mode}
          onChange={requestModeChange}
          aria-label="AHPSort I profile method"
          sx={{
            display: "flex",
            flexWrap: { xs: "wrap", sm: "nowrap" },
            "& .MuiToggleButton-root": {
              flex: 1,
              minWidth: { xs: "100%", sm: 180 },
              textTransform: "none",
              fontWeight: 700,
            },
          }}
        >
          <ToggleButton value="limiting">Limiting profiles</ToggleButton>
          <ToggleButton value="central">Central profiles</ToggleButton>
        </ToggleButtonGroup>
      </FormControl>

      {mode ? (
        <Typography variant="body2" color="text.secondary" sx={{ display: "block" }}>
          {description}
        </Typography>
      ) : null}
      {showError && error ? (
        <Typography variant="caption" color="error.main" role="alert">{error}</Typography>
      ) : null}

      {pendingMode ? (
        <Dialog
          open
          onClose={() => setPendingMode(null)}
          aria-labelledby="ahpsort-mode-change-title"
        >
          <DialogTitle id="ahpsort-mode-change-title">Change profile method?</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              Switching to {modeLabel} replaces the current profile associations. New profiles will receive new identifiers.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPendingMode(null)}>Cancel</Button>
            <Button color="secondary" variant="outlined" onClick={() => setMode(pendingMode)}>
              Replace profiles
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Stack>
  );
};

export default AHPSortProfilesParameterField;
