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
import { alpha, useTheme } from "@mui/material/styles";

import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import { filterModels } from "../../../../src/utils/createIssueUtils";
import { useSnackbarAlertContext } from "../../../../src/context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../../src/context/issues/issues.context";

const inputSx = (theme) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 3,
    // ✅ ahora que vive dentro del CreateIssuePage (ya con “shell” y blur),
    // bajamos un pelín la opacidad para que no se “embarre”.
    bgcolor: alpha(theme.palette.common.white, 0.03),
    border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
    "& fieldset": { border: "none" },
  },
});

const pillToggleSx = (theme) => ({
  borderRadius: 999,
  px: 1.4,
  py: 0.7,
  fontWeight: 950,
  textTransform: "none",
  borderColor: alpha(theme.palette.common.white, 0.14),
  bgcolor: alpha(theme.palette.common.white, 0.03),
  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.05) },
  "&.Mui-selected": {
    borderColor: alpha(theme.palette.secondary.main, 0.35),
    bgcolor: alpha(theme.palette.secondary.main, 0.12),
  },
});

const modelTileSx = (theme, selected) => ({
  position: "relative",
  borderRadius: 4,
  p: 1.6,
  height: "100%",
  cursor: "pointer",
  border: `1px solid ${
    selected ? alpha(theme.palette.info.main, 0.40) : alpha(theme.palette.common.white, 0.10)
  }`,
  bgcolor: selected ? alpha(theme.palette.info.main, 0.10) : alpha(theme.palette.common.white, 0.02),
  transition: "transform 120ms ease, border-color 120ms ease, background 120ms ease",
  "&:hover": {
    transform: "translateY(-2px)",
    borderColor: alpha(theme.palette.info.main, 0.30),
    bgcolor: alpha(theme.palette.common.white, 0.03),
  },
});

export const ModelStep = ({ selectedModel, setSelectedModel, withConsensus, setWithConsensus, criteria }) => {
  const theme = useTheme();
  const { models } = useIssuesDataContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredModels = useMemo(
    () => filterModels(models, withConsensus, searchQuery),
    [models, withConsensus, searchQuery]
  );

  const handleConsensus = () => setWithConsensus((prev) => !prev);

  const countLeafCriteria = (items) => {
    return items.reduce((acc, item) => {
      if (!item.children || item.children.length === 0) return acc + 1;
      return acc + countLeafCriteria(item.children);
    }, 0);
  };

  const handleSelectModel = (model) => {
    if (!model.isMultiCriteria) {
      const leafCount = countLeafCriteria(criteria);
      if (leafCount > 1) {
        showSnackbarAlert("This model only allows one criterion. Please reduce your criteria first.", "error");
        return;
      }
    }
    setSelectedModel(model);
  };

  return (
    <Stack spacing={2} sx={{ width: "100%", maxWidth: 1250, mx: "auto" }}>
      {/* Controls */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "flex-end" }}>
        <ToggleButton
          value="consensus"
          selected={withConsensus}
          onChange={handleConsensus}
          color="secondary"
          size="small"
          sx={pillToggleSx(theme)}
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
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1, maxWidth: { xs: "100%", sm: 320 }, ...inputSx(theme) }}
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

      {/* Model list (tiles) */}
      <Grid container spacing={1.5} sx={{ width: "100%" }}>
        {filteredModels.map((model) => {
          const selected = selectedModel?.name === model?.name;

          return (
            <Grid key={model._id || model.name} item size={{ xs: 12, sm: 6, lg: 4 }}>
              <Box sx={modelTileSx(theme, selected)} onClick={() => handleSelectModel(model)}>
                {selected && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.6,
                      px: 1,
                      py: 0.35,
                      borderRadius: 999,
                      border: `1px solid ${alpha(theme.palette.info.main, 0.35)}`,
                      bgcolor: alpha(theme.palette.info.main, 0.12),
                      color: "info.main",
                      fontWeight: 950,
                      fontSize: 12,
                    }}
                  >
                    <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                    Selected
                  </Box>
                )}

                <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1.15 }}>
                  {model.name}
                </Typography>

                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850, mt: 0.6 }}>
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
