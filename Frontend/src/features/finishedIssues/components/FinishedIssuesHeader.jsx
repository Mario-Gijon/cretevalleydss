import { useMemo } from "react";
import {
  Stack,
  Typography,
  Paper,
  Tooltip,
  IconButton,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Divider,
  Avatar,
  CircularProgress,
  InputAdornment,
  Grid,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

import {
  getActiveIssuesAuroraBg,
  getActiveIssuesPanelGlassSx,
} from "../../activeIssues/styles/activeIssues.styles";
import ActiveIssuesPill from "../../activeIssues/components/shared/ActiveIssuesPill";

/**
 * Cabecera de filtros y métricas de la pantalla de issues finalizados.
 *
 * @param {Object} props Props del componente.
 * @param {Object} props.overview Resumen de conteos.
 * @param {boolean} props.refreshing Estado de refresco manual.
 * @param {Function} props.onRefresh Acción de refresco.
 * @param {string} props.query Texto de búsqueda.
 * @param {Function} props.setQuery Setter de búsqueda.
 * @param {string} props.searchBy Campo de búsqueda.
 * @param {Function} props.setSearchBy Setter de campo de búsqueda.
 * @param {string} props.sortBy Criterio de ordenación.
 * @param {Function} props.setSortBy Setter de ordenación.
 * @returns {JSX.Element}
 */
const FinishedIssuesHeader = ({
  overview,
  refreshing,
  onRefresh,
  query,
  setQuery,
  searchBy,
  setSearchBy,
  sortBy,
  setSortBy,
}) => {
  const theme = useTheme();

  const sortOptions = useMemo(
    () => [
      { value: "name", label: "Name" },
      { value: "finalizationDate", label: "Deadline date" },
      { value: "creationDate", label: "Creation date" },
    ],
    []
  );

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        p: { xs: 1.6, md: 2.0 },
        height: "auto",
        overflow: "hidden",
        position: "relative",
        ...getActiveIssuesPanelGlassSx(theme, 0.16, "crystal"),
        ...getActiveIssuesAuroraBg(theme, 0.16),
        "&:after": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(180deg, ${alpha(
            theme.palette.common.white,
            0.1
          )}, transparent 45%)`,
          opacity: 0.22,
        },
      }}
    >
      <Stack spacing={1.05} sx={{ position: "relative", zIndex: 1 }}>
        <Stack
          direction="row"
          spacing={1.25}
          sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
        >
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1.1}>
              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: alpha(theme.palette.success.main, 0.14),
                  color: "success.main",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <AssignmentTurnedInIcon />
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
                  Finished issues
                </Typography>
              </Stack>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexWrap: "wrap" }}
            >
              <ActiveIssuesPill tone="success">
                {overview.total} finished
              </ActiveIssuesPill>
            </Stack>
          </Stack>

          <Tooltip title="Refresh finished issues">
            <span>
              <IconButton
                onClick={onRefresh}
                disabled={refreshing}
                sx={{
                  bgcolor: alpha(theme.palette.secondary.main, 0.1),
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

        <Grid container spacing={1} alignItems="stretch" sx={{ rowGap: 0.5 }}>
          <Grid item xs={12} md={8}>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              size="small"
              color="secondary"
              variant="outlined"
              placeholder="Search..."
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
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

          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth>
              <Typography component="label" sx={{ display: "none" }}>
                Sort
              </Typography>
              <Select
                value={sortBy}
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

export default FinishedIssuesHeader;
