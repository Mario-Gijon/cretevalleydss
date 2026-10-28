import { useId, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { getParameterValueByStructureKey } from "../../../../modelParameters/context";
import {
  createAHPSortProfilesForMode,
  describeAHPSortProfileForDisplay,
} from "./ahpSortProfilesValues.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const getProfileRows = (mode, profiles, categories) => {
  if (!Array.isArray(categories)) return [];
  const active = mode === "central"
    ? categories.map((category) => ({
        key: JSON.stringify([category?.categoryId]),
        profile: profiles.find((item) => item?.categoryId === category?.categoryId),
        label: describeAHPSortProfileForDisplay("central", { categoryId: category?.categoryId }, categories),
        secondary: "Category center",
      }))
    : mode === "limiting"
      ? categories.slice(1).map((upper, index) => {
          const lower = categories[index];
          const reference = { lowerCategoryId: lower?.categoryId, upperCategoryId: upper?.categoryId };
          return {
            key: JSON.stringify([reference.lowerCategoryId, reference.upperCategoryId]),
            profile: profiles.find((item) =>
              item?.lowerCategoryId === reference.lowerCategoryId &&
              item?.upperCategoryId === reference.upperCategoryId
            ),
            label: describeAHPSortProfileForDisplay("limiting", reference, categories),
            secondary: "Category boundary",
          };
        })
      : [];

  const activeProfiles = new Set(active.map((row) => row.profile).filter(Boolean));
  const unmatched = profiles
    .filter((profile) => profile && !activeProfiles.has(profile))
    .map((profile, index) => ({
      key: `unmatched-${profile?.profileId || index}`,
      profile,
      label: describeAHPSortProfileForDisplay(mode, profile, categories),
      secondary: "Needs review",
      stale: true,
    }));
  return [...active, ...unmatched];
};

export const AHPSortProfilesParameterField = ({
  value,
  onChange,
  error = "",
  disabled = false,
  showValidation = false,
  parameterContext,
}) => {
  const [pendingMode, setPendingMode] = useState(null);
  const descriptionId = useId();
  const categories = getParameterValueByStructureKey(parameterContext, "orderedCategories");
  const orderedCategories = Array.isArray(categories) ? categories : [];
  const config = isPlainObject(value) ? value : {};
  const profiles = Array.isArray(config.profiles) ? config.profiles : [];
  const mode = config.mode === "limiting" || config.mode === "central" ? config.mode : "";
  const displayedRows = getProfileRows(mode, profiles, orderedCategories);
  const showError = showValidation && Boolean(error);
  const tiePolicyMissing = mode === "central" && config.tiePolicy !== "optimistic" && config.tiePolicy !== "pessimistic";
  const showGeneralError = showError && !tiePolicyMissing;

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

  return (
    <Stack spacing={1.15} sx={{ minWidth: 0 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 750 }}>
          Profile method
        </Typography>
        <Typography id={descriptionId} variant="caption" color="text.secondary">
          Choose how category references are represented.
        </Typography>
      </Box>

      <FormControl disabled={disabled} error={showGeneralError} sx={{ minWidth: 0 }}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          color="secondary"
          value={mode}
          onChange={requestModeChange}
          aria-label="AHPSort I profile method"
          aria-describedby={descriptionId}
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
        {showGeneralError ? <FormHelperText role="alert">{error}</FormHelperText> : null}
      </FormControl>

      {mode ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          {mode === "limiting"
            ? "Classify alternatives against one profile at each boundary between neighboring categories."
            : "Compare alternatives with one representative center for each category and assign them to the closest center."}
        </Typography>
      ) : null}

      {mode === "central" ? (
        <Stack spacing={0.55} sx={{ minWidth: 0 }}>
          <TextField
            select
            size="small"
            color="secondary"
            label="Equal-distance preference"
            value={config.tiePolicy ?? ""}
            onChange={(event) => onChange({ ...config, tiePolicy: event.target.value })}
            disabled={disabled}
            error={showError && tiePolicyMissing}
            inputProps={{ "aria-label": "Equal-distance preference" }}
            helperText={showError && tiePolicyMissing
              ? "Choose how a tie between category centers is assigned."
              : "When distances are equal, choose the less or more preferred category."}
            sx={{ maxWidth: { xs: "100%", sm: 390 } }}
          >
            <MenuItem value="optimistic">Optimistic — more preferred category</MenuItem>
            <MenuItem value="pessimistic">Pessimistic — less preferred category</MenuItem>
          </TextField>
        </Stack>
      ) : null}

      {mode ? (
        <Stack spacing={0.6} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="baseline" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {mode === "limiting" ? "Category boundaries" : "Category centers"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {profiles.length} {profiles.length === 1 ? "profile" : "profiles"}
            </Typography>
          </Stack>
          {orderedCategories.length < 2 ? (
            <Typography variant="caption" color="text.secondary">
              Add at least two ordered categories to set up profiles.
            </Typography>
          ) : (
            <Stack
              component="ul"
              role="list"
              aria-label={mode === "limiting" ? "Limiting profiles in preference order" : "Central profiles in preference order"}
              spacing={0}
              sx={{ listStyle: "none", m: 0, p: 0, minWidth: 0 }}
            >
              {displayedRows.map((row, index) => (
                <Box
                  key={row.key}
                  component="li"
                  role="listitem"
                  data-testid={`ahpsort-profile-${index + 1}`}
                  sx={(theme) => ({
                    minHeight: 42,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    py: 0.55,
                    px: 0.8,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.42)}`,
                    bgcolor: row.stale ? alpha(theme.palette.warning.main, 0.08) : "transparent",
                  })}
                >
                  <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: "anywhere", fontWeight: 650 }}>
                    {row.label}
                  </Typography>
                  <Typography variant="caption" color={row.stale ? "warning.light" : "text.secondary"} sx={{ flexShrink: 0 }}>
                    {row.secondary}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Select a method to create the category profiles.
        </Typography>
      )}

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
