import { useEffect, useMemo, useState } from "react";
import {
  Stack,
  Typography,
  Box,
  Backdrop,
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
import { alpha, styled, useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

import { useIssuesDataContext } from "../../src/context/issues/issues.context";
import { useSnackbarAlertContext } from "../../src/context/snackbarAlert/snackbarAlert.context";

import { CircularLoading } from "../../src/components/LoadingProgress/CircularLoading";
import { removeFinishedIssue } from "../../src/controllers/issueController";
import { FinishedIssueDialog } from "../../src/components/FinishedIssueDialog/FinishedIssueDialog";
import { GlassDialog } from "../../src/components/StyledComponents/GlassDialog";

// Reusamos helpers visuales de ActiveIssuesHeader para que sea 100% consistente
import { Pill, auroraBg, glassSx } from "../../src/components/ActiveIssuesHeader/ActiveIssuesHeader";

/* -----------------------------
 * Helpers
 * ----------------------------- */

const normalize = (v) => (v == null ? "" : String(v)).toLowerCase();

const criteriaContains = (nodes, q) => {
  if (!q) return true;
  if (!Array.isArray(nodes) || nodes.length === 0) return false;
  const stack = [...nodes];
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    if (normalize(n?.name).includes(q)) return true;
    if (Array.isArray(n?.children) && n.children.length) stack.push(...n.children);
  }
  return false;
};

const adminContains = (issue, q) => {
  if (!q) return true;
  const candidates = [
    issue?.creator,
    issue?.adminEmail,
    issue?.adminName,
    issue?.admin?.email,
    issue?.admin?.name,
    issue?.createdBy?.email,
    issue?.createdBy?.name,
    issue?.owner?.email,
    issue?.owner?.name,
  ];
  return candidates.some((c) => normalize(c).includes(q));
};

const alternativesContains = (issue, q) => {
  if (!q) return true;
  const alts = Array.isArray(issue?.alternatives) ? issue.alternatives : [];
  return alts.some((a) => {
    if (typeof a === "string") return normalize(a).includes(q);
    return normalize(a?.name || a?.title || a?.label).includes(q);
  });
};

const parseDateDDMMYYYY = (d) => {
  if (!d || typeof d !== "string") return 0;
  // soporta "dd-mm-yyyy" o "dd/mm/yyyy"
  const parts = d.includes("-") ? d.split("-") : d.split("/");
  const [dd, mm, yyyy] = parts.map((x) => Number(x));
  if (!dd || !mm || !yyyy) return 0;
  return new Date(yyyy, mm - 1, dd).getTime();
};

/* -----------------------------
 * Card shell (mismo look IssuesGrid)
 * ----------------------------- */

const FinishedIssueCard = styled(Paper)(({ theme }) => ({
  borderRadius: 20,
  height: "100%",
  transition: "transform 160ms ease, box-shadow 160ms ease, background 220ms ease, border-color 220ms ease",
  background: "rgba(21, 30, 38, 0.18)",
  color: theme.palette.common.white,
  boxShadow: "0 12px 34px rgba(29, 82, 81, 0.18)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.10)",
  overflow: "hidden",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 18px 46px rgba(21, 60, 59, 0.30)",
    background: "rgba(60, 119, 121, 0.1)",
    borderColor: "rgba(255,255,255,0.14)",
  },
}));

const CARD_HEIGHT = 250;

/* -----------------------------
 * Header (auto height, sin stats)
 * ----------------------------- */

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
      { value: "closedRecent", label: "Recently closed" },
      { value: "createdRecent", label: "Recently created" },
      { value: "nameAsc", label: "Name (A-Z)" },
      { value: "nameDesc", label: "Name (Z-A)" },
    ],
    []
  );

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 5,
        p: { xs: 1.6, md: 2.0 },
        height: "auto", // ✅ auto SIEMPRE
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
      }}
    >
      <Stack spacing={1.05} sx={{ position: "relative", zIndex: 1 }}>
        {/* Title row */}
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
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
                <Typography variant="h4" sx={{ fontWeight: 980, lineHeight: 1.05, whiteSpace: "nowrap" }}>
                  Finished issues
                </Typography>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Pill tone="success">{overview.total} finished</Pill>
            </Stack>
          </Stack>

          <Tooltip title="Refresh finished issues">
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

        {/* Controls row */}
        <Grid container spacing={1} alignItems="stretch" sx={{ rowGap: 0.5 }}>
          <Grid item xs={12} md={8}>
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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

          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth>
              <Typography component="label" sx={{ display: "none" }}>
                Sort
              </Typography>
              <Select value={sortBy} color="secondary" onChange={(e) => setSortBy(e.target.value)}>
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

/* -----------------------------
 * Page
 * ----------------------------- */

const FinishedIssuesPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:900px)");
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));

  const { showSnackbarAlert } = useSnackbarAlertContext();
  const issuesCtx = useIssuesDataContext();

  const { issueCreated, setIssueCreated, loading, finishedIssues, setFinishedIssues, fetchFinishedIssues } = issuesCtx;

  const [selectedIssue, setSelectedIssue] = useState(null);
  const [openFinishedIssueDialog, setOpenFinishedIssueDialog] = useState(false);

  const [openRemoveConfirmDialog, setOpenRemoveConfirmDialog] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // filtros
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState("closedRecent");

  useEffect(() => {
    if (issueCreated?.success) {
      showSnackbarAlert(issueCreated.msg, "success");
      setIssueCreated("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueCreated, setIssueCreated]);

  const handleRefresh = async () => {
    if (typeof fetchFinishedIssues !== "function") return;
    try {
      setRefreshing(true);
      await fetchFinishedIssues();
    } finally {
      setRefreshing(false);
    }
  };

  const openDetails = (issue) => {
    setSelectedIssue(issue);
    setOpenFinishedIssueDialog(true);
  };

  const closeDetails = () => {
    setSelectedIssue(null);
    setOpenFinishedIssueDialog(false);
  };

  const handleRemove = async () => {
    if (!selectedIssue) return;
    setRemoveLoading(true);

    const response = await removeFinishedIssue(selectedIssue.id);

    if (response?.success) {
      setFinishedIssues((prev) => prev.filter((i) => i.id !== selectedIssue.id));
      closeDetails();
    }

    showSnackbarAlert(response?.msg || "Error removing issue", response?.success ? "success" : "error");
    setRemoveLoading(false);
    setOpenRemoveConfirmDialog(false);
  };

  const matchQuery = (issue) => {
    const q = normalize(query.trim());
    if (!q) return true;

    const byIssue = normalize(issue?.name).includes(q);
    const byModel = normalize(issue?.model?.name).includes(q);
    const byAdmin = adminContains(issue, q);
    const byAlts = alternativesContains(issue, q);
    const byCriteria = criteriaContains(issue?.criteria, q);

    if (searchBy === "issue") return byIssue;
    if (searchBy === "model") return byModel;
    if (searchBy === "admin") return byAdmin;
    if (searchBy === "alternatives") return byAlts;
    if (searchBy === "criteria") return byCriteria;

    return byIssue || byModel || byAdmin || byAlts || byCriteria;
  };

  const filteredBase = useMemo(() => (finishedIssues || []).filter(matchQuery), [finishedIssues, query, searchBy]);

  const filtered = useMemo(() => {
    const arr = [...filteredBase];

    if (sortBy === "nameAsc") {
      arr.sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    } else if (sortBy === "nameDesc") {
      arr.sort((a, b) => (b?.name || "").localeCompare(a?.name || ""));
    } else if (sortBy === "createdRecent") {
      arr.sort((a, b) => parseDateDDMMYYYY(b?.creationDate) - parseDateDDMMYYYY(a?.creationDate));
    } else {
      // closedRecent (default)
      arr.sort((a, b) => parseDateDDMMYYYY(b?.closureDate) - parseDateDDMMYYYY(a?.closureDate));
    }

    return arr;
  }, [filteredBase, sortBy]);

  const overview = useMemo(() => {
    const list = finishedIssues || [];
    const admin = list.filter((i) => i?.isAdmin).length;
    const withClosure = list.filter((i) => Boolean(i?.closureDate)).length;
    return { total: list.length, admin, withClosure, filtered: filtered.length };
  }, [finishedIssues, filtered.length]);

  if (loading) return <CircularLoading color="secondary" size={50} height="30vh" />;

  if (!finishedIssues || finishedIssues.length === 0) {
    return (
      <Stack sx={{ mt: 6 }} spacing={1} alignItems="center">
        <Typography variant="h4" sx={{ textAlign: "center", fontWeight: 950 }}>
          No finished issues
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", maxWidth: 520 }}>
          When an issue is resolved, it will appear here.
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      <Backdrop open={removeLoading} sx={{ zIndex: 999999 }}>
        <CircularLoading color="secondary" size={50} height="50vh" />
      </Backdrop>

      <Box sx={{ maxWidth: 2500, mx: "auto", px: { xs: 1.5, md: 2.5 }, pt: 2 }}>
        {isLgUp ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(560px, 1fr)",
              gridTemplateRows: "auto auto", // ✅ nada fijo
              gridTemplateAreas: `
                "header"
                "issues"
              `,
              gap: 2,
              alignItems: "start",
            }}
          >
            <Box sx={{ gridArea: "header", minWidth: 0 }}>
              <FinishedIssuesHeader
                overview={overview}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                query={query}
                setQuery={setQuery}
                searchBy={searchBy}
                setSearchBy={setSearchBy}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </Box>

            <Box sx={{ gridArea: "issues", minWidth: 0, width: "100%" }}>
              <Grid container spacing={2}>
                {filtered.map((issue) => {
                  const accent = alpha(theme.palette.success.main, 0.92);

                  return (
                    <Grid item xs={12} md={6} xl={4} key={issue.id}>
                      <FinishedIssueCard elevation={0} sx={{ height: CARD_HEIGHT }}>
                        <Box
                          onClick={() => openDetails(issue)}
                          sx={{
                            cursor: "pointer",
                            height: "100%",
                            position: "relative",
                            overflow: "hidden",
                            p: 2,
                            pl: 2.35,
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          {/* Left accent bar */}
                          <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, bgcolor: accent }} />

                          {/* Soft glow */}
                          <Box
                            sx={{
                              position: "absolute",
                              inset: 0,
                              pointerEvents: "none",
                              background: `
                                radial-gradient(560px 240px at 0% 0%, ${alpha(accent, 0.14)}, transparent 52%),
                                radial-gradient(520px 220px at 0% 0%, ${alpha(theme.palette.secondary.main, 0.05)}, transparent 58%)
                              `,
                            }}
                          />

                          <Stack spacing={1.05} sx={{ position: "relative", zIndex: 1, minHeight: 0, flex: 1 }}>
                            {/* Name + admin */}
                            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 980,
                                  lineHeight: 1.12,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                  minWidth: 0,
                                }}
                                title={issue?.name || ""}
                              >
                                {issue?.name || "—"}
                              </Typography>

                              {issue?.isAdmin ? (
                                <Tooltip title="You are the admin" placement="top" arrow>
                                  <Box
                                    sx={{
                                      mt: 0.25,
                                      color: alpha(theme.palette.common.white, 0.78),
                                      bgcolor: alpha(theme.palette.common.white, 0.06),
                                      border: "1px solid rgba(255,255,255,0.10)",
                                      borderRadius: 2,
                                      p: 0.55,
                                      lineHeight: 0,
                                    }}
                                  >
                                    <AdminPanelSettingsIcon sx={{ fontSize: 18 }} />
                                  </Box>
                                </Tooltip>
                              ) : null}
                            </Stack>

                            {/* Description */}
                            <Typography
                              variant="body2"
                              sx={{
                                color: alpha(theme.palette.common.white, 0.72),
                                display: "-webkit-box",
                                WebkitBoxOrient: "vertical",
                                WebkitLineClamp: 2,
                                overflow: "hidden",
                                minHeight: 42,
                                fontWeight: 850,
                              }}
                            >
                              {issue?.description || "—"}
                            </Typography>

                            {/* Status */}
                            <Box sx={{ mt: 0.2 }}>
                              <Pill tone="success">Finished</Pill>
                            </Box>

                            <Divider sx={{ opacity: 0.14, my: 0.7, borderColor: alpha("#fff", 0.12) }} />

                            {/* Dates */}
                            <Stack spacing={0.55}>
                              <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                                <CalendarMonthIcon sx={{ fontSize: 16, opacity: 0.75 }} />
                                <Typography variant="caption" sx={{ fontWeight: 900, color: alpha(theme.palette.common.white, 0.78) }}>
                                  Created: {issue?.creationDate || "—"}
                                </Typography>
                              </Stack>

                              {issue?.closureDate ? (
                                <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
                                  <AssignmentTurnedInIcon sx={{ fontSize: 16, opacity: 0.75 }} />
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 900, color: alpha(theme.palette.common.white, 0.78) }}
                                  >
                                    Closed: {issue?.closureDate}
                                  </Typography>
                                </Stack>
                              ) : null}
                            </Stack>

                            <Box sx={{ flex: 1 }} />
                          </Stack>
                        </Box>
                      </FinishedIssueCard>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Box>
        ) : (
          <>
            <FinishedIssuesHeader
              overview={overview}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              query={query}
              setQuery={setQuery}
              searchBy={searchBy}
              setSearchBy={setSearchBy}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />

            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                {filtered.map((issue) => (
                  <Grid item xs={12} md={6} key={issue.id}>
                    <FinishedIssueCard elevation={0} sx={{ height: isMobile ? "auto" : CARD_HEIGHT }}>
                      <Box
                        onClick={() => openDetails(issue)}
                        sx={{
                          cursor: "pointer",
                          height: "100%",
                          position: "relative",
                          overflow: "hidden",
                          p: 2,
                          pl: 2.35,
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <Box
                          sx={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 3,
                            bgcolor: alpha(theme.palette.success.main, 0.92),
                          }}
                        />

                        <Box
                          sx={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                            background: `radial-gradient(560px 240px at 0% 0%, ${alpha(
                              theme.palette.success.main,
                              0.14
                            )}, transparent 52%)`,
                          }}
                        />

                        <Stack spacing={1.05} sx={{ position: "relative", zIndex: 1 }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 980,
                                lineHeight: 1.12,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              {issue?.name || "—"}
                            </Typography>

                            {issue?.isAdmin ? (
                              <Box
                                sx={{
                                  mt: 0.25,
                                  color: alpha(theme.palette.common.white, 0.78),
                                  bgcolor: alpha(theme.palette.common.white, 0.06),
                                  border: "1px solid rgba(255,255,255,0.10)",
                                  borderRadius: 2,
                                  p: 0.55,
                                  lineHeight: 0,
                                }}
                              >
                                <AdminPanelSettingsIcon sx={{ fontSize: 18 }} />
                              </Box>
                            ) : null}
                          </Stack>

                          <Typography
                            variant="body2"
                            sx={{
                              color: alpha(theme.palette.common.white, 0.72),
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 2,
                              overflow: "hidden",
                              fontWeight: 850,
                            }}
                          >
                            {issue?.description || "—"}
                          </Typography>

                          <Box>
                            <Pill tone="success">Finished</Pill>
                          </Box>

                          <Divider sx={{ opacity: 0.14, my: 0.7, borderColor: alpha("#fff", 0.12) }} />

                          <Typography variant="caption" sx={{ fontWeight: 900, color: alpha(theme.palette.common.white, 0.78) }}>
                            Created: {issue?.creationDate || "—"}
                          </Typography>
                          {issue?.closureDate ? (
                            <Typography variant="caption" sx={{ fontWeight: 900, color: alpha(theme.palette.common.white, 0.78) }}>
                              Closed: {issue?.closureDate}
                            </Typography>
                          ) : null}
                        </Stack>
                      </Box>
                    </FinishedIssueCard>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </>
        )}
      </Box>

      {/* Dialog detalle */}
      {selectedIssue && (
        <FinishedIssueDialog
          selectedIssue={selectedIssue}
          openFinishedIssueDialog={openFinishedIssueDialog}
          handleCloseFinishedIssueDialog={closeDetails}
          handleRemoveFinishedIssue={() => setOpenRemoveConfirmDialog(true)}
          setOpenRemoveConfirmDialog={setOpenRemoveConfirmDialog}
        />
      )}

      {/* Confirm remove */}
      <GlassDialog
        open={openRemoveConfirmDialog}
        onClose={() => setOpenRemoveConfirmDialog(false)}
        PaperProps={{ elevation: 0 }}
        maxWidth="xs"
      >
        <Box sx={{ p: 2.25 }}>
          <Typography variant="h6" sx={{ fontWeight: 980 }}>
            Are you sure you want to remove this issue?
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75 }}>
            Other users will still be able to see it.
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "flex-end" }}>
            <Box
              component="button"
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                borderRadius: 12,
                padding: "8px 12px",
                cursor: "pointer",
              }}
              onClick={() => setOpenRemoveConfirmDialog(false)}
            >
              Cancel
            </Box>

            <Box
              component="button"
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                borderRadius: 12,
                padding: "8px 12px",
                cursor: "pointer",
                opacity: removeLoading ? 0.7 : 1,
              }}
              onClick={handleRemove}
              disabled={removeLoading}
            >
              {removeLoading ? "Removing..." : "Remove"}
            </Box>
          </Stack>
        </Box>
      </GlassDialog>
    </>
  );
};

export default FinishedIssuesPage;