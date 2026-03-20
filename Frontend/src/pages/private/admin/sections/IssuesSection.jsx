import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Backdrop,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { alpha, useTheme } from "@mui/material/styles";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CategoryIcon from "@mui/icons-material/Category";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import TimelineIcon from "@mui/icons-material/Timeline";
import PsychologyIcon from "@mui/icons-material/Psychology";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import CloseIcon from "@mui/icons-material/Close";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CalculateIcon from "@mui/icons-material/Calculate";
import GavelIcon from "@mui/icons-material/Gavel";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonRemoveAlt1Icon from "@mui/icons-material/PersonRemoveAlt1";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import UndoIcon from "@mui/icons-material/Undo";

import { auroraBg, glassSx as glassSxBase } from "../../../../components/ActiveIssuesHeader/ActiveIssuesHeader";
import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";
import { CircularLoading } from "../../../../components/LoadingProgress/CircularLoading";
import AddExpertsDomainsDialog from "../../../../components/AddExpertsDomainsDialog/AddExpertsDomainsDialog";

import { useSnackbarAlertContext } from "../../../../context/snackbarAlert/snackbarAlert.context";

import {
  getAllIssues,
  getIssueByIdAdmin,
  getIssueExpertsProgress,
  getIssueExpertEvaluations,
  getIssueExpertWeights,
  reassignIssueAdmin,
  getAllUsers,
  computeIssueWeightsAdminAction,
  resolveIssueAdminAction,
  removeIssueAdminAction,
  editIssueExpertsAdminAction,
} from "../../../../controllers/adminController";

/* --------------------------------
 * Helpers
 * -------------------------------- */

const formatWeightValue = (value) => {
  if (value == null || value === "") return "—";

  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);

  const raw = String(num);

  // Evitar notación rara tipo 1e-7
  if (raw.includes("e") || raw.includes("E")) {
    const fixed = num.toFixed(6).replace(/\.?0+$/, "");
    const [intPart, decPart = ""] = fixed.split(".");
    if (!decPart) return intPart;
    if (decPart.length <= 2) return fixed;
    return `${intPart}.${decPart.slice(0, 2)}...`;
  }

  const [intPart, decPart = ""] = raw.split(".");
  if (!decPart) return intPart;
  if (decPart.length <= 2) return raw;

  return `${intPart}.${decPart.slice(0, 2)}...`;
};

const normalize = (v) => String(v ?? "").toLowerCase().trim();

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
};

const toneColor = (theme, tone) => {
  if (tone === "success") return theme.palette.success.main;
  if (tone === "warning") return theme.palette.warning.main;
  if (tone === "error") return theme.palette.error.main;
  if (tone === "secondary") return theme.palette.secondary.main;
  return theme.palette.info.main;
};

const pillSx = (theme, tone = "info") => {
  const c = toneColor(theme, tone);
  return {
    height: 26,
    borderRadius: 999,
    fontWeight: 950,
    bgcolor: alpha(c, 0.1),
    borderColor: alpha(c, 0.25),
    color: "text.secondary",
  };
};

const sectionPanelSx = (theme) => ({
  borderRadius: 4,
  position: "relative",
  overflow: "hidden",
  ...glassSxBase(theme, 0.2, "crystal"),
  "&:after": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 55%)`,
    opacity: 0.18,
  },
});

const detailCardSx = (theme) => ({
  borderRadius: 4,
  p: 1.35,
  bgcolor: alpha(theme.palette.common.white, 0.04),
  border: "1px solid rgba(255,255,255,0.08)",
});

const prettyStage = (issue) =>
  issue?.currentStageMeta?.label ||
  issue?.currentStageMeta?.key ||
  issue?.currentStage ||
  "—";

const stageTone = (stageKey) => {
  if (stageKey === "finished") return "success";
  if (stageKey === "weightsFinished") return "warning";
  if (stageKey === "criteriaWeighting") return "info";
  if (stageKey === "alternativeEvaluation") return "info";
  return "secondary";
};

const getProgressTone = (pct) => {
  if (pct >= 100) return "success";
  if (pct > 0) return "warning";
  return "info";
};

const safeArray = (v) => (Array.isArray(v) ? v : []);

const pickInitialExpertId = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return "";

  const acceptedCurrent = rows.find(
    (r) => r?.currentParticipant && r?.invitationStatus === "accepted"
  );
  if (acceptedCurrent?.expert?.id) return acceptedCurrent.expert.id;

  const current = rows.find((r) => r?.currentParticipant);
  if (current?.expert?.id) return current.expert.id;

  return rows[0]?.expert?.id || "";
};

const getCellTooltip = (cell) => {
  if (!cell || typeof cell !== "object") return "";
  const parts = [];

  if (cell?.domain?.name) parts.push(`Domain: ${cell.domain.name}`);
  if (cell?.consensusPhase != null) parts.push(`Phase: ${cell.consensusPhase}`);
  if (cell?.timestamp) parts.push(`Saved: ${formatDateTime(cell.timestamp)}`);

  return parts.join(" · ");
};

const objectEntriesSafe = (obj) =>
  obj && typeof obj === "object" ? Object.entries(obj) : [];

const summarizeIssueStats = (issues = []) => {
  const total = issues.length;
  const active = issues.filter((i) => i?.active).length;
  const finished = issues.filter((i) => !i?.active).length;
  const consensus = issues.filter((i) => i?.isConsensus).length;
  const pairwise = issues.filter((i) => i?.model?.isPairwise).length;

  return { total, active, finished, consensus, pairwise };
};

const MetaChip = ({ tone = "info", children }) => {
  const theme = useTheme();
  return (
    <Chip
      label={children}
      size="small"
      variant="outlined"
      sx={pillSx(theme, tone)}
    />
  );
};

const InfoRow = ({ label, value }) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={0.8}
    alignItems={{ xs: "flex-start", sm: "baseline" }}
  >
    <Typography
      variant="body2"
      sx={{ fontWeight: 950, color: "text.secondary", minWidth: 150 }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{ fontWeight: 850, wordBreak: "break-word" }}
    >
      {value ?? "—"}
    </Typography>
  </Stack>
);

const StatCard = ({ icon, label, value, tone = "info" }) => {
  const theme = useTheme();
  const c = toneColor(theme, tone);

  return (
    <Paper
      elevation={0}
      sx={{
        ...detailCardSx(theme),
        p: 1.1,
        minWidth: 0,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Avatar
          sx={{
            width: 38,
            height: 38,
            bgcolor: alpha(c, 0.12),
            color: c,
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          {icon}
        </Avatar>

        <Stack spacing={0.1} sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
            {label}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 980,
              lineHeight: 1.05,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

const ReadOnlyWeights = ({ data }) => {
  const theme = useTheme();

  if (!data?.weights) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No weights information available.
      </Typography>
    );
  }

  const { weights } = data;
  const kind = weights.kind;

  const renderMapRows = (obj) => {
    const entries = objectEntriesSafe(obj);
    if (!entries.length) {
      return (
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
          No data.
        </Typography>
      );
    }

    return (
      <Stack spacing={0.75}>
        {entries.map(([k, v]) => (
          <Stack
            key={k}
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            sx={{
              p: 0.85,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.common.white, 0.03),
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 900, color: "text.secondary" }}>
              {k}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 850 }}>
              {formatWeightValue(v)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    );
  };

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <MetaChip tone="secondary">{kind || "unknown"}</MetaChip>
        {weights?.weightDoc?.completed ? <MetaChip tone="success">Completed</MetaChip> : <MetaChip tone="warning">Draft / pending</MetaChip>}
        {weights?.weightDoc?.updatedAt ? (
          <MetaChip tone="info">{formatDateTime(weights.weightDoc.updatedAt)}</MetaChip>
        ) : null}
      </Stack>

      {kind === "singleLeaf" ? renderMapRows(weights.singleLeafAutoWeights || {}) : null}

      {kind === "manualConsensus" ? (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary", mb: 0.8 }}>
            Manual weights
          </Typography>
          {renderMapRows(weights.manualWeights || {})}
        </Box>
      ) : null}

      {kind === "bwm" ? (
        <Stack spacing={1.1}>
          <InfoRow label="Best criterion" value={weights?.bwmData?.bestCriterion || "—"} />
          <InfoRow label="Worst criterion" value={weights?.bwmData?.worstCriterion || "—"} />

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary", mb: 0.8 }}>
              Best to others
            </Typography>
            {renderMapRows(weights?.bwmData?.bestToOthers || {})}
          </Box>

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary", mb: 0.8 }}>
              Others to worst
            </Typography>
            {renderMapRows(weights?.bwmData?.othersToWorst || {})}
          </Box>
        </Stack>
      ) : null}

      {weights?.resolvedWeights ? (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary", mb: 0.8 }}>
            Resolved / final weights in issue
          </Typography>
          {renderMapRows(weights.resolvedWeights)}
        </Box>
      ) : null}
    </Stack>
  );
};

const formatCellValue = (value) => {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const ReadOnlyAxCMatrix = ({ data }) => {
  const theme = useTheme();
  const evaluations = data?.evaluations || {};

  const alternatives = Object.keys(evaluations || {});
  const criteria = Array.from(
    new Set(
      alternatives.flatMap((altName) =>
        Object.keys(evaluations?.[altName] || {})
      )
    )
  );

  if (!alternatives.length || !criteria.length) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No evaluations found.
      </Typography>
    );
  }

  return (
    <TableContainer
      sx={{
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
        bgcolor: alpha(theme.palette.common.white, 0.02),
        overflowX: "auto",
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                fontWeight: 950,
                bgcolor: "#1a2a2fcf",
                minWidth: 180,
              }}
            >
              Alternative
            </TableCell>

            {criteria.map((criterionName) => (
              <TableCell
                key={criterionName}
                align="center"
                sx={{
                  fontWeight: 950,
                  bgcolor: "#1a2a2fcf",
                  minWidth: 150,
                }}
              >
                {criterionName}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {alternatives.map((altName) => (
            <TableRow key={altName}>
              <TableCell
                sx={{
                  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 900 }}>
                  {altName}
                </Typography>
              </TableCell>

              {criteria.map((criterionName) => {
                const cell = evaluations?.[altName]?.[criterionName] || null;
                const tooltip = getCellTooltip(cell);

                return (
                  <TableCell
                    key={`${altName}_${criterionName}`}
                    align="center"
                    sx={{
                      borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                    }}
                  >
                    <Tooltip title={tooltip || ""} arrow disableInteractive={!tooltip}>
                      <Stack spacing={0.15} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 850 }}>
                          {formatCellValue(cell?.value)}
                        </Typography>

                        {cell?.domain?.name ? (
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary", fontWeight: 850 }}
                          >
                            {cell.domain.name}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Tooltip>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const ReadOnlyPairwise = ({ data }) => {
  const theme = useTheme();
  const evaluations = data?.evaluations || {};
  const criteria = Object.keys(evaluations);

  if (!criteria.length) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No pairwise evaluations found.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.2}>
      {criteria.map((criterionName) => {
        const rows = safeArray(evaluations[criterionName]);
        const alternatives = rows.map((r) => r.id);

        return (
          <Paper key={criterionName} elevation={0} sx={{ ...detailCardSx(theme), p: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 980, mb: 0.85 }}>
              {criterionName}
            </Typography>

            <TableContainer
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                bgcolor: alpha(theme.palette.common.white, 0.02),
                overflowX: "auto",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf", minWidth: 140 }}>
                      Alternative
                    </TableCell>
                    {alternatives.map((alt) => (
                      <TableCell
                        key={`${criterionName}_${alt}`}
                        sx={{
                          fontWeight: 950,
                          bgcolor: "#1a2a2fcf",
                          minWidth: 110,
                          textAlign: "center",
                        }}
                      >
                        {alt}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${criterionName}_${row.id}`}>
                      <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>
                          {row.id}
                        </Typography>
                      </TableCell>

                      {alternatives.map((colAlt) => {
                        const cell = row[colAlt];
                        const tooltip = getCellTooltip(cell);
                        const value =
                          cell?.value == null || cell?.value === "" ? "—" : String(cell.value);

                        return (
                          <TableCell
                            key={`${criterionName}_${row.id}_${colAlt}`}
                            align="center"
                            sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}
                          >
                            <Tooltip title={tooltip || ""} arrow disableInteractive={!tooltip}>
                              <Typography variant="body2" sx={{ fontWeight: 850 }}>
                                {row.id === colAlt ? "—" : value}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        );
      })}
    </Stack>
  );
};

const AddExpertsPickerDialog = ({
  open,
  onClose,
  loading,
  availableExperts,
  expertsToAdd,
  setExpertsToAdd,
}) => {
  const theme = useTheme();
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    if (!open) setSearchFilter("");
  }, [open]);

  const filteredExperts = useMemo(() => {
    const q = normalize(searchFilter);
    if (!q) return availableExperts;

    return safeArray(availableExperts).filter((expert) => {
      const name = normalize(expert?.name);
      const email = normalize(expert?.email);
      const university = normalize(expert?.university);
      return name.includes(q) || email.includes(q) || university.includes(q);
    });
  }, [availableExperts, searchFilter]);

  const toggleExpertSelection = (email) => {
    setExpertsToAdd((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  return (
    <GlassDialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          ...auroraBg(theme, 0.14),
          "&:after": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 55%)`,
            opacity: 0.18,
          },
        }}
      >
        <Box sx={{ p: 2.1, position: "relative", zIndex: 1 }}>
          <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.1} alignItems="center">
              <Avatar
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: alpha(theme.palette.info.main, 0.12),
                  color: "info.main",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <PersonAddAlt1Icon />
              </Avatar>

              <Stack spacing={0.15}>
                <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.05 }}>
                  Add experts
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                  Select one or more experts to add to this issue.
                </Typography>
              </Stack>
            </Stack>

            <IconButton
              onClick={onClose}
              sx={{
                border: "1px solid rgba(255,255,255,0.10)",
                bgcolor: alpha(theme.palette.common.white, 0.04),
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ p: 2.1 }}>
        <Stack spacing={1.25}>
          <TextField
            size="small"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by name, email or university..."
            autoComplete="off"
            color="info"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                bgcolor: alpha(theme.palette.common.white, 0.04),
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ opacity: 0.72 }} />
                </InputAdornment>
              ),
            }}
          />

          {expertsToAdd.length > 0 ? (
            <Stack direction="row" spacing={0.75} flexWrap="wrap">
              {expertsToAdd.map((email) => (
                <Chip
                  key={email}
                  label={email}
                  onDelete={() =>
                    setExpertsToAdd((prev) => prev.filter((e) => e !== email))
                  }
                  variant="outlined"
                  sx={{
                    borderColor: alpha(theme.palette.common.white, 0.18),
                    color: alpha(theme.palette.common.white, 0.88),
                    bgcolor: alpha(theme.palette.common.white, 0.03),
                    "& .MuiChip-deleteIcon": {
                      color: alpha(theme.palette.common.white, 0.55),
                    },
                    "& .MuiChip-deleteIcon:hover": {
                      color: alpha(theme.palette.common.white, 0.85),
                    },
                  }}
                />
              ))}
            </Stack>
          ) : null}

          <TableContainer
            sx={{
              maxHeight: "52vh",
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
              bgcolor: alpha(theme.palette.common.white, 0.02),
              overflow: "auto",
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf" }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf" }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf" }}>University</TableCell>
                  <TableCell sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf", width: 110, textAlign: "center" }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                        Loading experts...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredExperts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                        No available experts found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExperts.map((expert) => {
                    const selected = expertsToAdd.includes(expert.email);

                    return (
                      <TableRow
                        key={expert.email}
                        hover
                        sx={{
                          "&:hover": {
                            bgcolor: alpha(theme.palette.info.main, 0.06),
                          },
                        }}
                      >
                        <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                          <Typography variant="body2" sx={{ fontWeight: 900 }}>
                            {expert.name || "Unknown"}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                          <Typography variant="body2" sx={{ fontWeight: 850 }}>
                            {expert.email || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                          <Typography variant="body2" sx={{ fontWeight: 850 }}>
                            {expert.university || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell
                          align="center"
                          sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}
                        >
                          <Tooltip title={selected ? "Unselect expert" : "Select expert"} arrow>
                            <IconButton
                              size="small"
                              onClick={() => toggleExpertSelection(expert.email)}
                              sx={{
                                border: "1px solid rgba(255,255,255,0.10)",
                                bgcolor: alpha(
                                  selected ? theme.palette.warning.main : theme.palette.common.white,
                                  selected ? 0.12 : 0.03
                                ),
                              }}
                            >
                              {selected ? (
                                <UndoIcon fontSize="small" />
                              ) : (
                                <PersonAddAlt1Icon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ opacity: 0.12 }} />

          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={1}
            justifyContent="flex-end"
          >
            <Button onClick={onClose} color="warning" variant="outlined">
              Close
            </Button>

            <Button onClick={onClose} color="info" variant="outlined" startIcon={<DoneAllIcon />}>
              Use selection
            </Button>
          </Stack>
        </Stack>
      </Box>
    </GlassDialog>
  );
};

/* --------------------------------
 * Main component
 * -------------------------------- */

export default function IssuesSection() {
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [issues, setIssues] = useState([]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [consensusFilter, setConsensusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  const [selectedIssueRow, setSelectedIssueRow] = useState(null);
  const [issueDetail, setIssueDetail] = useState(null);
  const [issueExpertsProgress, setIssueExpertsProgress] = useState([]);

  const [selectedExpertId, setSelectedExpertId] = useState("");
  const [expertEvalLoading, setExpertEvalLoading] = useState(false);
  const [expertEvaluations, setExpertEvaluations] = useState(null);
  const [expertWeights, setExpertWeights] = useState(null);

  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [newAdminId, setNewAdminId] = useState("");

  const [actionBusy, setActionBusy] = useState({
    compute: false,
    resolve: false,
    remove: false,
    editExperts: false,
  });
  const [confirmAction, setConfirmAction] = useState(null);

  const [addExpertsOpen, setAddExpertsOpen] = useState(false);
  const [addExpertsLoading, setAddExpertsLoading] = useState(false);
  const [allExperts, setAllExperts] = useState([]);
  const [expertsToAdd, setExpertsToAdd] = useState([]);
  const [expertsToRemove, setExpertsToRemove] = useState([]);
  const [assignDomainsOpen, setAssignDomainsOpen] = useState(false);

  const fetchIssuesData = async ({ keepLoading = false } = {}) => {
    try {
      if (keepLoading) setRefreshing(true);
      else setLoading(true);

      const res = await getAllIssues();

      if (!res?.success) {
        showSnackbarAlert(res?.msg || "Error fetching issues", "error");
        setIssues([]);
        return;
      }

      setIssues(Array.isArray(res.issues) ? res.issues : []);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error fetching issues", "error");
      setIssues([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIssuesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetExpertEditionState = () => {
    setExpertsToAdd([]);
    setExpertsToRemove([]);
    setAddExpertsOpen(false);
    setAssignDomainsOpen(false);
  };

  const loadIssueDetail = async (issueId, issueRow = null) => {
    if (!issueId) return;

    setDetailLoading(true);
    setExpertEvaluations(null);
    setExpertWeights(null);

    try {
      const [detailRes, progressRes] = await Promise.all([
        getIssueByIdAdmin(issueId),
        getIssueExpertsProgress(issueId),
      ]);

      if (!detailRes?.success) {
        showSnackbarAlert(detailRes?.msg || "Error fetching issue detail", "error");
        return;
      }

      if (!progressRes?.success) {
        showSnackbarAlert(progressRes?.msg || "Error fetching issue progress", "error");
        return;
      }

      setSelectedIssueRow(issueRow || null);
      setIssueDetail(detailRes.issue || null);

      const progressRows = Array.isArray(progressRes.experts) ? progressRes.experts : [];
      setIssueExpertsProgress(progressRows);

      const initialExpertId = pickInitialExpertId(progressRows);
      setSelectedExpertId((prev) => {
        if (prev && progressRows.some((r) => r?.expert?.id === prev)) return prev;
        return initialExpertId;
      });
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error fetching issue detail", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = async (issueRow) => {
    resetExpertEditionState();
    setDetailOpen(true);
    setDetailTab(0);
    await loadIssueDetail(issueRow?.id, issueRow);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailTab(0);
    setSelectedIssueRow(null);
    setIssueDetail(null);
    setIssueExpertsProgress([]);
    setSelectedExpertId("");
    setExpertEvaluations(null);
    setExpertWeights(null);
    setConfirmAction(null);
    resetExpertEditionState();
  };

  useEffect(() => {
    const run = async () => {
      if (!detailOpen || !issueDetail?.id || !selectedExpertId) {
        setExpertEvaluations(null);
        setExpertWeights(null);
        return;
      }

      setExpertEvalLoading(true);

      try {
        const [evalRes, weightsRes] = await Promise.all([
          getIssueExpertEvaluations(issueDetail.id, selectedExpertId),
          getIssueExpertWeights(issueDetail.id, selectedExpertId),
        ]);

        if (!evalRes?.success) {
          showSnackbarAlert(evalRes?.msg || "Error fetching expert evaluations", "error");
          setExpertEvaluations(null);
        } else {
          setExpertEvaluations(evalRes);
        }

        if (!weightsRes?.success) {
          showSnackbarAlert(weightsRes?.msg || "Error fetching expert weights", "error");
          setExpertWeights(null);
        } else {
          setExpertWeights(weightsRes);
        }
      } catch (err) {
        console.error(err);
        showSnackbarAlert("Unexpected error fetching expert review", "error");
        setExpertEvaluations(null);
        setExpertWeights(null);
      } finally {
        setExpertEvalLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOpen, issueDetail?.id, selectedExpertId]);

  const filteredIssues = useMemo(() => {
    const q = normalize(search);

    return safeArray(issues).filter((issue) => {
      const matchesSearch =
        !q ||
        normalize(issue?.name).includes(q) ||
        normalize(issue?.description).includes(q) ||
        normalize(issue?.model?.name).includes(q) ||
        normalize(issue?.admin?.email).includes(q) ||
        normalize(issue?.admin?.name).includes(q);

      const matchesActive =
        activeFilter === "all"
          ? true
          : activeFilter === "active"
            ? Boolean(issue?.active)
            : !issue?.active;

      const matchesConsensus =
        consensusFilter === "all"
          ? true
          : consensusFilter === "consensus"
            ? Boolean(issue?.isConsensus)
            : !issue?.isConsensus;

      const matchesStage =
        stageFilter === "all"
          ? true
          : normalize(issue?.currentStage) === normalize(stageFilter);

      return matchesSearch && matchesActive && matchesConsensus && matchesStage;
    });
  }, [issues, search, activeFilter, consensusFilter, stageFilter]);

  const stats = useMemo(() => summarizeIssueStats(issues), [issues]);

  const stageOptions = useMemo(() => {
    const map = new Map();

    safeArray(issues).forEach((issue) => {
      const key = issue?.currentStage || "unknown";
      const label = prettyStage(issue);
      if (!map.has(key)) map.set(key, label);
    });

    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [issues]);

  const selectedExpertProgress = useMemo(() => {
    return issueExpertsProgress.find((r) => r?.expert?.id === selectedExpertId) || null;
  }, [issueExpertsProgress, selectedExpertId]);

  const adminCandidates = useMemo(() => {
    return safeArray(admins).filter(
      (u) => u?.role === "admin" && u?.accountConfirm
    );
  }, [admins]);

  const currentParticipantEmails = useMemo(() => {
    return safeArray(issueExpertsProgress)
      .filter((r) => r?.currentParticipant && r?.expert?.email)
      .map((r) => r.expert.email);
  }, [issueExpertsProgress]);

  const availableExperts = useMemo(() => {
    return safeArray(allExperts).filter((user) => {
      if (!user?.email) return false;
      if (user?.role === "admin") return false;
      if (user?.accountConfirm === false) return false;
      if (currentParticipantEmails.includes(user.email)) return false;
      if (expertsToAdd.includes(user.email)) return false;
      return true;
    });
  }, [allExperts, currentParticipantEmails, expertsToAdd]);

  const pendingAddExpertsInfo = useMemo(() => {
    return safeArray(allExperts).filter((u) => expertsToAdd.includes(u.email));
  }, [allExperts, expertsToAdd]);

  const currentEditableExpertsCount = useMemo(() => {
    return safeArray(issueExpertsProgress).filter((r) => r?.currentParticipant).length;
  }, [issueExpertsProgress]);

  const resultingExpertsCount = useMemo(() => {
    return currentEditableExpertsCount - expertsToRemove.length + expertsToAdd.length;
  }, [currentEditableExpertsCount, expertsToAdd.length, expertsToRemove.length]);

  const issueForDomains = useMemo(() => {
    if (!issueDetail) return null;

    const fallbackCriteria = safeArray(issueDetail?.leafCriteria).map((c) => ({
      name: c?.name,
      type: c?.type,
      children: [],
    }));

    return {
      ...issueDetail,
      alternatives: safeArray(issueDetail?.alternatives),
      criteria: safeArray(issueDetail?.criteria).length ? issueDetail.criteria : fallbackCriteria,
    };
  }, [issueDetail]);

  const openReassignDialog = async () => {
    if (!issueDetail?.id) return;

    setReassignOpen(true);
    setNewAdminId("");
    setAdminsLoading(true);

    try {
      const res = await getAllUsers({ includeAdmins: true });

      if (!res?.success) {
        showSnackbarAlert(res?.msg || "Error fetching admins", "error");
        setAdmins([]);
        return;
      }

      setAdmins(Array.isArray(res.users) ? res.users : []);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error fetching admins", "error");
      setAdmins([]);
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleReassignAdmin = async () => {
    if (!issueDetail?.id || !newAdminId) {
      showSnackbarAlert("Select a new admin", "error");
      return;
    }

    setReassignLoading(true);

    try {
      const res = await reassignIssueAdmin({
        issueId: issueDetail.id,
        newAdminId,
      });

      if (!res?.success) {
        showSnackbarAlert(res?.msg || "Error reassigning issue admin", "error");
        return;
      }

      showSnackbarAlert(res?.msg || "Issue admin reassigned successfully", "success");
      setReassignOpen(false);
      await fetchIssuesData({ keepLoading: true });
      await loadIssueDetail(issueDetail.id, selectedIssueRow);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error reassigning issue admin", "error");
    } finally {
      setReassignLoading(false);
    }
  };

  const openConfirmAction = ({ key, title, description, run }) => {
    setConfirmAction({
      key,
      title,
      description,
      run,
    });
  };

  const closeConfirmAction = () => {
    setConfirmAction(null);
  };

  const handleRunConfirmedAction = async () => {
    if (!confirmAction?.run || !issueDetail?.id) return;

    const key = confirmAction.key;
    setActionBusy((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await confirmAction.run();

      if (!res?.success) {
        showSnackbarAlert(res?.msg || "Action failed", "error");
        return;
      }

      showSnackbarAlert(res?.msg || "Action completed successfully", "success");
      closeConfirmAction();

      if (key === "remove") {
        closeDetail();
        await fetchIssuesData({ keepLoading: true });
        return;
      }

      await fetchIssuesData({ keepLoading: true });
      await loadIssueDetail(issueDetail.id, selectedIssueRow);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error executing action", "error");
    } finally {
      setActionBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleOpenAddExperts = async () => {
    if (!issueDetail?.creatorActionsState?.canEditExperts) {
      showSnackbarAlert("You cannot edit experts in this issue right now.", "error");
      return;
    }

    setAddExpertsOpen(true);
    setAddExpertsLoading(true);

    try {
      const res = await getAllUsers({ includeAdmins: false });

      if (!res?.success) {
        showSnackbarAlert(res?.msg || "Error fetching experts", "error");
        setAllExperts([]);
        return;
      }

      setAllExperts(Array.isArray(res.users) ? res.users : []);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error fetching experts", "error");
      setAllExperts([]);
    } finally {
      setAddExpertsLoading(false);
    }
  };

  const toggleRemoveExpert = (email) => {
    setExpertsToRemove((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  const handleResetExpertChanges = () => {
    setExpertsToAdd([]);
    setExpertsToRemove([]);
  };

  const processEditExperts = async (domainAssignments = null) => {
    if (!issueDetail?.id) return;

    setActionBusy((prev) => ({ ...prev, editExperts: true }));

    try {
      const res = await editIssueExpertsAdminAction({
        issueId: issueDetail.id,
        expertsToAdd,
        expertsToRemove,
        domainAssignments,
      });

      if (!res?.success) {
        showSnackbarAlert(res?.msg || "Error updating experts", "error");
        return;
      }

      showSnackbarAlert(res?.msg || "Experts updated successfully", "success");

      setAssignDomainsOpen(false);
      setAddExpertsOpen(false);
      setExpertsToAdd([]);
      setExpertsToRemove([]);

      await fetchIssuesData({ keepLoading: true });
      await loadIssueDetail(issueDetail.id, selectedIssueRow);
    } catch (err) {
      console.error(err);
      showSnackbarAlert("Unexpected error updating experts", "error");
    } finally {
      setActionBusy((prev) => ({ ...prev, editExperts: false }));
    }
  };

  const handleSaveExpertsChanges = async () => {
    if (!issueDetail?.creatorActionsState?.canEditExperts) {
      showSnackbarAlert("You cannot edit experts in this issue right now.", "error");
      return;
    }

    if (expertsToAdd.length === 0 && expertsToRemove.length === 0) {
      showSnackbarAlert("There are no pending expert changes.", "info");
      return;
    }

    if (resultingExpertsCount < 1) {
      showSnackbarAlert("An issue must have at least one current expert.", "error");
      return;
    }

    if (expertsToAdd.length > 0) {
      if (
        !safeArray(issueForDomains?.alternatives).length ||
        !safeArray(issueForDomains?.criteria).length
      ) {
        showSnackbarAlert(
          "Issue detail must include alternatives and criteria to assign expression domains.",
          "error"
        );
        return;
      }

      setAssignDomainsOpen(true);
      return;
    }

    await processEditExperts(null);
  };

  const handleConfirmDomains = async (domainAssignments) => {
    await processEditExperts(domainAssignments);
  };

  if (loading) {
    return <CircularLoading color="secondary" size={44} height="28vh" />;
  }

  return (
    <>
      <Backdrop
        open={
          reassignLoading ||
          actionBusy.compute ||
          actionBusy.resolve ||
          actionBusy.remove ||
          actionBusy.editExperts
        }
        sx={{ zIndex: 999999 }}
      >
        <CircularLoading color="secondary" size={46} height="50vh" />
      </Backdrop>

      <Stack spacing={1.15}>
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(5, minmax(0, 1fr))",
            },
          }}
        >
          <StatCard icon={<AssignmentIcon />} label="Total issues" value={stats.total} tone="info" />
          <StatCard icon={<TimelineIcon />} label="Active" value={stats.active} tone="warning" />
          <StatCard icon={<RuleOutlinedIcon />} label="Finished" value={stats.finished} tone="success" />
          <StatCard icon={<PeopleAltIcon />} label="Consensus" value={stats.consensus} tone="secondary" />
          <StatCard icon={<CompareArrowsIcon />} label="Pairwise" value={stats.pairwise} tone="info" />
        </Box>

        <Paper elevation={0} sx={{ ...sectionPanelSx(theme), p: 1 }}>
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Stack
              direction={{ xs: "column", xl: "row" }}
              spacing={1.2}
              alignItems={{ xs: "stretch", xl: "center" }}
              justifyContent="space-between"
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", md: "center" }}
              >
                <TextField
                  size="small"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, description, model or admin..."
                  autoComplete="off"
                  color="info"
                  sx={{
                    minWidth: { xs: "100%", md: 380 },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.common.white, 0.04),
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ opacity: 0.72 }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={activeFilter}
                    color="info"
                    onChange={(e) => setActiveFilter(e.target.value)}
                    sx={{
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.common.white, 0.04),
                    }}
                  >
                    <MenuItem value="all">All issues</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="finished">Finished</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 155 }}>
                  <Select
                    value={consensusFilter}
                    color="info"
                    onChange={(e) => setConsensusFilter(e.target.value)}
                    sx={{
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.common.white, 0.04),
                    }}
                  >
                    <MenuItem value="all">All consensus</MenuItem>
                    <MenuItem value="consensus">Consensus</MenuItem>
                    <MenuItem value="noConsensus">No consensus</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <Select
                    value={stageFilter}
                    color="info"
                    onChange={(e) => setStageFilter(e.target.value)}
                    sx={{
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.common.white, 0.04),
                    }}
                  >
                    <MenuItem value="all">All stages</MenuItem>
                    {stageOptions.map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Tooltip title="Refresh issues">
                  <span>
                    <Button
                      variant="outlined"
                      color="info"
                      startIcon={<RefreshIcon />}
                      onClick={() => fetchIssuesData({ keepLoading: true })}
                      disabled={refreshing}
                      sx={{ borderRadius: 999, fontWeight: 900 }}
                    >
                      Refresh
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ backgroundColor: "transparent" }}>
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <TableContainer
              sx={{
                maxHeight: "64vh",
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                bgcolor: alpha(theme.palette.common.white, 0.02),
                overflow: "auto",
                scrollbarWidth: "thin",
                scrollbarColor: `${alpha(theme.palette.common.white, 0.22)} transparent`,
                "&::-webkit-scrollbar": { width: 8, height: 8 },
                "&::-webkit-scrollbar-track": { background: "transparent" },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: alpha(theme.palette.common.white, 0.16),
                  borderRadius: 999,
                  border: "2px solid transparent",
                  backgroundClip: "content-box",
                },
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {[
                      "Issue",
                      "Model",
                      "Admin",
                      "Stage",
                      "Status",
                      "Experts",
                      "Progress",
                      "Closure",
                    ].map((head) => (
                      <TableCell
                        key={head}
                        sx={{
                          fontWeight: 950,
                          color: alpha(theme.palette.common.white, 0.84),
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
                          bgcolor: "#1a2a2fcf",
                          py: 1.1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {head}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredIssues.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        sx={{
                          py: 4,
                          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                        }}
                      >
                        <Stack spacing={0.6} alignItems="center">
                          <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                            No issues found
                          </Typography>
                          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                            Try another search or filter combination.
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIssues.map((issue) => {
                      const metrics = issue?.metrics || {};
                      const progressTotal = metrics.acceptedExperts || 0;
                      const progressDone =
                        issue?.currentStage === "criteriaWeighting" || issue?.currentStage === "weightsFinished"
                          ? metrics.weightsDoneAccepted || 0
                          : metrics.evaluationsDoneAccepted || 0;

                      const progressPct =
                        progressTotal > 0
                          ? Math.round((progressDone / progressTotal) * 100)
                          : 0;

                      return (
                        <TableRow
                          key={issue.id}
                          onClick={() => openDetail(issue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openDetail(issue);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          sx={{
                            cursor: "pointer",
                            transition: "background-color 0.16s ease, transform 0.16s ease",
                            "&:hover": {
                              bgcolor: alpha(theme.palette.info.main, 0.06),
                            },
                            "&:focus-visible": {
                              outline: `2px solid ${alpha(theme.palette.info.main, 0.55)}`,
                              outlineOffset: "-2px",
                              bgcolor: alpha(theme.palette.info.main, 0.08),
                            },
                          }}
                        >
                          <TableCell
                            sx={{
                              borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                              py: 1.15,
                              minWidth: 250,
                            }}
                          >
                            <Stack spacing={0.15}>
                              <Typography variant="body2" sx={{ fontWeight: 950 }}>
                                {issue?.name || "Unnamed issue"}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                                {issue?.description || "No description"}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15 }} >
                            <Stack spacing={0.25}>
                              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                {issue?.model?.name || "—"}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15, minWidth: 180 }}>
                            <Stack spacing={0.15}>
                              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                {issue?.admin?.name || "—"}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                                {issue?.admin?.email || "—"}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15 }} >
                            <MetaChip tone={stageTone(issue?.currentStage)}>
                              {prettyStage(issue)}
                            </MetaChip>
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15 }}>
                            <Stack direction="row" spacing={0.6} flexWrap="wrap">
                              <MetaChip tone={issue?.active ? "warning" : "success"}>
                                {issue?.active ? "Active" : "Finished"}
                              </MetaChip>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15, minWidth: 160 }}>
                            <Stack direction="row" spacing={0.6} flexWrap="wrap">
                              <Chip
                                label={`A ${metrics.acceptedExperts || 0}`}
                                size="small"
                                variant="outlined"
                                sx={pillSx(theme, "success")}
                              />
                              <Chip
                                label={`P ${metrics.pendingExperts || 0}`}
                                size="small"
                                variant="outlined"
                                sx={pillSx(theme, "warning")}
                              />
                              <Chip
                                label={`D ${metrics.declinedExperts || 0}`}
                                size="small"
                                variant="outlined"
                                sx={pillSx(theme, "error")}
                              />
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15, minWidth: 130 }}>
                            <Stack spacing={0.35}>
                              <Stack direction="row" spacing={0.6} alignItems="center">
                                <MetaChip tone={getProgressTone(progressPct)}>
                                  {progressDone}/{progressTotal}
                                </MetaChip>
                                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                                  {progressPct}%
                                </Typography>
                              </Stack>

                              {metrics.consensusRounds > 0 ? (
                                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                                  Rounds: {metrics.consensusRounds}
                                </Typography>
                              ) : null}
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15, whiteSpace: "nowrap" }}>
                            <Typography variant="body2" sx={{ fontWeight: 850 }}>
                              {issue?.closureDate || "—"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {isMdDown ? (
              <Typography
                variant="caption"
                sx={{ display: "block", mt: 1, color: "text.secondary", fontWeight: 850 }}
              >
                Scroll horizontally to view all columns.
              </Typography>
            ) : null}
          </Box>
        </Paper>
      </Stack>

      {/* Detail dialog */}
      <GlassDialog
        open={detailOpen}
        onClose={closeDetail}
        maxWidth="xl"
        fullWidth
      >
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            ...auroraBg(theme, 0.16),
            "&:after": {
              content: '""',
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 55%)`,
              opacity: 0.18,
            },
          }}
        >
          <Box sx={{ p: 2.1, position: "relative", zIndex: 1 }}>
            <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
                <Avatar
                  sx={{
                    width: 44,
                    height: 44,
                    bgcolor: alpha(theme.palette.warning.main, 0.12),
                    color: "warning.main",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <AssignmentIcon />
                </Avatar>

                <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 980,
                      lineHeight: 1.05,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {issueDetail?.name || selectedIssueRow?.name || "Issue detail"}
                  </Typography>

                  <Stack direction="row" spacing={0.75} flexWrap="wrap">
                    <MetaChip tone={issueDetail?.active ? "warning" : "success"}>
                      {issueDetail?.active ? "Active" : "Finished"}
                    </MetaChip>
                    <MetaChip tone={stageTone(issueDetail?.currentStage)}>
                      {prettyStage(issueDetail)}
                    </MetaChip>
                    {issueDetail?.isConsensus ? (
                      <MetaChip tone="secondary">Consensus</MetaChip>
                    ) : (
                      <MetaChip tone="info">No consensus</MetaChip>
                    )}
                    {issueDetail?.model?.name ? (
                      <MetaChip tone="info">{issueDetail.model.name}</MetaChip>
                    ) : null}
                  </Stack>
                </Stack>
              </Stack>

              <IconButton
                onClick={closeDetail}
                sx={{
                  border: "1px solid rgba(255,255,255,0.10)",
                  bgcolor: alpha(theme.palette.common.white, 0.04),
                }}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
          </Box>
        </Box>

        {detailLoading ? (
          <CircularLoading color="secondary" size={42} height="36vh" />
        ) : !issueDetail ? (
          <Box sx={{ p: 2.1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              Issue detail is not available.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 2.1 }}>
            <Tabs
              value={detailTab}
              onChange={(_, v) => setDetailTab(v)}
              textColor="secondary"
              indicatorColor="secondary"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                mb: 1.5,
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 950,
                  minHeight: 42,
                },
              }}
            >
              <Tab label="Overview" />
              <Tab label="Experts" />
              <Tab label="Expert review" />
            </Tabs>

            {/* Overview */}
            {detailTab === 0 ? (
              <Stack spacing={1.25}>
                <Box
                  sx={{
                    display: "grid",
                    gap: 1,
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      xl: "repeat(6, minmax(0, 1fr))",
                    },
                  }}
                >
                  <StatCard icon={<AssignmentIcon />} label="Alternatives" value={issueDetail?.metrics?.totalAlternatives || 0} tone="info" />
                  <StatCard icon={<CategoryIcon />} label="Leaf criteria" value={issueDetail?.metrics?.totalLeafCriteria || 0} tone="info" />
                  <StatCard icon={<PeopleAltIcon />} label="Experts" value={issueDetail?.metrics?.totalExperts || 0} tone="warning" />
                  <StatCard icon={<AnalyticsOutlinedIcon />} label="Consensus rounds" value={issueDetail?.consensus?.rounds || 0} tone="secondary" />
                  <StatCard icon={<CompareArrowsIcon />} label="Scenarios" value={safeArray(issueDetail?.scenarios).length} tone="secondary" />
                  <StatCard icon={<FactCheckOutlinedIcon />} label="Filled cells" value={issueDetail?.metrics?.totalFilledEvaluationCells || 0} tone="success" />
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gap: 1.1,
                    gridTemplateColumns: { xs: "1fr", xl: "1.15fr 0.85fr" },
                  }}
                >
                  <Paper elevation={0} sx={detailCardSx(theme)}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <InfoOutlinedIcon fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                        Issue information
                      </Typography>
                    </Stack>

                    <Stack spacing={0.9}>
                      <InfoRow label="Name" value={issueDetail?.name} />
                      <InfoRow label="Description" value={issueDetail?.description || "—"} />
                      <InfoRow label="Current admin" value={issueDetail?.admin ? `${issueDetail.admin.name} (${issueDetail.admin.email})` : "—"} />
                      <InfoRow label="Model" value={issueDetail?.model?.name || "—"} />
                      <InfoRow label="Stage" value={prettyStage(issueDetail)} />
                      <InfoRow label="Weighting mode" value={issueDetail?.weightingMode || "—"} />
                      <InfoRow label="Creation date" value={issueDetail?.creationDate || "—"} />
                      <InfoRow label="Closure date" value={issueDetail?.closureDate || "—"} />
                    </Stack>

                    <Divider sx={{ opacity: 0.12, my: 1.4 }} />

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      justifyContent="flex-end"
                    >
                      <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<SwapHorizIcon />}
                        onClick={openReassignDialog}
                        sx={{ borderRadius: 999, fontWeight: 950 }}
                      >
                        Reassign admin
                      </Button>
                    </Stack>
                  </Paper>

                  <Paper elevation={0} sx={detailCardSx(theme)}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <RuleOutlinedIcon fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                        Creator actions
                      </Typography>
                    </Stack>

                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.25 }}>
                      <MetaChip tone={issueDetail?.creatorActionsState?.canEditExperts ? "success" : "info"}>
                        Edit experts: {issueDetail?.creatorActionsState?.canEditExperts ? "yes" : "no"}
                      </MetaChip>

                      <MetaChip tone={issueDetail?.creatorActionsState?.canRemoveIssue ? "success" : "info"}>
                        Remove issue: {issueDetail?.creatorActionsState?.canRemoveIssue ? "yes" : "no"}
                      </MetaChip>

                      <MetaChip tone={issueDetail?.creatorActionsState?.canComputeWeights ? "warning" : "info"}>
                        Compute weights: {issueDetail?.creatorActionsState?.canComputeWeights ? "ready" : "not ready"}
                      </MetaChip>

                      <MetaChip tone={issueDetail?.creatorActionsState?.canResolveIssue ? "warning" : "info"}>
                        Resolve issue: {issueDetail?.creatorActionsState?.canResolveIssue ? "ready" : "not ready"}
                      </MetaChip>
                    </Stack>

                    <Stack spacing={1}>
                      <LoadingButton
                        variant="outlined"
                        color="secondary"
                        startIcon={<EditOutlinedIcon />}
                        disabled={!issueDetail?.creatorActionsState?.canEditExperts}
                        onClick={() => setDetailTab(1)}
                        sx={{ borderRadius: 999, fontWeight: 950, justifyContent: "flex-start" }}
                      >
                        Manage experts
                      </LoadingButton>

                      <LoadingButton
                        variant="outlined"
                        color="warning"
                        startIcon={<CalculateIcon />}
                        loading={actionBusy.compute}
                        disabled={!issueDetail?.creatorActionsState?.canComputeWeights}
                        onClick={() =>
                          openConfirmAction({
                            key: "compute",
                            title: "Compute weights",
                            description: "This will compute the final criteria weights and move the issue forward.",
                            run: () => computeIssueWeightsAdminAction(issueDetail.id),
                          })
                        }
                        sx={{ borderRadius: 999, fontWeight: 950, justifyContent: "flex-start" }}
                      >
                        Compute weights
                      </LoadingButton>

                      <LoadingButton
                        variant="outlined"
                        color="warning"
                        startIcon={<GavelIcon />}
                        loading={actionBusy.resolve}
                        disabled={!issueDetail?.creatorActionsState?.canResolveIssue}
                        onClick={() =>
                          openConfirmAction({
                            key: "resolve",
                            title: "Resolve issue",
                            description: "This will resolve the issue using the corresponding model.",
                            run: () => resolveIssueAdminAction(issueDetail.id),
                          })
                        }
                        sx={{ borderRadius: 999, fontWeight: 950, justifyContent: "flex-start" }}
                      >
                        Resolve issue
                      </LoadingButton>

                      <LoadingButton
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        loading={actionBusy.remove}
                        disabled={!issueDetail?.creatorActionsState?.canRemoveIssue}
                        onClick={() =>
                          openConfirmAction({
                            key: "remove",
                            title: "Remove issue",
                            description: "This will permanently remove the issue and its related data.",
                            run: () => removeIssueAdminAction(issueDetail.id),
                          })
                        }
                        sx={{ borderRadius: 999, fontWeight: 950, justifyContent: "flex-start" }}
                      >
                        Remove issue
                      </LoadingButton>
                    </Stack>
                  </Paper>
                </Box>

                <Paper elevation={0} sx={detailCardSx(theme)}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <InfoOutlinedIcon fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                      Model parameters
                    </Typography>
                  </Stack>

                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 1.2,
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.common.white, 0.03),
                      border: "1px solid rgba(255,255,255,0.06)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: 12,
                      fontWeight: 800,
                      color: alpha(theme.palette.common.white, 0.86),
                      maxHeight: 280,
                      overflow: "auto",
                    }}
                  >
                    {JSON.stringify(issueDetail?.modelParameters || {}, null, 2)}
                  </Box>
                </Paper>

                <Box
                  sx={{
                    display: "grid",
                    gap: 1.1,
                    gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" },
                  }}
                >
                  <Paper elevation={0} sx={detailCardSx(theme)}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <AssignmentIcon fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                        Alternatives
                      </Typography>
                    </Stack>

                    <Stack spacing={0.65}>
                      {safeArray(issueDetail?.alternatives).length === 0 ? (
                        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                          No alternatives.
                        </Typography>
                      ) : (
                        safeArray(issueDetail?.alternatives).map((alt) => (
                          <Box
                            key={alt.id}
                            sx={{
                              px: 1,
                              py: 0.8,
                              borderRadius: 3,
                              bgcolor: alpha(theme.palette.common.white, 0.03),
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 850 }}>
                              {alt.name}
                            </Typography>
                          </Box>
                        ))
                      )}
                    </Stack>
                  </Paper>

                  <Paper elevation={0} sx={detailCardSx(theme)}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <CategoryIcon fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                        Leaf criteria / final weights
                      </Typography>
                    </Stack>

                    <Stack spacing={0.65}>
                      {safeArray(issueDetail?.leafCriteria).length === 0 ? (
                        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                          No leaf criteria.
                        </Typography>
                      ) : (
                        safeArray(issueDetail?.leafCriteria).map((crit) => (
                          <Box
                            key={crit.id}
                            sx={{
                              px: 1,
                              py: 0.8,
                              borderRadius: 3,
                              bgcolor: alpha(theme.palette.common.white, 0.03),
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                              <Stack spacing={0.1}>
                                <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                  {crit.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                                  {crit.type || "—"}
                                </Typography>
                              </Stack>

                              <MetaChip tone="info">
                                {formatWeightValue(issueDetail?.finalWeights?.[crit.name])}
                              </MetaChip>
                            </Stack>
                          </Box>
                        ))
                      )}
                    </Stack>
                  </Paper>
                </Box>

                {safeArray(issueDetail?.scenarios).length > 0 ? (
                  <Paper elevation={0} sx={detailCardSx(theme)}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <PsychologyIcon fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                        Scenarios
                      </Typography>
                    </Stack>

                    <Stack spacing={0.75}>
                      {safeArray(issueDetail?.scenarios).map((scenario) => (
                        <Box
                          key={scenario.id}
                          sx={{
                            px: 1,
                            py: 0.85,
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.common.white, 0.03),
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <Stack
                            direction={{ xs: "column", md: "row" }}
                            spacing={0.8}
                            justifyContent="space-between"
                          >
                            <Stack spacing={0.15}>
                              <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                {scenario.name || scenario.targetModelName || "Scenario"}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                                {scenario.targetModelName || "—"} · {scenario.status || "—"}
                              </Typography>
                            </Stack>

                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                              {formatDateTime(scenario.createdAt)}
                            </Typography>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                ) : null}
              </Stack>
            ) : null}

            {/* Experts */}
            {detailTab === 1 ? (
              <Stack spacing={1.1}>
                <Paper elevation={0} sx={detailCardSx(theme)}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", md: "center" }}
                    sx={{ mb: 1.1 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PeopleAltIcon fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                        Experts progress
                      </Typography>
                      <MetaChip tone="info">{issueExpertsProgress.length}</MetaChip>
                    </Stack>

                    <Box sx={{ flex: 1 }} />

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      alignItems={{ xs: "stretch", sm: "center" }}
                    >
                      <LoadingButton
                        variant="outlined"
                        color="info"
                        startIcon={<PersonAddAlt1Icon />}
                        disabled={!issueDetail?.creatorActionsState?.canEditExperts}
                        onClick={handleOpenAddExperts}
                        sx={{ borderRadius: 999, fontWeight: 950 }}
                      >
                        Add expert
                      </LoadingButton>

                      <LoadingButton
                        variant="outlined"
                        color="warning"
                        startIcon={<UndoIcon />}
                        disabled={
                          !issueDetail?.creatorActionsState?.canEditExperts ||
                          (expertsToAdd.length === 0 && expertsToRemove.length === 0)
                        }
                        onClick={handleResetExpertChanges}
                        sx={{ borderRadius: 999, fontWeight: 950 }}
                      >
                        Reset
                      </LoadingButton>

                      <LoadingButton
                        variant="outlined"
                        color="secondary"
                        startIcon={<DoneAllIcon />}
                        loading={actionBusy.editExperts}
                        disabled={
                          !issueDetail?.creatorActionsState?.canEditExperts ||
                          (expertsToAdd.length === 0 && expertsToRemove.length === 0)
                        }
                        onClick={handleSaveExpertsChanges}
                        sx={{ borderRadius: 999, fontWeight: 950 }}
                      >
                        Save changes
                      </LoadingButton>
                    </Stack>
                  </Stack>

                  {(expertsToAdd.length > 0 || expertsToRemove.length > 0) ? (
                    <Stack spacing={0.85} sx={{ mb: 1.25 }}>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap">
                        {expertsToAdd.length > 0 ? (
                          <MetaChip tone="success">Pending add: {expertsToAdd.length}</MetaChip>
                        ) : null}
                        {expertsToRemove.length > 0 ? (
                          <MetaChip tone="error">Pending remove: {expertsToRemove.length}</MetaChip>
                        ) : null}
                        <MetaChip tone={resultingExpertsCount > 0 ? "info" : "error"}>
                          Resulting current experts: {resultingExpertsCount}
                        </MetaChip>
                      </Stack>

                      {pendingAddExpertsInfo.length > 0 ? (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap">
                          {pendingAddExpertsInfo.map((expert) => (
                            <Chip
                              key={expert.email}
                              label={`+ ${expert.name || expert.email}`}
                              onDelete={() =>
                                setExpertsToAdd((prev) => prev.filter((e) => e !== expert.email))
                              }
                              variant="outlined"
                              sx={pillSx(theme, "success")}
                            />
                          ))}
                        </Stack>
                      ) : null}

                      {expertsToRemove.length > 0 ? (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap">
                          {expertsToRemove.map((email) => (
                            <Chip
                              key={email}
                              label={`- ${email}`}
                              onDelete={() =>
                                setExpertsToRemove((prev) => prev.filter((e) => e !== email))
                              }
                              variant="outlined"
                              sx={pillSx(theme, "error")}
                            />
                          ))}
                        </Stack>
                      ) : null}
                    </Stack>
                  ) : null}

                  <TableContainer
                    sx={{
                      borderRadius: 3,
                      border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                      bgcolor: alpha(theme.palette.common.white, 0.02),
                      overflow: "auto",
                    }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {[
                            "Expert",
                            "State",
                            "Weights",
                            "Evaluations",
                            "Progress",
                            "Last activity",
                            "Joined",
                            "Actions",
                          ].map((head) => (
                            <TableCell key={head} sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf" }}>
                              {head}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {issueExpertsProgress.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8}>
                              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                                No expert data available.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          issueExpertsProgress.map((row) => {
                            const progressPct = row?.progress?.evaluationProgressPct || 0;
                            const email = row?.expert?.email || "";
                            const isMarkedForRemove = expertsToRemove.includes(email);
                            const canMarkRemove =
                              issueDetail?.creatorActionsState?.canEditExperts &&
                              row?.currentParticipant &&
                              Boolean(email);

                            return (
                              <TableRow
                                key={row?.expert?.id || row?.expert?.email}
                                sx={{
                                  bgcolor: isMarkedForRemove
                                    ? alpha(theme.palette.error.main, 0.08)
                                    : "transparent",
                                }}
                              >
                                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                                  <Stack spacing={0.15}>
                                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                      {row?.expert?.name || "Unknown"}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                                      {row?.expert?.email || "—"}
                                    </Typography>
                                  </Stack>
                                </TableCell>

                                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                    <MetaChip tone={row?.currentParticipant ? "success" : "error"}>
                                      {row?.currentParticipant ? row?.invitationStatus || "participant" : "exited"}
                                    </MetaChip>
                                    {isMarkedForRemove ? (
                                      <MetaChip tone="error">Marked for removal</MetaChip>
                                    ) : null}
                                  </Stack>
                                </TableCell>

                                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                                  <MetaChip tone={row?.weightsCompleted ? "success" : "warning"}>
                                    {row?.weightsCompleted ? "Completed" : "Pending"}
                                  </MetaChip>
                                </TableCell>

                                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                                  <MetaChip tone={row?.evaluationCompleted ? "success" : "warning"}>
                                    {row?.evaluationCompleted ? "Submitted" : "Pending"}
                                  </MetaChip>
                                </TableCell>

                                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                                  <Stack spacing={0.25}>
                                    <Typography variant="body2" sx={{ fontWeight: 850 }}>
                                      {row?.progress?.filledEvaluationDocs || 0}/{row?.progress?.expectedEvaluationCells || 0}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                                      {progressPct}%
                                    </Typography>
                                  </Stack>
                                </TableCell>

                                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                                  <Typography variant="body2" sx={{ fontWeight: 850 }}>
                                    {formatDateTime(row?.progress?.lastEvaluationAt || row?.exitInfo?.timestamp)}
                                  </Typography>
                                </TableCell>

                                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                                  <Typography variant="body2" sx={{ fontWeight: 850 }}>
                                    {formatDateTime(row?.joinedAt)}
                                  </Typography>
                                </TableCell>

                                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                                  <Stack direction="row" spacing={0.65}>
                                    <Tooltip title="Inspect this expert" arrow>
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setSelectedExpertId(row?.expert?.id || "");
                                          setDetailTab(2);
                                        }}
                                        sx={{
                                          border: "1px solid rgba(255,255,255,0.10)",
                                          bgcolor: alpha(theme.palette.common.white, 0.03),
                                        }}
                                      >
                                        <PersonSearchIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>

                                    <Tooltip
                                      title={
                                        !row?.currentParticipant
                                          ? "Only current participants can be removed"
                                          : isMarkedForRemove
                                            ? "Undo removal mark"
                                            : "Mark expert for removal"
                                      }
                                      arrow
                                    >
                                      <span>
                                        <IconButton
                                          size="small"
                                          disabled={!canMarkRemove}
                                          onClick={() => toggleRemoveExpert(email)}
                                          sx={{
                                            border: "1px solid rgba(255,255,255,0.10)",
                                            bgcolor: alpha(
                                              isMarkedForRemove
                                                ? theme.palette.warning.main
                                                : theme.palette.error.main,
                                              canMarkRemove ? 0.12 : 0.03
                                            ),
                                          }}
                                        >
                                          {isMarkedForRemove ? (
                                            <UndoIcon fontSize="small" />
                                          ) : (
                                            <PersonRemoveAlt1Icon fontSize="small" />
                                          )}
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Stack>
            ) : null}

            {/* Expert review */}
            {detailTab === 2 ? (
              <Stack spacing={1.1}>
                <Paper elevation={0} sx={detailCardSx(theme)}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", md: "center" }}
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PersonSearchIcon fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                        Expert review
                      </Typography>
                    </Stack>

                    <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 340 } }}>
                      <Select
                        value={selectedExpertId}
                        color="info"
                        displayEmpty
                        onChange={(e) => setSelectedExpertId(e.target.value)}
                        sx={{
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.common.white, 0.04),
                        }}
                      >
                        {issueExpertsProgress.map((row) => (
                          <MenuItem key={row?.expert?.id} value={row?.expert?.id}>
                            {row?.expert?.name || "Unknown"} — {row?.expert?.email || "—"}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>

                  {selectedExpertProgress ? (
                    <>
                      <Divider sx={{ opacity: 0.12, my: 1.3 }} />

                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        <MetaChip tone={selectedExpertProgress?.currentParticipant ? "success" : "error"}>
                          {selectedExpertProgress?.currentParticipant ? "Current participant" : "Exited"}
                        </MetaChip>
                        <MetaChip tone={selectedExpertProgress?.weightsCompleted ? "success" : "warning"}>
                          Weights: {selectedExpertProgress?.weightsCompleted ? "completed" : "pending"}
                        </MetaChip>
                        <MetaChip tone={selectedExpertProgress?.evaluationCompleted ? "success" : "warning"}>
                          Evaluations: {selectedExpertProgress?.evaluationCompleted ? "submitted" : "draft / pending"}
                        </MetaChip>
                        <MetaChip tone={getProgressTone(selectedExpertProgress?.progress?.evaluationProgressPct || 0)}>
                          Progress: {selectedExpertProgress?.progress?.evaluationProgressPct || 0}%
                        </MetaChip>
                      </Stack>
                    </>
                  ) : null}
                </Paper>

                {expertEvalLoading ? (
                  <CircularLoading color="secondary" size={34} height="20vh" />
                ) : !selectedExpertId ? (
                  <Paper elevation={0} sx={detailCardSx(theme)}>
                    <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                      Select an expert to inspect weights and evaluations.
                    </Typography>
                  </Paper>
                ) : (
                  <>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1.1,
                        gridTemplateColumns: { xs: "1fr", xl: "0.92fr 1.08fr" },
                      }}
                    >
                      <Paper elevation={0} sx={detailCardSx(theme)}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <RuleOutlinedIcon fontSize="small" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                            Weights
                          </Typography>
                        </Stack>

                        <ReadOnlyWeights data={expertWeights} />
                      </Paper>

                      <Paper elevation={0} sx={detailCardSx(theme)}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <FactCheckOutlinedIcon fontSize="small" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                            Evaluation summary
                          </Typography>
                        </Stack>

                        <Stack spacing={0.75}>
                          <InfoRow label="Expected cells" value={expertEvaluations?.stats?.expectedCells ?? "—"} />
                          <InfoRow label="Filled cells" value={expertEvaluations?.stats?.filledCells ?? "—"} />
                          <InfoRow label="Last saved" value={formatDateTime(expertEvaluations?.stats?.lastEvaluationAt)} />
                          <InfoRow label="Invitation status" value={expertEvaluations?.participation?.invitationStatus || "—"} />
                        </Stack>
                      </Paper>
                    </Box>

                    <Paper elevation={0} sx={detailCardSx(theme)}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <AnalyticsOutlinedIcon fontSize="small" />
                        <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                          Evaluations
                        </Typography>
                      </Stack>

                      {expertEvaluations?.issue?.isPairwise ? (
                        <ReadOnlyPairwise data={expertEvaluations} />
                      ) : (
                        <ReadOnlyAxCMatrix data={expertEvaluations} />
                      )}
                    </Paper>
                  </>
                )}
              </Stack>
            ) : null}
          </Box>
        )}
      </GlassDialog>

      {/* Add experts picker */}
      <AddExpertsPickerDialog
        open={addExpertsOpen}
        onClose={() => setAddExpertsOpen(false)}
        loading={addExpertsLoading}
        availableExperts={availableExperts}
        expertsToAdd={expertsToAdd}
        setExpertsToAdd={setExpertsToAdd}
      />

      {/* Assign expression domains */}
      <AddExpertsDomainsDialog
        open={assignDomainsOpen}
        onClose={() => setAssignDomainsOpen(false)}
        issue={issueForDomains}
        expertsToAdd={expertsToAdd}
        onConfirmDomains={handleConfirmDomains}
      />

      {/* Reassign admin dialog */}
      <GlassDialog
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            ...auroraBg(theme, 0.14),
            "&:after": {
              content: '""',
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 55%)`,
              opacity: 0.18,
            },
          }}
        >
          <Box sx={{ p: 2.1, position: "relative", zIndex: 1 }}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Avatar
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  color: "secondary.main",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <AdminPanelSettingsIcon />
              </Avatar>

              <Stack spacing={0.15}>
                <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.05 }}>
                  Reassign issue admin
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                  Change the creator/admin responsible for this issue.
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ p: 2.1 }}>
          <Stack spacing={1.35}>
            <InfoRow label="Issue" value={issueDetail?.name || "—"} />
            <InfoRow
              label="Current admin"
              value={issueDetail?.admin ? `${issueDetail.admin.name} (${issueDetail.admin.email})` : "—"}
            />

            <FormControl fullWidth size="small">
              <Select
                value={newAdminId}
                displayEmpty
                color="info"
                disabled={adminsLoading}
                onChange={(e) => setNewAdminId(e.target.value)}
                sx={{
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.common.white, 0.04),
                }}
              >
                <MenuItem value="">Select new admin</MenuItem>
                {adminCandidates.map((admin) => (
                  <MenuItem key={admin.id} value={admin.id}>
                    {admin.name} — {admin.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {adminsLoading ? (
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                Loading admins...
              </Typography>
            ) : null}
          </Stack>

          <Divider sx={{ opacity: 0.12, my: 2 }} />

          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={1}
            justifyContent="flex-end"
          >
            <Button
              onClick={() => setReassignOpen(false)}
              color="warning"
              variant="outlined"
            >
              Cancel
            </Button>

            <Button
              onClick={handleReassignAdmin}
              color="secondary"
              variant="outlined"
            >
              Reassign
            </Button>
          </Stack>
        </Box>
      </GlassDialog>

      {/* Confirm action dialog */}
      <GlassDialog
        open={Boolean(confirmAction)}
        onClose={closeConfirmAction}
        maxWidth="xs"
        fullWidth
      >
        <Box sx={{ p: 2.1 }}>
          <Stack spacing={1.25}>
            <Typography variant="h6" sx={{ fontWeight: 980 }}>
              {confirmAction?.title || "Confirm action"}
            </Typography>

            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              {confirmAction?.description || "Are you sure you want to continue?"}
            </Typography>
          </Stack>

          <Divider sx={{ opacity: 0.12, my: 2 }} />

          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            spacing={1}
            justifyContent="flex-end"
          >
            <Button onClick={closeConfirmAction} color="warning" variant="outlined">
              Cancel
            </Button>

            <LoadingButton
              onClick={handleRunConfirmedAction}
              color="secondary"
              variant="outlined"
              loading={Boolean(confirmAction?.key && actionBusy[confirmAction.key])}
            >
              Confirm
            </LoadingButton>
          </Stack>
        </Box>
      </GlassDialog>
    </>
  );
}