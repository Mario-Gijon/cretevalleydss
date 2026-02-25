import { useMemo } from "react";
import {
  Stack,
  Typography,
  Box,
  Drawer,
  Divider,
  IconButton,
  Tabs,
  Tab,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { alpha, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import CategoryIcon from "@mui/icons-material/Category";
import TimelineIcon from "@mui/icons-material/Timeline";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonRemoveAlt1Icon from "@mui/icons-material/PersonRemoveAlt1";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CalculateIcon from "@mui/icons-material/Calculate";
import GavelIcon from "@mui/icons-material/Gavel";

import { Pill, TinyStat, stageLabel, getNextActionMeta } from "../ActiveIssuesHeader/ActiveIssuesHeader";
import { ExpertParticipationChart } from "../ExpertParticipationChart/ExpertParticipationChart";
import { IssueTimeline } from "../IssueTimeline/IssueTimeline";

/* -----------------------------
 * helpers locales
 * ----------------------------- */

const crystalBorder = () => {
  return { border: "1px solid rgba(117, 199, 209, 0.8)" };
};

const panelSx = (theme, { bg = 0.10 } = {}) => ({
  borderRadius: 4,
  bgcolor: alpha(theme.palette.background.paper, bg),
  boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.06)}`,
  border: "1px solid rgba(255,255,255,0.1)",
});

const KVRow = ({ k, v }) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: "baseline" }}>
    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 950, minWidth: 150 }}>
      {k}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 850, wordBreak: "break-word" }}>
      {v ?? "—"}
    </Typography>
  </Stack>
);

const DrawerTabPanel = ({ value, index, children }) => {
  if (value !== index) return null;
  return <Box sx={{ minHeight: 0 }}>{children}</Box>;
};

const formatWeight = (w) => {
  if (w === null || w === undefined) return null;
  const num = Number(w);
  if (Number.isNaN(num)) return String(w);
  if (num >= 0 && num <= 1) return `${(num * 100).toFixed(2)}%`;
  return num.toFixed(4).replace(/\.?0+$/, "");
};

const CriteriaTypeBadge = ({ type }) => {
  const theme = useTheme();
  if (!type) return null;
  const isBenefit = String(type).toLowerCase() === "benefit";
  const bg = isBenefit ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.warning.main, 0.12);
  const br = isBenefit ? alpha(theme.palette.success.main, 0.22) : alpha(theme.palette.warning.main, 0.22);
  const color = isBenefit ? "success.main" : "warning.main";

  return (
    <Box sx={{ px: 1, py: 0.25, borderRadius: 999, bgcolor: bg, border: "1px solid", borderColor: br }}>
      <Typography variant="caption" sx={{ fontWeight: 950, color }}>
        {isBenefit ? "benefit" : "cost"}
      </Typography>
    </Box>
  );
};

const CriterionTree = ({ nodes = [], finalWeights = {}, depth = 0 }) => {
  const theme = useTheme();

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No criteria
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {nodes.map((node, idx) => {
        const children = Array.isArray(node?.children) ? node.children : [];
        const hasChildren = children.length > 0;

        const isRoot = depth === 0;
        const showType = isRoot;

        const leafWeightRaw = !hasChildren ? finalWeights?.[node?.name] : null;
        const leafWeight = leafWeightRaw != null ? formatWeight(leafWeightRaw) : null;

        if (!hasChildren) {
          return (
            <Box
              key={`${node?.name || "crit"}_${idx}`}
              sx={{
                ...panelSx(theme, { bg: 0.10 }),
                px: 1.5,
                py: 1.1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                bgcolor: alpha(theme.palette.text.primary, 0.02),
                "&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.08) },
              }}
            >
              <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 980, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {node?.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                  leaf
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                {showType ? <CriteriaTypeBadge type={node?.type} /> : null}

                {leafWeight ? (
                  <Box sx={{ px: 1, py: 0.35, borderRadius: 999, bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
                    <Typography variant="caption" sx={{ fontWeight: 980, color: "text.secondary" }}>
                      {leafWeight}
                    </Typography>
                  </Box>
                ) : null}
              </Stack>
            </Box>
          );
        }

        return (
          <Accordion
            key={`${node?.name || "crit"}_${idx}`}
            disableGutters
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              bgcolor: alpha(theme.palette.background.paper, 0.10),
              boxShadow: `0 12px 30px ${alpha(theme.palette.common.black, 0.05)}`,
              border: "1px solid rgba(255,255,255,0.1)",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
                <Typography variant="body2" sx={{ fontWeight: 980, flex: 1 }}>
                  {node?.name}
                </Typography>

                {showType ? <CriteriaTypeBadge type={node?.type} /> : null}

                <Box
                  sx={{
                    px: 0.9,
                    py: 0.2,
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.text.primary, 0.06),
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                    {children.length > 1 ? `${children.length} children` : "1 child"}
                  </Typography>
                </Box>
              </Stack>
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0 }}>
              <CriterionTree nodes={children} finalWeights={finalWeights} depth={depth + 1} />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
};

/* -----------------------------
 * server-first permissions helpers
 * ----------------------------- */

const pickBool = (...vals) => {
  for (const v of vals) if (typeof v === "boolean") return v;
  return false;
};

const getPerms = (issue) => issue?.ui?.permissions || issue?.ui?.actions || issue?.ui || null;

const canEvaluateAlternatives = (issue) =>
  pickBool(getPerms(issue)?.evaluateAlternatives, getPerms(issue)?.canEvaluateAlternatives, issue?.statusFlags?.canEvaluateAlternatives);

const canEvaluateWeights = (issue) =>
  pickBool(getPerms(issue)?.evaluateWeights, getPerms(issue)?.canEvaluateWeights, issue?.statusFlags?.canEvaluateWeights);

const canComputeWeights = (issue) =>
  pickBool(getPerms(issue)?.computeWeights, getPerms(issue)?.canComputeWeights, issue?.statusFlags?.canComputeWeights);

const canResolveIssue = (issue) =>
  pickBool(getPerms(issue)?.resolveIssue, getPerms(issue)?.canResolveIssue, issue?.statusFlags?.canResolveIssue);

/* -----------------------------
 * modelParameters rendering
 * ----------------------------- */

const formatParamValue = (v) => {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.length <= 8 ? v.join(", ") : `[${v.length} items]`;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/* -----------------------------
 * Component
 * ----------------------------- */

const IssueDetailsDrawer = ({
  open,
  onClose,
  onMinimize,
  selectedIssue,
  isMobile,
  drawerTab,
  setDrawerTab,
  busy,
  openConfirm,
  handleLeaveIssue,
  handleComputeWeights,
  handleResolveIssue,
  handleRemoveIssue,
  isEditingExperts,
  toggleEditExperts,
  expertsToRemove,
  markRemoveExpert,
  expertsToAdd,
  setOpenAddExpertsDialog,
  saveExpertsChanges,
  setIsRatingAlternatives,
  setIsRatingWeights,
}) => {
  const theme = useTheme();

  const drawerAction = useMemo(() => (selectedIssue ? getNextActionMeta(selectedIssue) : null), [selectedIssue]);

  // participación (legacy)
  const totalExperts = selectedIssue?.totalExperts ?? 0;
  const pendingExperts = (selectedIssue?.pendingExperts || []).length;
  const participatedExperts = (selectedIssue?.participatedExperts || []).length;
  const notEvaluatedExperts = (selectedIssue?.acceptedButNotEvaluatedExperts || []).length;
  const declinedExperts = (selectedIssue?.notAcceptedExperts || []).length;

  const alternatives = Array.isArray(selectedIssue?.alternatives) ? selectedIssue.alternatives : [];
  const criteriaCount = Array.isArray(selectedIssue?.criteria) ? selectedIssue.criteria.length : 0;

  const deadlineLabel = selectedIssue?.ui?.deadline?.hasDeadline
    ? selectedIssue?.ui?.deadline?.deadline
    : (selectedIssue?.closureDate || "—");

  const drawerTabs = useMemo(() => {
    if (!selectedIssue) return [];
    return [
      { key: "overview", label: "Overview", icon: <InfoOutlinedIcon fontSize="small" /> },
      { key: "alts", label: "Alternatives", icon: <ViewListIcon fontSize="small" /> },
      { key: "criteria", label: "Criteria", icon: <CategoryIcon fontSize="small" /> },
      { key: "timeline", label: "Timeline", icon: <TimelineIcon fontSize="small" /> },
      ...(selectedIssue?.isAdmin ? [{ key: "experts", label: "Experts", icon: <PeopleAltIcon fontSize="small" /> }] : []),
    ];
  }, [selectedIssue]);

  const finalWeights = selectedIssue?.finalWeights || selectedIssue?.ui?.finalWeights || {};

  const modelParamsObj = selectedIssue?.modelParameters || selectedIssue?.ui?.modelParameters || {};
  const modelParamsList = useMemo(() => {
    const entries = Object.entries(modelParamsObj || {});
    // Orden consistente
    entries.sort(([a], [b]) => String(a).localeCompare(String(b)));

    return entries.map(([k, v]) => ({
      k,
      v: formatParamValue(v),
    }));
  }, [modelParamsObj]);

  const cEvalA = canEvaluateAlternatives(selectedIssue);
  const cEvalW = canEvaluateWeights(selectedIssue);
  const cComputeW = canComputeWeights(selectedIssue);
  const cResolve = canResolveIssue(selectedIssue);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 580, md: 720 },
          borderTopLeftRadius: { xs: 0, sm: 24 },
          borderBottomLeftRadius: { xs: 0, sm: 24 },
          overflow: "hidden",
          bgcolor: alpha(theme.palette.background.paper, 0.72),
          backdropFilter: "blur(14px)",
        },
        elevation: 0,
      }}
    >
      {!selectedIssue ? (
        <Stack sx={{ p: 3 }} spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 980 }}>
              Issue details
            </Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Select an issue to see details.
          </Typography>
        </Stack>
      ) : (
        <Stack sx={{ height: "100%" }}>
          {/* Header */}
          <Box
            sx={{
              p: 2.5,
              pb: 2,
              position: "relative",
              overflow: "hidden",
              background: `radial-gradient(1200px 500px at 10% 0%, ${alpha(theme.palette.info.main, 0.18)}, transparent 60%),
                           radial-gradient(900px 420px at 90% 20%, ${alpha(theme.palette.secondary.main, 0.18)}, transparent 55%)`,
              ...crystalBorder(theme, { level: "divider" }),
              borderLeft: "none",
              borderRight: "none",
              borderTop: "none",
            }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
              <Stack spacing={0.7} sx={{ minWidth: 0 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 980,
                    lineHeight: 1.12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedIssue.name}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 900 }}>
                    {selectedIssue.model?.name}
                  </Typography>
                  <Pill tone={selectedIssue.isAdmin ? "warning" : "info"}>{selectedIssue.isAdmin ? "Admin" : "Expert"}</Pill>
                  <Pill tone="info">{stageLabel(selectedIssue.currentStage)}</Pill>
                  {selectedIssue.isConsensus ? <Pill tone="info">Consensus</Pill> : null}
                </Stack>
              </Stack>

              <IconButton onClick={onClose} sx={{ bgcolor: alpha(theme.palette.text.primary, 0.06) }}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Grid container spacing={1.1} sx={{ mt: 2 }}>
              <Grid item xs={6} sm={3}>
                <TinyStat icon={<ViewListIcon fontSize="small" />} label="Alternatives" value={alternatives.length} tone="info" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TinyStat icon={<CategoryIcon fontSize="small" />} label="Criteria" value={criteriaCount} tone="info" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TinyStat icon={<PeopleAltIcon fontSize="small" />} label="Experts" value={totalExperts} tone="warning" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TinyStat
                  icon={<TimelineIcon fontSize="small" />}
                  label="Deadline"
                  value={deadlineLabel}
                  tone={deadlineLabel && deadlineLabel !== "—" ? "warning" : "success"}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ opacity: 0.18 }} />

          {/* Tabs */}
          <Box sx={{ px: 2, pt: 1 }}>
            <Tabs
              value={drawerTab}
              onChange={(_, v) => setDrawerTab(v)}
              textColor="secondary"
              indicatorColor="secondary"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                "& .MuiTab-root": { fontWeight: 950, minHeight: 42 },
                minHeight: 42,
              }}
            >
              {drawerTabs.map((t) => (
                <Tab key={t.key} label={t.label} icon={t.icon} iconPosition="start" sx={{ textTransform: "none" }} />
              ))}
            </Tabs>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, pt: 2, pb: 2 }}>
            {/* Overview */}
            <DrawerTabPanel value={drawerTab} index={0}>
              <Stack spacing={2}>
                <Box sx={{ ...panelSx(theme, { bg: 0.10 }), p: 1.75 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.85 }}>
                    <Pill tone={drawerAction?.tone || "info"}>{drawerAction?.title || "—"}</Pill>
                    <Box sx={{ display: "flex", alignItems: "center", color: "text.secondary" }}>
                      {drawerAction?.icon || <InfoOutlinedIcon fontSize="small" />}
                    </Box>
                  </Stack>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                    {/* {drawerAction?.desc || "—"} */}
                  </Typography>
                </Box>
                
                {/* Actions */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Stack width="100%">
                    <Box sx={{ ...panelSx(theme, { bg: 0.10 }), p: 1.75, height: "100%" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 980, mb: 1 }}>
                        Expert actions
                      </Typography>

                      <Stack spacing={1}>
                        <LoadingButton
                          variant="outlined"
                          color="info"
                          startIcon={<FactCheckIcon />}
                          disabled={!cEvalA}
                          onClick={() => {
                            setIsRatingAlternatives(true);
                            if (isMobile) onMinimize?.();
                          }}
                        >
                          Evaluate alternatives
                        </LoadingButton>

                        <LoadingButton
                          variant="outlined"
                          color="info"
                          startIcon={<FactCheckIcon />}
                          disabled={!cEvalW}
                          onClick={() => {
                            setIsRatingWeights(true);
                            if (isMobile) onMinimize?.();
                          }}
                        >
                          Evaluate weights
                        </LoadingButton>

                        {!selectedIssue.isAdmin ? (
                          <LoadingButton
                            variant="outlined"
                            color="error"
                            startIcon={<LogoutIcon />}
                            loading={busy.leave}
                            onClick={() =>
                              openConfirm({
                                title: "Leave issue",
                                description: "You will stop participating in this issue.",
                                confirmText: "Leave",
                                tone: "error",
                                action: handleLeaveIssue,
                              })
                            }
                          >
                            Leave issue
                          </LoadingButton>
                        ) : null}
                      </Stack>
                    </Box>
                  </Stack>

                  <Stack width="100%">
                    <Box
                      sx={{
                        ...panelSx(theme, { bg: 0.10 }),
                        p: 1.75,
                        height: "100%",
                        opacity: selectedIssue.isAdmin ? 1 : 0.55,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 980, mb: 1 }}>
                        Admin actions
                      </Typography>

                      <Stack spacing={1}>
                        <LoadingButton
                          variant="outlined"
                          color="warning"
                          startIcon={<CalculateIcon />}
                          disabled={!selectedIssue.isAdmin || !cComputeW}
                          loading={busy.compute}
                          onClick={() =>
                            openConfirm({
                              title: "Compute weights",
                              description: "This will compute the final criteria weights and move the issue forward.",
                              confirmText: "Compute",
                              tone: "warning",
                              action: handleComputeWeights,
                            })
                          }
                        >
                          Compute weights
                        </LoadingButton>

                        <LoadingButton
                          variant="outlined"
                          color="warning"
                          startIcon={<GavelIcon />}
                          disabled={!selectedIssue.isAdmin || !cResolve}
                          loading={busy.resolve}
                          onClick={() =>
                            openConfirm({
                              title: "Resolve issue",
                              description: "This will run the model and move the issue forward.",
                              confirmText: "Resolve",
                              tone: "warning",
                              action: handleResolveIssue,
                            })
                          }
                        >
                          Resolve
                        </LoadingButton>

                        <LoadingButton
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteOutlineIcon />}
                          disabled={!selectedIssue.isAdmin}
                          loading={busy.remove}
                          onClick={() =>
                            openConfirm({
                              title: "Remove issue",
                              description: "This will permanently remove the issue and its data.",
                              confirmText: "Remove",
                              tone: "error",
                              action: handleRemoveIssue,
                            })
                          }
                        >
                          Remove issue
                        </LoadingButton>
                      </Stack>
                    </Box>
                  </Stack>
                </Stack>

                {/* Issue info */}
                <Accordion
                  disableGutters
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    overflow: "hidden",
                    bgcolor: alpha(theme.palette.background.paper, 0.10),
                    boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.06)}`,
                    border: "1px solid rgba(255,255,255,0.1)",
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
                      <InfoOutlinedIcon fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 980, flex: 1 }}>
                        Issue info
                      </Typography>
                    </Stack>
                  </AccordionSummary>

                  <AccordionDetails sx={{ pt: 0 }}>
                    <Stack spacing={1.1}>
                      <KVRow k="Creator" v={selectedIssue.creator} />
                      <KVRow k="Description" v={selectedIssue.description} />
                      <KVRow k="Creation date" v={selectedIssue.creationDate} />
                      <KVRow k="Closure date" v={deadlineLabel} />
                      <KVRow k="Stage" v={stageLabel(selectedIssue.currentStage)} />
                      <KVRow k="Weighting mode" v={selectedIssue.weightingMode} />
                      <KVRow k="Consensus" v={String(Boolean(selectedIssue.isConsensus))} />
                    </Stack>
                  </AccordionDetails>
                </Accordion>

                {/* ✅ Model parameters (ONLY key/value) */}
                <Accordion
                  disableGutters
                  elevation={0}
                  defaultExpanded={false}
                  sx={{
                    borderRadius: 4,
                    overflow: "hidden",
                    bgcolor: alpha(theme.palette.background.paper, 0.10),
                    boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.06)}`,
                    border: "1px solid rgba(255,255,255,0.1)",
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
                      <InfoOutlinedIcon fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 980, flex: 1 }}>
                        Model parameters
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 900,
                          maxWidth: 240,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={selectedIssue.model?.name || ""}
                      >
                        {selectedIssue.model?.name || "—"}
                      </Typography>
                    </Stack>
                  </AccordionSummary>

                  <AccordionDetails sx={{ pt: 0 }}>
                    {modelParamsList.length === 0 ? (
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        No model parameters defined for this issue.
                      </Typography>
                    ) : (
                      <Stack spacing={1.05}>
                        {modelParamsList.map((row) => (
                          <KVRow key={row.k} k={row.k} v={row.v} />
                        ))}
                      </Stack>
                    )}
                  </AccordionDetails>
                </Accordion>

                

                {/* Participation */}
                <Box sx={{ ...panelSx(theme, { bg: 0.10 }), p: 1.75 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                    <PeopleAltIcon fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                      Participation
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Pill tone="info">{totalExperts} experts</Pill>
                  </Stack>

                  <Grid container spacing={2} alignItems="stretch">
                    <Grid item xs={12} md={7}>
                      <Box
                        sx={{
                          borderRadius: 3,
                          height: "100%",
                          bgcolor: alpha(theme.palette.text.primary, 0.02),
                          border: "1px solid rgba(255,255,255,0.08)",
                          p: 1.25,
                        }}
                      >
                        <ExpertParticipationChart
                          total={totalExperts}
                          participated={participatedExperts}
                          notEvaluated={notEvaluatedExperts}
                          pending={pendingExperts}
                          declined={declinedExperts}
                        />
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={5}>
                      <Box
                        sx={{
                          borderRadius: 3,
                          height: "100%",
                          bgcolor: alpha(theme.palette.text.primary, 0.02),
                          border: "1px solid rgba(255,255,255,0.08)",
                          p: 1.25,
                        }}
                      >
                        <List disablePadding dense>
                          {[
                            { label: "Participated", value: participatedExperts, tone: "success" },
                            { label: "Accepted (not evaluated)", value: notEvaluatedExperts, tone: "info" },
                            { label: "Pending invitations", value: pendingExperts, tone: "warning" },
                            { label: "Declined", value: declinedExperts, tone: "error" },
                          ].map((row) => (
                            <ListItem
                              key={row.label}
                              disableGutters
                              sx={{
                                py: 0.7,
                                px: 0.5,
                                borderRadius: 2,
                                "&:not(:last-of-type)": { borderBottom: "1px solid rgba(255,255,255,0.06)" },
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Typography variant="body2" sx={{ fontWeight: 900, color: "text.secondary" }}>
                                    {row.label}
                                  </Typography>
                                }
                              />
                              <Pill tone={row.tone}>{row.value}</Pill>
                            </ListItem>
                          ))}
                        </List>

                        <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                            Total: {totalExperts}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
            </DrawerTabPanel>

            {/* Alternatives */}
            <DrawerTabPanel value={drawerTab} index={1}>
              <Stack spacing={1.5}>
                <Box sx={{ ...panelSx(theme, { bg: 0.10 }), p: 1.75 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                    <ViewListIcon fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                      Alternatives
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Pill tone="info">{alternatives.length}</Pill>
                  </Stack>

                  {alternatives.length === 0 ? (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      No alternatives defined.
                    </Typography>
                  ) : (
                    <List disablePadding sx={{ mt: 0.25 }}>
                      {alternatives.map((a, idx) => {
                        const name = typeof a === "string" ? a : a?.name || a?.title || `Alternative ${idx + 1}`;
                        return (
                          <ListItem
                            key={`${name}_${idx}`}
                            sx={{
                              borderRadius: 3,
                              mb: 0.75,
                              bgcolor: alpha(theme.palette.text.primary, 0.02),
                              "&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.08) },
                            }}
                          >
                            <ListItemText primary={<Typography sx={{ fontWeight: 950 }}>{name}</Typography>} />
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </Box>
              </Stack>
            </DrawerTabPanel>

            {/* Criteria */}
            <DrawerTabPanel value={drawerTab} index={2}>
              <Stack spacing={1.5}>
                <Box sx={{ ...panelSx(theme, { bg: 0.10 }), p: 1.75 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                    <CategoryIcon fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                      Criteria
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Pill tone="info">{criteriaCount}</Pill>
                  </Stack>

                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                    Leaf nodes show final weight (if computed).
                  </Typography>

                  <Box sx={{ mt: 1.25 }}>
                    <CriterionTree nodes={selectedIssue.criteria || []} finalWeights={finalWeights} />
                  </Box>
                </Box>
              </Stack>
            </DrawerTabPanel>

            {/* Timeline */}
            <DrawerTabPanel value={drawerTab} index={3}>
              <Stack spacing={1.5}>
                <Box sx={{ ...panelSx(theme, { bg: 0.10 }), p: 1.75 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                    <TimelineIcon fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                      Timeline
                    </Typography>
                  </Stack>

                  {(selectedIssue?.ui?.deadline?.hasDeadline || selectedIssue?.closureDate) ? (
                    <IssueTimeline creationDate={selectedIssue.creationDate} closureDate={deadlineLabel} />
                  ) : (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      No deadline defined.
                    </Typography>
                  )}
                </Box>
              </Stack>
            </DrawerTabPanel>

            {/* Experts */}
            {selectedIssue.isAdmin ? (
              <DrawerTabPanel value={drawerTab} index={4}>
                <Stack spacing={1.5}>
                  <Box sx={{ ...panelSx(theme, { bg: 0.10 }), p: 1.75 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                      <PeopleAltIcon fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                        Experts
                      </Typography>
                      <Box sx={{ flex: 1 }} />

                      <LoadingButton variant="outlined" color="secondary" startIcon={<EditOutlinedIcon />} onClick={toggleEditExperts}>
                        {isEditingExperts ? "Cancel edit" : "Edit"}
                      </LoadingButton>

                      {isEditingExperts ? (
                        <>
                          <LoadingButton
                            variant="outlined"
                            color="info"
                            startIcon={<PersonAddAlt1Icon />}
                            onClick={() => setOpenAddExpertsDialog(true)}
                          >
                            Add
                          </LoadingButton>

                          <LoadingButton variant="outlined" color="warning" loading={busy.editExperts} onClick={saveExpertsChanges}>
                            Save
                          </LoadingButton>
                        </>
                      ) : null}
                    </Stack>

                    <Stack spacing={1.1} sx={{ mt: 1.5 }}>
                      {[
                        { title: "Participated", list: selectedIssue.participatedExperts || [] },
                        { title: "Accepted (not evaluated)", list: selectedIssue.acceptedButNotEvaluatedExperts || [] },
                        { title: "Pending invitations", list: selectedIssue.pendingExperts || [] },
                        { title: "Declined", list: selectedIssue.notAcceptedExperts || [] },
                      ].map((block) => (
                        <Accordion
                          key={block.title}
                          disableGutters
                          elevation={0}
                          sx={{
                            borderRadius: 3,
                            overflow: "hidden",
                            bgcolor: alpha(theme.palette.text.primary, 0.03),
                            "&:before": { display: "none" },
                          }}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%" }}>
                              <Typography sx={{ fontWeight: 950, flex: 1 }}>{block.title}</Typography>
                              <Pill tone="info">{block.list.length}</Pill>
                            </Stack>
                          </AccordionSummary>

                          <AccordionDetails sx={{ pt: 0 }}>
                            {block.list.length === 0 ? (
                              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                —
                              </Typography>
                            ) : (
                              <Stack spacing={0.8}>
                                {block.list.map((email) => (
                                  <Stack
                                    key={email}
                                    direction="row"
                                    spacing={1}
                                    sx={{ alignItems: "center", justifyContent: "space-between" }}
                                  >
                                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                      {email}
                                    </Typography>

                                    {isEditingExperts ? (
                                      <LoadingButton
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        startIcon={<PersonRemoveAlt1Icon />}
                                        onClick={() => markRemoveExpert(email)}
                                        disabled={expertsToRemove.includes(email)}
                                      >
                                        {expertsToRemove.includes(email) ? "Marked" : "Remove"}
                                      </LoadingButton>
                                    ) : null}
                                  </Stack>
                                ))}
                              </Stack>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </Stack>

                    {Array.isArray(expertsToAdd) && expertsToAdd.length > 0 ? (
                      <Box
                        sx={{
                          mt: 1.25,
                          p: 1,
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.info.main, 0.08),
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                          Experts to add: {expertsToAdd.length}
                        </Typography>
                      </Box>
                    ) : null}
                  </Box>
                </Stack>
              </DrawerTabPanel>
            ) : null}
          </Box>

          <Divider sx={{ opacity: 0.18 }} />

          <Stack direction="row" justifyContent="flex-end" sx={{ p: 1.5 }}>
            {/* <LoadingButton variant="outlined" color="secondary" onClick={onClose}>
              Close
            </LoadingButton> */}
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
};

export default IssueDetailsDrawer;
