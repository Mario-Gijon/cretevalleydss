import { useState } from "react";
import { Stack, Typography, CardContent, Grid2 as Grid, TextField, IconButton } from "@mui/material";
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButton from '@mui/material/ToggleButton';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { filterModels } from "../../../../src/utils/createIssueUtils";
import { GlassPaper } from "../../../../src/components/StyledComponents/GlassPaper";
import { useSnackbarAlertContext } from "../../../../src/context/snackbarAlert/snackbarAlert.context";
import { useIssuesDataContext } from "../../../../src/context/issues/issues.context";

export const ModelStep = ({ selectedModel, setSelectedModel, withConsensus, setWithConsensus, criteria }) => {

  const { models } = useIssuesDataContext()
  const { showSnackbarAlert } = useSnackbarAlertContext()

  const [searchQuery, setSearchQuery] = useState(""); // Estado para el buscador

  // Filtrar modelos según el tipo de consenso y la búsqueda
  const filteredModels = filterModels(models, withConsensus, searchQuery)

  const handleConsensus = () => {
    setWithConsensus(!withConsensus)
  }

  // 🔎 contar criterios hoja (recursivo)
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
        showSnackbarAlert("This model only allows one criterion. Please reduce your criteria first.","error");
        return; // 🚫 bloqueo preventivo
      }
    }
    setSelectedModel(model);
  };

  return (
    <GlassPaper
      variant="elevation"
      elevation={0}
      sx={{
        p: { xs: 3, sm: 4, md: 5 },
        minWidth: { md: 700, lg: 1000 },
        borderRadius: 2,
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        maxWidth: "95vw",
        width: { xs: "95vw", sm: "auto" },
        boxShadow: "0 8px 24px rgba(29, 82, 81, 0.1)",
      }}
    >
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 1000 }}>
        {/* Buscador y filtro de consenso */}
        <Stack direction="row" spacing={2} alignItems="flex-end" justifyContent={"flex-start"}>
          <ToggleButton
            value="check"
            selected={withConsensus}
            onChange={handleConsensus}
            color="secondary"
            size="small"
          >
            <FilterListIcon sx={{ mr: 1 }} />
            Consensus
          </ToggleButton>
          <TextField
            size="small"
            color="info"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setSearchQuery("")} size="small" edge="end">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            placeholder="Search model"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, maxWidth: 240 }}
            autoComplete="off"
          />
        </Stack>

        {/* Lista de modelos */}
        <Grid container spacing={2} sx={{ flexGrow: 1, maxHeight: "90vh", overflowY: "auto" }}>
          {filteredModels.map((model, index) => (
            <Grid key={index} item size={{ xs: 12, sm: 6, lg: 4 }}>
              <GlassPaper
                onClick={() => handleSelectModel(model)} // 👈 validación aquí
                sx={{
                  cursor: "pointer",
                  border:
                    selectedModel?.name === model?.name
                      ? "1px solid #45C5C5"
                      : "1px solid grey",
                  borderRadius: 2,
                  transition: "border-color 0.2s",
                }}
                elevation={4}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    {model.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {model.smallDescription}
                  </Typography>
                </CardContent>
              </GlassPaper>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </GlassPaper>
  );
};
