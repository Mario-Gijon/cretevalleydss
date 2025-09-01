import { useState } from "react";
import { Stack, Typography, CardContent, Grid2 as Grid, TextField, IconButton } from "@mui/material";
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButton from '@mui/material/ToggleButton';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { filterModels } from "../../../../src/utils/createIssueUtils";
import { GlassPaper } from "../../../activeIssues/customStyles/StyledCard";

export const ModelStep = ({ models, selectedModel, setSelectedModel, withConsensus, setWithConsensus }) => {
  const [searchQuery, setSearchQuery] = useState(""); // Estado para el buscador

  // Filtrar modelos según el tipo de consenso y la búsqueda
  const filteredModels = filterModels(models, withConsensus, searchQuery)

  const handleConsensus = () => {
    setWithConsensus(!withConsensus)
    setSelectedModel(null)
  }

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
        minHeight: 0, // Permite que el contenido interno se expanda sin romper el layout
        maxWidth: "95vw",
        width: { xs: "95vw", sm: "auto" },
      }}
    >
      <Stack spacing={3} sx={{ width: "100%", maxWidth: 1000 }}>
        {/* Buscador y filtro de consenso */}
        <Stack direction="row" spacing={2} alignItems="flex-end" justifyContent={"flex-start"}>
          {/* Switch para con/sin consenso */}
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
          {/* Buscador */}
          <TextField
            defaultValue="Small"
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
                    <IconButton
                      onClick={() => setSearchQuery("")}
                      size="small"
                      edge="end"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
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
        {/* Lista de modelos disponibles */}
        <Grid container spacing={2} sx={{
          flexGrow: 1,
          maxHeight: "90vh", // Altura máxima del contenedor
          minHeight: 0,
          overflowY: "auto",  // Habilitar scroll vertical
        }}>
          {filteredModels.map((model, index) => (
            <Grid key={index} item size={{ xs: 12, sm: 6, lg: 4 }}>
              <GlassPaper
                onClick={() => setSelectedModel(model.name)}
                sx={{
                  cursor: "pointer",
                  border:
                    selectedModel === model.name
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
