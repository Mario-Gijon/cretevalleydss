import { useMemo } from "react";
import {
  Stack,
  Typography,
  Grid,
  Paper,
  Tooltip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Avatar,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";

/**
 * Cabecera de la pantalla de issues activos.
 *
 * Muestra el resumen superior y los controles de búsqueda
 * y ordenación del listado.
 *
 * @param {Object} props Props del componente.
 * @param {boolean} props.isLgUp Indica si se usa el layout grande.
 * @param {Object} props.overview Resumen de métricas visibles.
 * @param {boolean} props.refreshing Indica si se está refrescando.
 * @param {Function} props.onRefresh Acción de refresco manual.
 * @param {string} props.query Texto de búsqueda.
 * @param {Function} props.setQuery Setter de búsqueda.
 * @param {string} props.searchBy Campo activo de búsqueda.
 * @param {Function} props.setSearchBy Setter del campo de búsqueda.
 * @param {string} props.modelFilter Modelo seleccionado.
 * @param {Array<string>} props.modelOptions Modelos disponibles.
 * @param {Function} props.setModelFilter Setter del modelo.
 * @param {string} props.sortBy Orden activo.
 * @param {Function} props.setSortBy Setter del orden.
 * @param {number|string} props.height Altura deseada del panel.
 * @param {Object} props.paperSx Estilos adicionales del Paper.
 * @returns {JSX.Element}
 */
const ActiveIssuesToolbar = ({
  isLgUp,
  refreshing,
  onRefresh,
  query,
  setQuery,
  searchBy,
  setSearchBy,
  modelFilter,
  modelOptions = [],
  setModelFilter,
  sortBy,
  setSortBy,
  height = 350,
  paperSx,
}) => {
  const theme = useTheme();

  const gridConfig = useMemo(() => {
    return isLgUp
      ? {
          search: { xs: 12, md: 5, lg: 5 },
          model: { xs: 12, md: 3, lg: 3 },
          sort: { xs: 12, md: 3, lg: 3 },
          refresh: { xs: 12, md: 1, lg: 1 },
        }
      : {
          search: { xs: 12, md: 5 },
          model: { xs: 12, md: 3 },
          sort: { xs: 12, md: 3 },
          refresh: { xs: 12, md: 1 },
        };
  }, [isLgUp]);

  const sortOptions = useMemo(
    () => [
      { value: "name", label: "Name" },
      { value: "creationDate", label: "Creation Date" },
      { value: "deadlineDate", label: "Deadline Date" },
    ],
    []
  );

  const resolvedHeight = height === "auto" ? "auto" : height;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 0,
        p: { xs: 1.25, md: 1.5 },
        height: isLgUp ? resolvedHeight : "auto",
        overflow: "hidden",
        position: "relative",
        background: "transparent",
        backgroundColor: "transparent",
        backgroundImage: "none",
        border: "none",
        borderBottom: "none",
        color: "#F1F4F6",
        boxShadow: "none",
        backdropFilter: "none",
        "& .MuiOutlinedInput-root": {
          bgcolor: "#111923",
          color: "#F1F4F6",
          "& fieldset": { borderColor: "#2A3743" },
          "&:hover fieldset": { borderColor: "#2A3743" },
          "&.Mui-focused fieldset": { borderColor: "secondary.main" },
        },
        ...(paperSx || {}),
      }}
    >
      <Stack spacing={1.25} sx={{ position: "relative", zIndex: 1 }} alignItems="center">
        <Stack direction="row" spacing={1.25} width="100%">
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1.1}>
              <Avatar
                sx={{
                  width: 45,
                  height: 45,
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  color: "secondary.main",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <DashboardCustomizeIcon />
              </Avatar>

              <Stack spacing={0} sx={{ minWidth: 0 }}>
                <Typography
                  variant="h4"
                  sx={{
                    whiteSpace: "nowrap",
                  }}
                >
                  Active issues
                </Typography>
              </Stack>
            </Stack>
          </Stack>

        </Stack>

        <Grid container spacing={1} alignItems="stretch" sx={{ rowGap: 0.5 }}>
          <Grid item {...gridConfig.search}>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#111923", color: "#F1F4F6", "& fieldset": { borderColor: "#2A3743" } }, "& .MuiInputBase-input::placeholder": { color: "#8F9BA5", opacity: 1 } }}
              placeholder="Search..."
              fullWidth
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} />,
                endAdornment: (
                  <>
                    <Divider orientation="vertical" flexItem />
                    <InputAdornment position="start" sx={{ mr: 0.5, ml: 2 }}>
                      <FormControl variant="standard" sx={{ minWidth: 128 }}>
                        <Select
                          value={searchBy}
                          onChange={(event) => setSearchBy(event.target.value)}
                          disableUnderline
                          sx={{
                            typography: "body2",
                            fontWeight: "fontWeightBold",
                            color: "text.secondary",
                            "& .MuiSelect-icon": {
                              color: alpha(theme.palette.text.primary, 0.55),
                            },
                          }}
                        >
                          <MenuItem value="all">All</MenuItem>
                          <Divider sx={{ opacity: 0.18 }} />
                          <MenuItem value="issue">Issue name</MenuItem>
                          <MenuItem value="alternatives">Alternatives</MenuItem>
                          <MenuItem value="criteria">Criteria</MenuItem>
                          <MenuItem value="model">Model</MenuItem>
                          <MenuItem value="owner">Owner</MenuItem>
                        </Select>
                      </FormControl>
                    </InputAdornment>
                  </>
                ),
              }}
            />
          </Grid>

          <Grid item {...gridConfig.model}>
            <FormControl size="small" fullWidth>
              <InputLabel color="secondary">Model</InputLabel>
              <Select
                value={modelFilter}
                label="Model"
                color="secondary"
                onChange={(event) => setModelFilter(event.target.value)}
              >
                {modelOptions.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model === "all" ? "All models" : model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item {...gridConfig.sort}>
            <FormControl size="small" fullWidth>
              <InputLabel color="secondary">Sort</InputLabel>
              <Select
                value={sortBy}
                label="Sort"
                color="secondary"
                onChange={(event) => setSortBy(event.target.value)}
              >
                {sortOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid
            item
            {...gridConfig.refresh}
            sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}
          >
            <Tooltip title="Refresh issues">
              <span>
                <IconButton
                  onClick={onRefresh}
                  disabled={refreshing}
                  aria-label="Refresh issues"
                  sx={{
                    bgcolor: "#111923",
                    border: "1px solid #2A3743",
                    "&:hover": { bgcolor: "#18232F" },
                  }}
                >
                  {refreshing ? (
                    <CircularProgress size={18} color="secondary" />
                  ) : (
                    <RefreshIcon />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Grid>
        </Grid>
      </Stack>
    </Paper>
  );
};

export default ActiveIssuesToolbar;
