import { useMemo, useState } from "react";
import {
  Stack,
  Typography,
  Grid2 as Grid,
  TextField,
  IconButton,
  Box,
  ToggleButton,
  InputAdornment,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import { filterModels } from "../utils/createIssue.utils";
import { countLeafCriteria } from "../../../utils/criteria.utils";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useCreateIssueContext } from "../context/createIssue.context";
import {
  createIssueStepContainerSx,
  getCreateIssueModelPillToggleSx,
  getCreateIssueModelSelectedBadgeSx,
  getCreateIssueModelTileSx,
  getCreateIssueStepInputSx,
} from "../styles/createIssueStep.styles";

export const ModelStep = () => {
  const theme = useTheme();
  const { models } = useIssuesDataContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const {
    selectedModel,
    setSelectedModel,
    isConsensus,
    setIsConsensus,
    criteria,
  } = useCreateIssueContext();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredModels = useMemo(
    () => filterModels(models, isConsensus, searchQuery),
    [models, isConsensus, searchQuery]
  );

  const handleConsensus = () => {
    if (isConsensus) {
      setIsConsensus(false);
      return;
    }

    if (selectedModel && selectedModel.supportsConsensus !== true) {
      showSnackbarAlert(
        "Selected model does not support consensus issues.",
        "error"
      );
      return;
    }

    setIsConsensus(true);
  };

  const handleSelectModel = (model) => {
    if (!model.isMultiCriteria) {
      const leafCount = countLeafCriteria(criteria);
      if (leafCount > 1) {
        showSnackbarAlert(
          "This model only allows one criterion. Please reduce your criteria first.",
          "error"
        );
        return;
      }
    }

    if (isConsensus && model.supportsConsensus !== true) {
      showSnackbarAlert(
        "This model does not support consensus issues.",
        "error"
      );
      return;
    }

    setSelectedModel(model);
  };

  return (
    <Stack spacing={2} sx={{ ...createIssueStepContainerSx, minHeight: "auto" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.25}
        alignItems={{ xs: "stretch", sm: "flex-end" }}
      >
        <ToggleButton
          value="consensus"
          selected={isConsensus}
          onChange={handleConsensus}
          color="secondary"
          size="small"
          sx={getCreateIssueModelPillToggleSx(theme)}
        >
          <FilterListIcon sx={{ mr: 1 }} />
          Consensus
        </ToggleButton>

        <TextField
          size="small"
          color="info"
          placeholder="Search model"
          variant="outlined"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          sx={{ flex: 1, maxWidth: { xs: "100%", sm: 320 }, ...getCreateIssueStepInputSx(theme) }}
          autoComplete="off"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton onClick={() => setSearchQuery("")} size="small" edge="end">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
      </Stack>

      <Grid container spacing={1.5} sx={{ width: "100%" }}>
        {filteredModels.map((model) => {
          const selected = selectedModel?._id === model?._id;

          return (
            <Grid key={model._id || model.name} item size={{ xs: 12, sm: 6, lg: 4 }}>
              <Box sx={getCreateIssueModelTileSx(theme, selected)} onClick={() => handleSelectModel(model)}>
                {selected && (
                  <Box sx={getCreateIssueModelSelectedBadgeSx(theme)}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                    Selected
                  </Box>
                )}

                <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1.15 }}>
                  {model.name}
                </Typography>

                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850, mt: 1 }}>
                  {model.smallDescription}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
};
