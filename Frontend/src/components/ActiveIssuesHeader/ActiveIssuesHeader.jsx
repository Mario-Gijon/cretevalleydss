import { useMemo } from "react";
import {
  Stack,
  Typography,
  Box,
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

// Para getNextActionMeta
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CalculateIcon from "@mui/icons-material/Calculate";
import GavelIcon from "@mui/icons-material/Gavel";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

/* -----------------------------
 * Helpers compartidos (estilo drawer-like)
 * ----------------------------- */

// eslint-disable-next-line react-refresh/only-export-components
export const toneColor = (tone) => {
  if (tone === "success") return { dot: "#2e7d32", text: "success.main" };
  if (tone === "warning") return { dot: "#ed6c02", text: "warning.main" };
  if (tone === "error") return { dot: "#d32f2f", text: "error.main" };
  return { dot: "#0288d1", text: "info.main" };
};

export const Dot = ({ tone = "info" }) => {
  const c = toneColor(tone);
  return <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: c.dot, flex: "0 0 auto" }} />;
};

// eslint-disable-next-line react-refresh/only-export-components
export const auroraBg = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1200px 520px at 12% 0%, ${alpha(theme.palette.info.main, intensity)}, transparent 62%),
                    radial-gradient(900px 460px at 88% 16%, ${alpha(theme.palette.secondary.main, intensity)}, transparent 58%)`,
});

const crystalBorder = () => {
  return { border: "1px solid rgba(155, 192, 197, 0.5)" };
};

// eslint-disable-next-line react-refresh/only-export-components
export const glassSx = (theme, strength = 0.14, borderLevel = "crystal") => ({
  backgroundColor: alpha(theme.palette.background.paper, strength),
  backdropFilter: "blur(14px)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.10)}`,
  ...crystalBorder(theme, { level: borderLevel }),
});

export const Pill = ({ tone = "info", children }) => {
  const theme = useTheme();
  const c = toneColor(tone);
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.2,
        py: 0.55,
        borderRadius: 999,
        bgcolor: alpha(c.dot, 0.12),
        color: c.text,
        fontSize: 12,
        fontWeight: 950,
        width: "fit-content",
        boxShadow: `0 10px 26px ${alpha(theme.palette.common.black, 0.06)}`,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Dot tone={tone} />
      <span>{children}</span>
    </Box>
  );
};

export const TinyStat = ({ icon, label, value, tone = "info" }) => {
  const theme = useTheme();
  const c = toneColor(tone);
  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 1.15,
        display: "flex",
        gap: 1.2,
        alignItems: "center",
        backgroundColor: alpha(theme.palette.background.paper, 0.12),
        boxShadow: `0 12px 34px ${alpha(theme.palette.common.black, 0.06)}`,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.10)",
        position: "relative",
        ...auroraBg(theme, 0.10),
        "&:after": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 55%)`,
          opacity: 0.22,
        },
      }}
    >
      <Avatar
        sx={{
          width: 34,
          height: 34,
          bgcolor: alpha(c.dot, 0.14),
          color: c.text,
          fontWeight: 950,
          border: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {icon}
      </Avatar>
      <Stack spacing={0.1} sx={{ minWidth: 0, position: "relative", zIndex: 1 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
          {label}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1, whiteSpace: "nowrap" }}>
          {value}
        </Typography>
      </Stack>
    </Box>
  );
};

const toTitleCase = (s) =>
  (s || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

// eslint-disable-next-line react-refresh/only-export-components
export const stageLabel = (stage) => {
  const map = {
    criteriaWeighting: "Criteria weighting",
    weightsFinished: "Weights finished",
    alternativeEvaluation: "Alternative evaluation",
    finished: "Finished",
  };
  return map[stage] || toTitleCase(stage) || "—";
};

/* -----------------------------
 * Next action meta (SERVER FIRST)
 * ----------------------------- */

const mapServerStatusKey = (k) => {
  if (!k) return null;
  const key = String(k);

  if (key === "resolveIssue") return "resolve";
  if (key === "computeWeights") return "computeW";
  if (key === "evaluateWeights") return "evalW";
  if (key === "evaluateAlternatives") return "evalA";
  if (key === "waitingAdmin") return "waitingAdmin";

  if (key === "waitingExperts") return "waitingExperts";
  if (key === "pendingInvitations") return "waitingExperts";

  if (key === "finished") return "finished";
  return key;
};

const toneFromServerRawKey = (rawKey, issue) => {
  const k = String(rawKey || "");
  if (k === "evaluateWeights" || k === "evaluateAlternatives") return "info";
  if (k === "waitingAdmin" || k === "waitingExperts") return "success";
  if (k === "computeWeights" || k === "resolveIssue") return "warning";
  if (k === "finished" || issue?.currentStage === "finished") return "success";
  return "success";
};

// eslint-disable-next-line react-refresh/only-export-components
export const getNextActionMeta = (issue) => {
  const serverKeyRaw = issue?.ui?.statusKey || issue?.nextAction?.key;
  const serverKey = mapServerStatusKey(serverKeyRaw);
  const serverTitle = issue?.ui?.statusLabel || issue?.nextAction?.label;

  const tone = toneFromServerRawKey(serverKeyRaw, issue);

  const serverMap = {
    waitingAdmin: {
      key: "waitingAdmin",
      title:
        serverTitle ||
        (issue?.currentStage === "weightsFinished" ? "Waiting for admin to compute weights" : "Waiting for admin to resolve"),
      tone,
      icon: <HourglassBottomIcon fontSize="small" />,
    },
    evalW: {
      key: "evalW",
      title: serverTitle || "Evaluate criteria weights",
      tone,
      icon: <FactCheckIcon fontSize="small" />,
    },
    computeW: {
      key: "computeW",
      title: serverTitle || "Compute weights",
      tone,
      icon: <CalculateIcon fontSize="small" />,
    },
    evalA: {
      key: "evalA",
      title: serverTitle || "Evaluate alternatives",
      tone,
      icon: <FactCheckIcon fontSize="small" />,
    },
    resolve: {
      key: "resolve",
      title: serverTitle || "Resolve issue",
      tone,
      icon: <GavelIcon fontSize="small" />,
    },
    finished: {
      key: "finished",
      title: serverTitle || "Finished",
      tone: "success",
      icon: <AssignmentTurnedInIcon fontSize="small" />,
    },
    waitingExperts: {
      key: "waitingExperts",
      title: serverTitle || "Waiting experts",
      tone,
      icon: <HourglassBottomIcon fontSize="small" />,
    },
  };

  if (serverKey && serverMap[serverKey]) return serverMap[serverKey];

  const f = issue?.statusFlags || {};
  if (f.waitingAdmin) return serverMap.waitingAdmin;
  if (f.canEvaluateWeights) return serverMap.evalW;
  if (f.canComputeWeights) return serverMap.computeW;
  if (f.canEvaluateAlternatives) return serverMap.evalA;
  if (f.canResolveIssue) return serverMap.resolve;
  if (issue?.currentStage === "finished") return serverMap.finished;
  return serverMap.waitingExperts;
};

/* -----------------------------
 * Component
 * ----------------------------- */

const ActiveIssuesHeader = ({
  isLgUp,
  headerSignals,
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

  // ✅ ahora puede ser number o "auto"
  height = 350,
  paperSx,
}) => {
  const theme = useTheme();

  const cfg = useMemo(() => {
    return isLgUp
      ? { search: { xs: 12, md: 8, lg: 8 }, sort: { xs: 12, md: 4, lg: 4 } }
      : { search: { xs: 12, md: 8 }, sort: { xs: 12, md: 4 } };
  }, [isLgUp]);

  const sortOptions = useMemo(() => {
    const s = filtersMeta?.sortOptions;
    if (Array.isArray(s) && s.length) return s;
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
        ...glassSx(theme, 0.16, "crystal"),
        ...auroraBg(theme, 0.16),
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
      <Stack spacing={1.05} sx={{ position: "relative", zIndex: 1 }} alignItems={"center"}>
        {/* Title row */}
        <Stack
          direction={"row"}
          spacing={1.25}
          width={"100%"}
          sx={{ alignItems: { xs: "stretch", md: "flex-start" }, justifyContent: "space-between" }}
        >
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1.1}>
              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  color: "secondary.main",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <DashboardCustomizeIcon />
              </Avatar>

              <Stack spacing={0} sx={{ minWidth: 0 }}>
                <Typography variant="h4" sx={{ fontWeight: 980, lineHeight: 1.05, whiteSpace: "nowrap" }}>
                  Active issues
                </Typography>
                {/* <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                  Showing {filteredCount} of {totalCount}
                </Typography> */}
              </Stack>
            </Stack>

            {/* <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap"}}>
              <Pill tone={headerSignals.actionable ? "info" : "success"}>{headerSignals.actionable} needs action</Pill>
            </Stack> */}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ gap: 1 }}>
            <Tooltip title="Refresh issues">
              <span>
                <IconButton
                  onClick={onRefresh}
                  disabled={refreshing}
                  sx={{
                    bgcolor: alpha(theme.palette.secondary.main, 0.10),
                    border: "1px solid rgba(255,255,255,0.10)",
                    "&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.14) },
                  }}
                >
                  {refreshing ? <CircularProgress size={18} color="secondary" /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Stats row */}
        <Grid container spacing={1.1} pr={0}>
          <Grid item xs={6} sm={3}>
            <TinyStat icon={<DashboardCustomizeIcon fontSize="small" />} label="Issues" value={overview.total} tone="success" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TinyStat icon={<AssignmentTurnedInIcon fontSize="small" />} label="Tasks" value={overview.tasks} tone="info" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TinyStat icon={<CalculateIcon fontSize="small" />} label="Admin" value={overview.admin} tone="success" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TinyStat icon={<GavelIcon fontSize="small" />} label="Ready to resolve" value={overview.readyResolve} tone="warning" />
          </Grid>
        </Grid>

        {/* Controls row */}
        <Grid container spacing={1} alignItems="stretch" sx={{ rowGap: 0.5, pt: 1.5 }}>
          <Grid item {...cfg.search}>
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
                          onChange={(e) => setSearchBy(e.target.value)}
                          disableUnderline
                          sx={{
                            fontSize: 13,
                            fontWeight: 950,
                            color: "text.secondary",
                            "& .MuiSelect-icon": { color: alpha(theme.palette.text.primary, 0.55) },
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

          <Grid item {...cfg.sort}>
            <FormControl size="small" fullWidth>
              <InputLabel color="secondary">Sort</InputLabel>
              <Select value={sortBy} label="Sort" color="secondary" onChange={(e) => setSortBy(e.target.value)}>
                {sortOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
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
