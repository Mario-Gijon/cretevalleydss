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
import CalculateIcon from "@mui/icons-material/Calculate";
import GavelIcon from "@mui/icons-material/Gavel";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import {
  getActiveIssuesPageHeaderAuroraBg,
  getActiveIssuesPageHeaderGlassSx,
} from "../../styles/activeIssues.styles";
import ActiveIssuesTinyStat from "../shared/ActiveIssuesTinyStat";

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
 * @param {string} props.sortBy Orden activo.
 * @param {Function} props.setSortBy Setter del orden.
 * @param {Object|null} props.filtersMeta Metadatos de filtros del servidor.
 * @param {number|string} props.height Altura deseada del panel.
 * @param {Object} props.paperSx Estilos adicionales del Paper.
 * @returns {JSX.Element}
 */
const ActiveIssuesHeader = ({
  isLgUp,
  overview,
  refreshing,
  onRefresh,
  query,
  setQuery,
  searchBy,
  setSearchBy,
  sortBy,
  setSortBy,
  filtersMeta,
  height = 350,
  paperSx,
}) => {
  const theme = useTheme();

  const gridConfig = useMemo(() => {
    return isLgUp
      ? { search: { xs: 12, md: 8, lg: 8 }, sort: { xs: 12, md: 4, lg: 4 } }
      : { search: { xs: 12, md: 8 }, sort: { xs: 12, md: 4 } };
  }, [isLgUp]);

  const sortOptions = useMemo(() => {
    const options = filtersMeta?.sortOptions;

    if (Array.isArray(options) && options.length > 0) {
      return options;
    }

    return [
      { value: "recent", label: "Recent" },
      { value: "name", label: "Name" },
    ];
  }, [filtersMeta]);

  const resolvedHeight = height === "auto" ? "auto" : height;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 5,
        p: { xs: 1.6, md: 2.0 },
        height: isLgUp ? resolvedHeight : "auto",
        overflow: "hidden",
        position: "relative",
        ...getActiveIssuesPageHeaderGlassSx(theme, 0.16),
        ...getActiveIssuesPageHeaderAuroraBg(theme),
        "&:after": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 45%)`,
          opacity: 0.22,
        },
        ...(paperSx || {}),
      }}
    >
      <Stack spacing={2} sx={{ position: "relative", zIndex: 1 }} alignItems="center">
        <Stack
          direction="row"
          spacing={1.25}
          width="100%"
          sx={{
            alignItems: { xs: "stretch", md: "flex-start" },
            justifyContent: "space-between",
          }}
        >
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
                  sx={{
                    fontWeight: 980,
                    fontSize: 45,
                    lineHeight: 1.05,
                    whiteSpace: "nowrap",
                  }}
                >
                  Active issues
                </Typography>
              </Stack>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={12} sx={{ gap: 1 }}>
            <Tooltip title="Refresh issues">
              <span>
                <IconButton
                  onClick={onRefresh}
                  disabled={refreshing}
                  sx={{
                    bgcolor: alpha(theme.palette.secondary.main, 0.10),
                    border: "1px solid rgba(255,255,255,0.10)",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.secondary.main, 0.14),
                    },
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
          </Stack>
        </Stack>

        <Grid container spacing={1} pr={0}>
          <Grid item xs={6} md={3}>
            <ActiveIssuesTinyStat
              icon={<DashboardCustomizeIcon fontSize="small" />}
              label="Issues"
              value={overview.total}
              tone="success"
            />
          </Grid>

          <Grid item xs={6} md={3}>
            <ActiveIssuesTinyStat
              icon={<AssignmentTurnedInIcon fontSize="small" />}
              label="Tasks"
              value={overview.tasks}
              tone="info"
            />
          </Grid>

          <Grid item xs={6} md={3}>
            <ActiveIssuesTinyStat
              icon={<CalculateIcon fontSize="small" />}
              label="Admin"
              value={overview.admin}
              tone="success"
            />
          </Grid>

          <Grid item xs={6} md={3}>
            <ActiveIssuesTinyStat
              icon={<GavelIcon fontSize="small" />}
              label="Ready to resolve"
              value={overview.readyResolve}
              tone="warning"
            />
          </Grid>
        </Grid>

        <Grid container spacing={1} alignItems="stretch" sx={{ rowGap: 0.5 }}>
          <Grid item {...gridConfig.search}>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              size="small"
              color="secondary"
              variant="outlined"
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
                            fontSize: 13,
                            fontWeight: 950,
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
                          <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                      </FormControl>
                    </InputAdornment>
                  </>
                ),
              }}
            />
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
        </Grid>
      </Stack>
    </Paper>
  );
};

export default ActiveIssuesHeader;