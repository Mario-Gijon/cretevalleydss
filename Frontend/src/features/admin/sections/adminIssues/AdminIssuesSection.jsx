import { useEffect, useState } from "react";
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
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { alpha } from "@mui/material/styles";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CategoryIcon from "@mui/icons-material/Category";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import TimelineIcon from "@mui/icons-material/Timeline";
import PsychologyIcon from "@mui/icons-material/Psychology";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import CloseIcon from "@mui/icons-material/Close";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
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

import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";
import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";
import { CircularLoading } from "../../../../components/LoadingProgress/CircularLoading";
import {
  computeIssueWeightsAdminAction,
  removeIssueAdminAction,
  resolveIssueAdminAction,
} from "../../../../services/admin.service";

import AddExpertsDomainsDialog from "../../../issueExperts/dialogs/AddExpertsDomainsDialog";
import { getActiveIssuesAuroraBg } from "../../../activeIssues/styles/activeIssues.styles";
import {
  detailCardSx,
  formatDateTime,
  formatWeightValue,
  getProgressTone,
  pillSx,
  prettyStage,
  safeArray,
  sectionPanelSx,
  stageTone,
} from "./adminIssues.utils";

import AdminMetaChip from "./components/AdminMetaChip";
import AdminInfoRow from "./components/AdminInfoRow";
import AdminStatCard from "./components/AdminStatCard";
import AdminReadOnlyWeights from "./components/AdminReadOnlyWeights";
import AdminAddExpertsPickerDialog from "./components/AdminAddExpertsPickerDialog";
import ExpressionDomainSummaryButton from "../../../issueEvaluation/components/ExpressionDomainSummaryButton";
import { useAdminIssuesSection } from "./hooks/useAdminIssuesSection";
import {
  EVALUATION_STAGES,
} from "../../../issueEvaluation/evaluation.constants";
import { getEvaluationStructureEntryForStage } from "../../../issueEvaluation/evaluation.registry";
import { IssueModelParametersView } from "../../../modelParameters";

/**
 * Renderiza la vista administrativa de issues con filtros, detalle y acciones de gestion.
 *
 * @returns {JSX.Element}
 */
export default function AdminIssuesSection() {
  const [showExpertCollective, setShowExpertCollective] = useState(false);
  const {
    theme,
    isMdDown,
    loading,
    refreshing,
    search,
    activeFilter,
    consensusFilter,
    stageFilter,
    detailOpen,
    detailTab,
    detailLoading,
    selectedIssueRow,
    issueDetail,
    issueExpertsProgress,
    selectedExpertId,
    expertEvalLoading,
    expertEvaluations,
    expertWeights,
    reassignOpen,
    reassignLoading,
    adminsLoading,
    newAdminId,
    actionBusy,
    confirmAction,
    addExpertsOpen,
    addExpertsLoading,
    expertsToAdd,
    expertsToRemove,
    assignDomainsOpen,
    fetchIssuesData,
    openDetail,
    closeDetail,
    filteredIssues,
    stats,
    stageOptions,
    selectedExpertProgress,
    adminCandidates,
    availableExperts,
    pendingAddExpertsInfo,
    resultingExpertsCount,
    issueForDomains,
    openReassignDialog,
    handleReassignAdmin,
    openConfirmAction,
    closeConfirmAction,
    handleRunConfirmedAction,
    handleOpenAddExperts,
    toggleRemoveExpert,
    handleResetExpertChanges,
    handleSaveExpertsChanges,
    handleConfirmDomains,
    setSearch,
    setActiveFilter,
    setConsensusFilter,
    setStageFilter,
    setDetailTab,
    setSelectedExpertId,
    setAddExpertsOpen,
    setExpertsToAdd,
    setExpertsToRemove,
    setAssignDomainsOpen,
    setReassignOpen,
    setNewAdminId,
  } = useAdminIssuesSection();

  const confirmToneByKey = {
    compute: "warning",
    resolve: "warning",
    remove: "error",
  };

  const confirmLabelByKey = {
    compute: "Compute",
    resolve: "Resolve",
    remove: "Remove",
  };

  const confirmColorByKey = {
    compute: "warning",
    resolve: "warning",
    remove: "error",
  };

  const confirmIconByKey = {
    compute: <CalculateIcon />,
    resolve: <GavelIcon />,
    remove: <DeleteOutlineIcon />,
  };

  const confirmTone = confirmToneByKey[confirmAction?.key] || "info";
  const confirmLabel = confirmLabelByKey[confirmAction?.key] || "Confirm";
  const confirmColor = confirmColorByKey[confirmAction?.key] || "info";
  const confirmIcon = confirmIconByKey[confirmAction?.key] || <InfoOutlinedIcon />;
  const alternativeStructureLabelByKey = {
    ["alternativeCriteriaMatrix"]: "Alternative-criteria matrix",
    ["alternativePairwiseByCriterion"]:
      "Pairwise alternatives by criterion",
  };
  const criteriaWeightingStructureLabelByKey = {
    ["manualCriteriaWeights"]: "Manual criteria weights",
    ["bestWorstCriteria"]: "BWM",
  };
  const alternativeEvaluationStructureEntry = getEvaluationStructureEntryForStage({
    structureKey: expertEvaluations?.issue?.alternativeEvaluationStructureKey,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  });
  const AlternativeEvaluationViewComponent =
    alternativeEvaluationStructureEntry?.View || null;
  const alternativeNamesForReview = safeArray(issueDetail?.alternatives)
    .map((alternative) => alternative?.name)
    .filter(Boolean);
  const criterionNamesForReview = safeArray(issueDetail?.leafCriteria)
    .map((criterion) => criterion?.name)
    .filter(Boolean);
  const shouldShowExpertWeights =
    safeArray(issueDetail?.leafCriteria).length > 1;
  const hasExpertCollectiveEvaluations = Array.isArray(
    expertEvaluations?.collectiveEvaluations
  )
    ? expertEvaluations.collectiveEvaluations.length > 0
    : expertEvaluations?.collectiveEvaluations &&
      typeof expertEvaluations.collectiveEvaluations === "object"
      ? Object.keys(expertEvaluations.collectiveEvaluations).length > 0
      : expertEvaluations?.collectiveEvaluations != null;

  useEffect(() => {
    setShowExpertCollective(false);
  }, [selectedExpertId, expertEvaluations?.issue?.id]);

  useEffect(() => {
    if (!hasExpertCollectiveEvaluations) {
      setShowExpertCollective(false);
    }
  }, [hasExpertCollectiveEvaluations]);

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
          <AdminStatCard icon={<AssignmentIcon />} label="Total issues" value={stats.total} tone="info" />
          <AdminStatCard icon={<TimelineIcon />} label="Active" value={stats.active} tone="warning" />
          <AdminStatCard icon={<RuleOutlinedIcon />} label="Finished" value={stats.finished} tone="success" />
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
                            <AdminMetaChip tone={stageTone(issue?.currentStage)}>
                              {prettyStage(issue)}
                            </AdminMetaChip>
                          </TableCell>

                          <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`, py: 1.15 }}>
                            <Stack direction="row" spacing={0.6} flexWrap="wrap">
                              <AdminMetaChip tone={issue?.active ? "warning" : "success"}>
                                {issue?.active ? "Active" : "Finished"}
                              </AdminMetaChip>
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
                                <AdminMetaChip tone={getProgressTone(progressPct)}>
                                  {progressDone}/{progressTotal}
                                </AdminMetaChip>
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
            ...getActiveIssuesAuroraBg(theme, 0.16),
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

            {detailTab === 0 ? (
              <Stack spacing={1.25}>
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
                      <AdminInfoRow label="Name" value={issueDetail?.name} />
                      <AdminInfoRow label="Description" value={issueDetail?.description || "—"} />
                      <AdminInfoRow label="Current admin" value={issueDetail?.admin ? `${issueDetail.admin.name} (${issueDetail.admin.email})` : "—"} />
                      <AdminInfoRow label="Model" value={issueDetail?.model?.name || "—"} />
                      <AdminInfoRow label="Stage" value={prettyStage(issueDetail)} />
                      <AdminInfoRow
                        label="Criteria weighting structure"
                        value={
                          criteriaWeightingStructureLabelByKey[
                          issueDetail?.criteriaWeightingStructureKey
                          ] ||
                          issueDetail?.criteriaWeightingStructureKey ||
                          "—"
                        }
                      />
                      <AdminInfoRow
                        label="Evaluation structure"
                        value={
                          alternativeStructureLabelByKey[
                          issueDetail?.alternativeEvaluationStructureKey
                          ] ||
                          issueDetail?.alternativeEvaluationStructureKey ||
                          "—"
                        }
                      />
                      <AdminInfoRow label="Creation date" value={issueDetail?.creationDate || "—"} />
                      <AdminInfoRow label="Closure date" value={issueDetail?.closureDate || "—"} />
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

                  <IssueModelParametersView
                    parameters={issueDetail?.model?.parameters || []}
                    values={issueDetail?.modelParameters || {}}
                    leafNames={safeArray(issueDetail?.leafCriteria).map((criterion) => criterion?.name).filter(Boolean)}
                  />
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

                              <AdminMetaChip tone="info">
                                {formatWeightValue(issueDetail?.finalWeights?.[crit.name])}
                              </AdminMetaChip>
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
                      <AdminMetaChip tone="info">{issueExpertsProgress.length}</AdminMetaChip>
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
                          <AdminMetaChip tone="success">Pending add: {expertsToAdd.length}</AdminMetaChip>
                        ) : null}
                        {expertsToRemove.length > 0 ? (
                          <AdminMetaChip tone="error">Pending remove: {expertsToRemove.length}</AdminMetaChip>
                        ) : null}
                        <AdminMetaChip tone={resultingExpertsCount > 0 ? "info" : "error"}>
                          Resulting current experts: {resultingExpertsCount}
                        </AdminMetaChip>
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
                                    <AdminMetaChip tone={row?.currentParticipant ? "success" : "error"}>
                                      {row?.currentParticipant ? row?.invitationStatus || "participant" : "exited"}
                                    </AdminMetaChip>
                                    {isMarkedForRemove ? (
                                      <AdminMetaChip tone="error">Marked for removal</AdminMetaChip>
                                    ) : null}
                                  </Stack>
                                </TableCell>

                                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                                  <AdminMetaChip tone={row?.weightsCompleted ? "success" : "warning"}>
                                    {row?.weightsCompleted ? "Completed" : "Pending"}
                                  </AdminMetaChip>
                                </TableCell>

                                <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                                  <AdminMetaChip tone={row?.evaluationCompleted ? "success" : "warning"}>
                                    {row?.evaluationCompleted ? "Submitted" : "Pending"}
                                  </AdminMetaChip>
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
                          minWidth: { xs: "100%", md: 340 },
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
                        <AdminMetaChip tone={selectedExpertProgress?.currentParticipant ? "success" : "error"}>
                          {selectedExpertProgress?.currentParticipant ? "Current participant" : "Exited"}
                        </AdminMetaChip>
                        <AdminMetaChip tone={getProgressTone(selectedExpertProgress?.progress?.evaluationProgressPct || 0)}>
                          Progress: {selectedExpertProgress?.progress?.evaluationProgressPct || 0}%
                        </AdminMetaChip>
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
                        gridTemplateColumns: shouldShowExpertWeights
                          ? { xs: "1fr", xl: "0.92fr 1.08fr" }
                          : "1fr",
                      }}
                    >
                      {shouldShowExpertWeights ? (
                        <Paper elevation={0} sx={detailCardSx(theme)}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            alignItems={{ xs: "stretch", sm: "center" }}
                            justifyContent="space-between"
                            sx={{ mb: 1 }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <RuleOutlinedIcon fontSize="small" />
                              <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                                Weights
                              </Typography>
                            </Stack>
                          </Stack>

                          <AdminReadOnlyWeights
                            data={expertWeights}
                            leafCriteria={safeArray(issueDetail?.leafCriteria)}
                            finalWeights={issueDetail?.finalWeights || {}}
                          />
                        </Paper>
                      ) : null}

                      <Paper elevation={0} sx={detailCardSx(theme)}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <FactCheckOutlinedIcon fontSize="small" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                            Evaluation summary
                          </Typography>
                        </Stack>

                        <Stack spacing={0.75}>
                          <AdminInfoRow label="Expected cells" value={expertEvaluations?.stats?.expectedCells ?? "—"} />
                          <AdminInfoRow label="Filled cells" value={expertEvaluations?.stats?.filledCells ?? "—"} />
                          <AdminInfoRow label="Last saved" value={formatDateTime(expertEvaluations?.stats?.lastEvaluationAt)} />
                          <AdminInfoRow label="Invitation status" value={expertEvaluations?.participation?.invitationStatus || "—"} />
                        </Stack>
                      </Paper>
                    </Box>

                    <Paper elevation={0} sx={detailCardSx(theme)}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", sm: "center" }}
                        justifyContent="space-between"
                        sx={{ mb: 1 }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <AnalyticsOutlinedIcon fontSize="small" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 980 }}>
                            Evaluations
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <ExpressionDomainSummaryButton
                            criteria={safeArray(issueDetail?.leafCriteria).map((criterion) => ({
                              isLeaf: true,
                              name: criterion?.name || "—",
                              expressionDomain: criterion?.expressionDomain || null,
                            }))}
                          />
                          {hasExpertCollectiveEvaluations ? (
                            <ToggleButton
                              value="collective"
                              selected={showExpertCollective}
                              onChange={() =>
                                setShowExpertCollective((value) => !value)
                              }
                              color="secondary"
                              size="small"
                              sx={{
                                borderRadius: 2.5,
                                textTransform: "none",
                                fontWeight: 850,
                                px: 1.2,
                              }}
                            >
                              {showExpertCollective ? "Hide collective" : "Show collective"}
                            </ToggleButton>
                          ) : null}
                        </Stack>
                      </Stack>

                      {!AlternativeEvaluationViewComponent ? (
                        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                          Evaluation structure does not expose a reusable renderer.
                        </Typography>
                      ) : (
                        <Box sx={{ maxWidth: "100%", overflowX: "auto" }}>
                          {(() => {
                            const evaluationContext = {
                              issue: issueDetail,
                              stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
                              structureKey:
                                expertEvaluations?.issue
                                  ?.alternativeEvaluationStructureKey || "",
                              alternatives: alternativeNamesForReview,
                              criteria: criterionNamesForReview,
                              payload: expertEvaluations?.evaluations || {},
                              setPayload: () => { },
                              collectivePayload:
                                showExpertCollective &&
                                  hasExpertCollectiveEvaluations
                                  ? expertEvaluations?.collectiveEvaluations || {}
                                  : {},
                              permitEdit: false,
                              selectedCriterion: "",
                              setSelectedCriterion: () => { },
                            };

                            return (
                              <AlternativeEvaluationViewComponent
                                evaluationContext={evaluationContext}
                              />
                            );
                          })()}
                        </Box>
                      )}
                    </Paper>
                  </>
                )}
              </Stack>
            ) : null}
          </Box>
        )}
      </GlassDialog>

      <AdminAddExpertsPickerDialog
        open={addExpertsOpen}
        onClose={() => setAddExpertsOpen(false)}
        loading={addExpertsLoading}
        availableExperts={availableExperts}
        expertsToAdd={expertsToAdd}
        setExpertsToAdd={setExpertsToAdd}
      />

      <AddExpertsDomainsDialog
        open={assignDomainsOpen}
        onClose={() => setAssignDomainsOpen(false)}
        issue={issueForDomains}
        expertsToAdd={expertsToAdd}
        onConfirmDomains={handleConfirmDomains}
      />

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
            ...getActiveIssuesAuroraBg(theme, 0.14),
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
            <AdminInfoRow label="Issue" value={issueDetail?.name || "—"} />
            <AdminInfoRow
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

      <ConfirmationDialog
        open={Boolean(confirmAction)}
        onClose={closeConfirmAction}
        tone={confirmTone}
        title={confirmAction?.title || "Confirm action"}
        subtitle={confirmAction?.description || "Are you sure you want to continue?"}
        actions={[
          {
            id: "cancel-admin-issue-action",
            label: "Cancel",
            color: "secondary",
            variant: "outlined",
            icon: <CancelOutlinedIcon />,
            onClick: closeConfirmAction,
          },
          {
            id: "confirm-admin-issue-action",
            label: confirmLabel,
            color: confirmColor,
            variant: "outlined",
            icon: confirmIcon,
            autoFocus: true,
            loading: Boolean(confirmAction?.key && actionBusy[confirmAction.key]),
            onClick: handleRunConfirmedAction,
          },
        ]}
        maxWidth="xs"
        fullWidth
      />
    </>
  );
}
