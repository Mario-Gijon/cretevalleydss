import { useEffect, useMemo, useState } from "react";
import {
  Stack,
  Typography,
  Box,
  Backdrop,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";

import { CircularLoading } from "../../../components/LoadingProgress/CircularLoading";
import {
  computeManualWeights,
  computeWeights,
  editExperts,
  leaveIssue,
  removeIssue,
  resolveIssue,
} from "../../../controllers/issueController";

import { EvaluationPairwiseMatrixDialog } from "../../../components/EvaluationPairwiseMatrixDialog/EvaluationPairwiseMatrixDialog";
import { EvaluationMatrixDialog } from "../../../components/EvaluationMatrixDialog/EvaluationMatrixDialog";

import { GlassDialog } from "../../../components/StyledComponents/GlassDialog";

import AddExpertsDomainsDialog from "../../../components/AddExpertsDomainsDialog/AddExpertsDomainsDialog";
import { ExpertsStep } from "../createIssue/Steps/ExpertsStep/ExpertsStep";

import { RateBwmWeightsDialog } from "../../../components/RateBwmWeightsDialog/RateBwmWeightsDialog";
import { RateConsensusWeightsDialog } from "../../../components/RateConsensusWeightsDialog/RateConsensusWeightsDialog";

// ✅ Tus componentes
import ActiveIssuesHeader, { getNextActionMeta, Pill, auroraBg } from "../../../components/ActiveIssuesHeader/ActiveIssuesHeader";
import TaskCenter from "../../../components/TaskCenter/TaskCenter";
import IssuesGrid from "../../../components/IssuesGrid/IssuesGrid";
import IssueDetailsDrawer from "../../../components/IssueDetailsDrawer/IssueDetailsDrawer";

const crystalBorder = () => {
  return { border: "1px solid rgba(117, 199, 209, 0.8)" };
};

const glassSx = (theme, strength = 0.14) => ({
  backgroundColor: alpha(theme.palette.background.paper, strength),
  ...auroraBg(theme, 0.14),
  backdropFilter: "blur(14px)",
  boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.10)}`,
  ...crystalBorder(theme, { level: "crystal" }),
});

const normalize = (v) => (v == null ? "" : String(v)).toLowerCase();

/** ✅ DFS iterativo para buscar dentro del árbol de criterios */
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

/** ✅ Extrae texto admin “best effort” */
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
  const [dd, mm, yyyy] = d.split("-").map((x) => Number(x));
  if (!dd || !mm || !yyyy) return 0;
  return new Date(yyyy, mm - 1, dd).getTime();
};

const ActiveIssuesPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery("(max-width:900px)");
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));

  const { showSnackbarAlert } = useSnackbarAlertContext();
  const issuesCtx = useIssuesDataContext();

  const {
    issueCreated,
    setIssueCreated,
    initialExperts,
    loading,
    setLoading,
    activeIssues,
    fetchActiveIssues,
    fetchFinishedIssues,
  } = issuesCtx;

  // ✅ si tu context ya los expone, los usamos
  const [serverTaskCenter, setServerTaskCenter] = useState(null);
  const [serverFiltersMeta, setServerFiltersMeta] = useState(null);

  const taskCenter = issuesCtx.taskCenter ?? serverTaskCenter;
  const filtersMeta = issuesCtx.filtersMeta ?? serverFiltersMeta;

  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const selectedIssue = useMemo(
    () => activeIssues?.find((i) => i.id === selectedIssueId) || null,
    [activeIssues, selectedIssueId]
  );

  const [drawerOpen, setDrawerOpen] = useState(false);

  // ✅ SOLO: buscar + scope + ordenar
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [sortBy, setSortBy] = useState(filtersMeta?.defaults?.sort || "recent");

  // task center filter
  const [taskType, setTaskType] = useState("all");

  // drawer tabs
  const [drawerTab, setDrawerTab] = useState(0);

  // dialogs externos
  const [isRatingAlternatives, setIsRatingAlternatives] = useState(false);
  const [isRatingWeights, setIsRatingWeights] = useState(false);

  // edición experts
  const [isEditingExperts, setIsEditingExperts] = useState(false);
  const [expertsToRemove, setExpertsToRemove] = useState([]);
  const [expertsToAdd, setExpertsToAdd] = useState([]);
  const [openAddExpertsDialog, setOpenAddExpertsDialog] = useState(false);
  const [openAssignDomainsDialog, setOpenAssignDomainsDialog] = useState(false);

  // confirm genérico
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    tone: "warning",
    action: null,
  });

  const runConfirm = async () => {
    const action = confirm.action;
    setConfirm((c) => ({ ...c, open: false, action: null }));
    if (typeof action === "function") await action();
  };

  // busy actions
  const [busy, setBusy] = useState({
    resolve: false,
    compute: false,
    remove: false,
    leave: false,
    editExperts: false,
  });

  const [refreshing, setRefreshing] = useState(false);

  const refresh = async ({ alsoFinished = false } = {}) => {
    const r = await fetchActiveIssues();
    if (r?.taskCenter) setServerTaskCenter(r.taskCenter);
    if (r?.filtersMeta) setServerFiltersMeta(r.filtersMeta);
    if (alsoFinished) await fetchFinishedIssues();
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const r = await fetchActiveIssues();
      if (r?.taskCenter) setServerTaskCenter(r.taskCenter);
      if (r?.filtersMeta) setServerFiltersMeta(r.filtersMeta);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (issueCreated?.success) {
      showSnackbarAlert(issueCreated.msg, "success");
      setIssueCreated("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueCreated, setIssueCreated]);

  useEffect(() => {
    if (drawerOpen && selectedIssueId && !selectedIssue && !loading) {
      setDrawerOpen(false);
      setSelectedIssueId(null);
      setIsEditingExperts(false);
      setExpertsToAdd([]);
      setExpertsToRemove([]);
      setDrawerTab(0);
    }
  }, [drawerOpen, selectedIssueId, selectedIssue, loading]);

  const openDetails = (issue) => {
    setSelectedIssueId(issue.id);
    setDrawerOpen(true);
    setDrawerTab(0);
  };

  const openDetailsById = (id) => {
    setSelectedIssueId(id);
    setDrawerOpen(true);
    setDrawerTab(0);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedIssueId(null);
    setIsEditingExperts(false);
    setExpertsToAdd([]);
    setExpertsToRemove([]);
    setDrawerTab(0);
  };

  const minimizeDrawerOnly = () => {
    setDrawerOpen(false);
  };

  const openConfirm = ({ title, description, confirmText, tone = "warning", action }) => {
    setConfirm({ open: true, title, description, confirmText: confirmText || "Confirm", tone, action });
  };

  // ✅ reset “solo lo que existe”
  const resetFilters = () => {
    setQuery("");
    setSearchBy("all");
    setSortBy(filtersMeta?.defaults?.sort || "smart");
  };

  // ✅ buscador por scope
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

  const filteredIssuesBase = useMemo(() => {
    return (activeIssues || []).filter(matchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIssues, query, searchBy]);

  // ✅ sort: soporta extras del server si llegan
  const filteredIssues = useMemo(() => {
    const arr = [...filteredIssuesBase];

    const deadlineDays = (i) => {
      const dl = i?.ui?.deadline;
      if (dl?.hasDeadline && typeof dl.daysLeft === "number") return dl.daysLeft;
      if (i?.closureDate) {
        const end = parseDateDDMMYYYY(i.closureDate);
        const now = Date.now();
        return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      }
      return 999999;
    };

    const smartPriority = (i) => i?.ui?.sortPriority ?? 90;

    if (sortBy === "name" || sortBy === "nameAsc") {
      arr.sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    } else if (sortBy === "nameDesc") {
      arr.sort((a, b) => (b?.name || "").localeCompare(a?.name || ""));
    } else if (sortBy === "deadlineSoon") {
      arr.sort((a, b) => deadlineDays(a) - deadlineDays(b));
    } else if (sortBy === "recent") {
      arr.sort((a, b) => parseDateDDMMYYYY(b?.creationDate) - parseDateDDMMYYYY(a?.creationDate));
    } else {
      arr.sort((a, b) => {
        const p = smartPriority(a) - smartPriority(b);
        if (p !== 0) return p;
        const d = deadlineDays(a) - deadlineDays(b);
        if (d !== 0) return d;
        return (a?.name || "").localeCompare(b?.name || "");
      });
    }

    return arr;
  }, [filteredIssuesBase, sortBy]);


  const headerSignals = useMemo(() => {
    const list = activeIssues || [];
    let actionable = 0;
    let waitingAdmin = 0;
    let waitingExperts = 0;

    list.forEach((i) => {
      const k = i?.ui?.statusKey || i?.nextAction?.key || null;
      if (["evaluateWeights", "evaluateAlternatives", "computeWeights", "resolveIssue"].includes(k)) actionable += 1;
      else if (k === "waitingAdmin") waitingAdmin += 1;
      else if (k === "pendingInvitations") waitingExperts += 1;
      else {
        const k2 = getNextActionMeta(i)?.key;
        if (k2 === "waitingExperts") waitingExperts += 1;
      }
    });

    return { actionable, waitingAdmin, waitingExperts };
  }, [activeIssues]);

  // ✅ legacy taskGroups (solo si NO hay taskCenter del server todavía)
  const taskGroupsLegacy = useMemo(() => {
    const list = activeIssues || [];
    const groups = [
      { key: "evalAlt", title: "Evaluate alternatives", tone: "info", icon: null, match: (i) => i?.statusFlags?.canEvaluateAlternatives },
      { key: "evalW", title: "Evaluate weights", tone: "info", icon: null, match: (i) => i?.statusFlags?.canEvaluateWeights },
      { key: "computeW", title: "Compute weights (admin)", tone: "warning", icon: null, match: (i) => i?.isAdmin && i?.statusFlags?.canComputeWeights },
      { key: "resolve", title: "Resolve (admin)", tone: "warning", icon: null, match: (i) => i?.isAdmin && i?.statusFlags?.canResolveIssue },
    ];
    return groups.map((g) => ({ ...g, items: list.filter(g.match) })).filter((g) => g.items.length > 0);
  }, [activeIssues]);

  const serverHasTasks = useMemo(() => {
    const s = taskCenter?.sections;
    return Array.isArray(s) && s.some((sec) => Array.isArray(sec?.items) && sec.items.length > 0);
  }, [taskCenter]);

  const legacyTotalTasks = useMemo(() => {
    return (taskGroupsLegacy || []).reduce((acc, g) => acc + (g.items?.length || 0), 0);
  }, [taskGroupsLegacy]);

  const tasksCount = useMemo(() => {
    if (serverHasTasks && typeof taskCenter?.total === "number") return taskCenter.total;
    return legacyTotalTasks;
  }, [serverHasTasks, taskCenter, legacyTotalTasks]);

  const overview = useMemo(() => {
    const list = activeIssues || [];
    const adminCount = list.filter((i) => i?.isAdmin).length;

    // ✅ "Ready to resolve" = issues donde el admin puede resolver ya
    const readyResolve = list.filter((i) => i?.statusFlags?.canResolveIssue).length;

    return { total: list.length, tasks: tasksCount, admin: adminCount, readyResolve };
  }, [activeIssues, tasksCount]);

  const existingExpertEmails = useMemo(() => {
    if (!selectedIssue) return [...expertsToAdd];
    return [
      ...(selectedIssue?.participatedExperts || []),
      ...(selectedIssue?.acceptedButNotEvaluatedExperts || []),
      ...(selectedIssue?.pendingExperts || []),
      ...(selectedIssue?.notAcceptedExperts || []),
      ...expertsToAdd,
    ];
  }, [selectedIssue, expertsToAdd]);

  const availableExperts = useMemo(() => {
    return (initialExperts || []).filter((e) => !existingExpertEmails.includes(e.email));
  }, [initialExperts, existingExpertEmails]);

  const handleRemoveIssue = async () => {
    if (!selectedIssue) return;
    setBusy((b) => ({ ...b, remove: true }));
    const res = await removeIssue(selectedIssue.id);

    if (res?.success) {
      showSnackbarAlert(res.msg, "success");
      await refresh();
      closeDrawer();
    } else {
      showSnackbarAlert(res?.msg || "Error removing issue", "error");
    }
    setBusy((b) => ({ ...b, remove: false }));
  };

  const handleLeaveIssue = async () => {
    if (!selectedIssue) return;
    setBusy((b) => ({ ...b, leave: true }));
    const res = await leaveIssue(selectedIssue.id);

    if (res?.success) {
      showSnackbarAlert(res.msg, "success");
      await refresh();
      closeDrawer();
    } else {
      showSnackbarAlert(res?.msg || "Error leaving issue", "error");
    }
    setBusy((b) => ({ ...b, leave: false }));
  };

  const handleResolveIssue = async () => {
    if (!selectedIssue) return;
    setBusy((b) => ({ ...b, resolve: true }));

    const res = await resolveIssue(selectedIssue.id, selectedIssue.isPairwise);

    if (res?.success) {
      showSnackbarAlert(res.msg, res.finished ? "success" : "info");
      await refresh({ alsoFinished: Boolean(res.finished) });
      closeDrawer();
    } else {
      showSnackbarAlert(res?.msg || "Error resolving issue", "error");
      setLoading(false);
      closeDrawer();
    }

    setBusy((b) => ({ ...b, resolve: false }));
  };

  const handleComputeWeights = async () => {
    if (!selectedIssue) return;
    setBusy((b) => ({ ...b, compute: true }));

    const res =
      selectedIssue.weightingMode === "consensus"
        ? await computeManualWeights(selectedIssue.id)
        : await computeWeights(selectedIssue.id);

    if (res?.success) {
      showSnackbarAlert(res.msg, res.finished ? "success" : "info");
      await refresh({ alsoFinished: true });
      closeDrawer();
    } else {
      showSnackbarAlert(res?.msg || "Error computing weights", "error");
      setLoading(false);
      closeDrawer();
    }

    setBusy((b) => ({ ...b, compute: false }));
  };

  const toggleEditExperts = () => {
    if (!selectedIssue) return;
    if (isEditingExperts) {
      setIsEditingExperts(false);
      setExpertsToAdd([]);
      setExpertsToRemove([]);
    } else {
      setIsEditingExperts(true);
    }
  };

  const markRemoveExpert = (email) => {
    setExpertsToRemove((prev) => [...new Set([...prev, email])]);
  };

  const saveExpertsChanges = async () => {
    if (!selectedIssue) return;

    const currentExperts = [
      ...(selectedIssue.participatedExperts || []),
      ...(selectedIssue.acceptedButNotEvaluatedExperts || []),
      ...(selectedIssue.pendingExperts || []),
      ...(selectedIssue.notAcceptedExperts || []),
    ];

    const remaining = currentExperts.filter((e) => !expertsToRemove.includes(e));
    if (remaining.length + expertsToAdd.length < 1) {
      showSnackbarAlert("An issue must have at least one expert.", "error");
      return;
    }

    if (expertsToAdd.length > 0) {
      setOpenAssignDomainsDialog(true);
      return;
    }

    await processEditExperts(null);
  };

  const processEditExperts = async (domainAssignments = null) => {
    if (!selectedIssue) return;
    setBusy((b) => ({ ...b, editExperts: true }));

    const res = await editExperts(selectedIssue.id, expertsToAdd, expertsToRemove, domainAssignments);

    showSnackbarAlert(res?.msg || "Experts updated", res?.success ? "success" : "error");
    await refresh();

    setBusy((b) => ({ ...b, editExperts: false }));
    setOpenAssignDomainsDialog(false);
    setIsEditingExperts(false);
    setExpertsToAdd([]);
    setExpertsToRemove([]);
  };

  const handleConfirmDomains = async (domainAssignments) => {
    await processEditExperts(domainAssignments);
  };

  if (loading) return <CircularLoading color="secondary" size={50} height="30vh" />;

  if (!activeIssues || activeIssues.length === 0) {
    return (
      <Stack sx={{ mt: 6 }} spacing={1} alignItems="center">
        <Typography variant="h4" sx={{ textAlign: "center", fontWeight: 950 }}>
          No active issues
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", maxWidth: 520 }}>
          Create a new issue or accept an invitation and it will appear here.
        </Typography>
      </Stack>
    );
  }

  // ✅ MISMO ALTO para header y tasks (fila superior)
  const TOP_H = 235; // ajusta: 320/340/360...
  // ✅ Header ~2/3 ancho (2fr) y Tasks ~1/3 (1fr). Min widths por ergonomía
  const COLS = "minmax(560px, 1.6fr) minmax(360px, 1fr)";

  return (
    <>
      <Backdrop open={busy.resolve || busy.compute || busy.remove || busy.leave || busy.editExperts} sx={{ zIndex: 999999 }}>
        <CircularLoading color="secondary" size={50} height="50vh" />
      </Backdrop>

      <Box sx={{ maxWidth: 2500, mx: "auto", px: { xs: 1.5, md: 2.5 }, pt: 2 }}>
        {isLgUp ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: COLS,
              gridTemplateRows: `${TOP_H}px auto`,
              gridTemplateAreas: `
                "header task"
                "issues issues"
              `,
              gap: 1,
              alignItems: "stretch", // ✅ clave: estirar celdas
            }}
          >
            <Box sx={{ gridArea: "header", minWidth: 0 }}>
              <ActiveIssuesHeader
                isLgUp
                filteredCount={filteredIssues.length}
                totalCount={activeIssues.length}
                headerSignals={headerSignals}
                overview={overview}
                resetFilters={resetFilters}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                query={query}
                setQuery={setQuery}
                searchBy={searchBy}
                setSearchBy={setSearchBy}
                sortBy={sortBy}
                setSortBy={setSortBy}
                // ✅ misma altura que tasks
                height={TOP_H}
                filtersMeta={filtersMeta}
              />
            </Box>

            <Box sx={{ gridArea: "task", minWidth: 0, height: TOP_H }}>
              <TaskCenter
                variant="rail"
                height={TOP_H} minHeight={TOP_H}
                taskGroups={!taskCenter ? taskGroupsLegacy : null}
                tasksCount={tasksCount}
                taskCenter={taskCenter}
                taskType={taskType}
                setTaskType={setTaskType}
                onOpenIssue={openDetails}
                onOpenIssueId={openDetailsById}
              />
            </Box>

            <Box sx={{ gridArea: "issues", minWidth: 0, width: "100%", pt: 0, mt: 0 }}>
              <IssuesGrid issues={filteredIssues} onOpenIssue={openDetails} sx={{ mt: 0 }} />
            </Box>
          </Box>
        ) : (
          <>
            <ActiveIssuesHeader
              isLgUp={false}
              filteredCount={filteredIssues.length}
              totalCount={activeIssues.length}
              headerSignals={headerSignals}
              overview={overview}
              resetFilters={resetFilters}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              query={query}
              setQuery={setQuery}
              searchBy={searchBy}
              setSearchBy={setSearchBy}
              sortBy={sortBy}
              setSortBy={setSortBy}
              height="auto"
              filtersMeta={filtersMeta}
            />

            {!isMobile ? (
              <Box sx={{ mt: 2 }}>
                <TaskCenter
                  variant="rail"
                  taskGroups={!taskCenter ? taskGroupsLegacy : null}
                  tasksCount={tasksCount}
                  taskCenter={taskCenter}
                  taskType={taskType}
                  setTaskType={setTaskType}
                  onOpenIssue={openDetails}
                  onOpenIssueId={openDetailsById}
                  height="auto"
                  minHeight={132}
                />
              </Box>
            ) : (
              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  mt: 2,
                  borderRadius: 5,
                  overflow: "hidden",
                  position: "relative",
                  ...glassSx(theme, 0.16),
                  "&:before": { display: "none" },
                  "&:after": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 40%)`,
                    opacity: 0.18,
                  },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 980, flex: 1 }}>
                      Tasks
                    </Typography>
                    <Pill tone={tasksCount ? "warning" : "success"}>{tasksCount}</Pill>
                  </Stack>
                </AccordionSummary>

                <AccordionDetails>
                  <TaskCenter
                    variant="panel"
                    taskCenter={taskCenter}
                    taskGroups={!taskCenter ? taskGroupsLegacy : null}
                    tasksCount={tasksCount}
                    taskType={taskType}
                    setTaskType={setTaskType}
                    onOpenIssue={openDetails}
                    onOpenIssueId={openDetailsById}
                    height="auto"
                    minHeight={260}
                  />
                </AccordionDetails>
              </Accordion>
            )}

            <IssuesGrid issues={filteredIssues} onOpenIssue={openDetails} sx={{ mt: 2 }} />
          </>
        )}
      </Box>

      {/* Drawer details */}
      <IssueDetailsDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onMinimize={minimizeDrawerOnly}
        selectedIssue={selectedIssue}
        isMobile={isMobile}
        drawerTab={drawerTab}
        setDrawerTab={setDrawerTab}
        busy={busy}
        openConfirm={openConfirm}
        handleLeaveIssue={handleLeaveIssue}
        handleComputeWeights={handleComputeWeights}
        handleResolveIssue={handleResolveIssue}
        handleRemoveIssue={handleRemoveIssue}
        isEditingExperts={isEditingExperts}
        toggleEditExperts={toggleEditExperts}
        expertsToRemove={expertsToRemove}
        markRemoveExpert={markRemoveExpert}
        expertsToAdd={expertsToAdd}
        setOpenAddExpertsDialog={setOpenAddExpertsDialog}
        saveExpertsChanges={saveExpertsChanges}
        setIsRatingAlternatives={setIsRatingAlternatives}
        setIsRatingWeights={setIsRatingWeights}
      />

      {/* Dialogs externos */}
      {selectedIssue?.isPairwise ? (
        <EvaluationPairwiseMatrixDialog
          setOpenIssueDialog={setDrawerOpen}
          isRatingAlternatives={isRatingAlternatives}
          setIsRatingAlternatives={setIsRatingAlternatives}
          selectedIssue={selectedIssue}
        />
      ) : (
        <EvaluationMatrixDialog
          setOpenIssueDialog={setDrawerOpen}
          isRatingAlternatives={isRatingAlternatives}
          setIsRatingAlternatives={setIsRatingAlternatives}
          selectedIssue={selectedIssue}
        />
      )}

      {selectedIssue?.weightingMode === "consensus" ? (
        <RateConsensusWeightsDialog
          isRatingWeights={isRatingWeights}
          setIsRatingWeights={setIsRatingWeights}
          selectedIssue={selectedIssue}
          handleCloseIssueDialog={closeDrawer}
        />
      ) : (
        <RateBwmWeightsDialog
          isRatingWeights={isRatingWeights}
          setIsRatingWeights={setIsRatingWeights}
          selectedIssue={selectedIssue}
          handleCloseIssueDialog={closeDrawer}
        />
      )}

      {/* ✅ Confirm dialog */}
      <GlassDialog
        open={confirm.open}
        onClose={() => setConfirm((c) => ({ ...c, open: false, action: null }))}
        PaperProps={{ elevation: 0 }}
        maxWidth="xs"
      >
        <Box sx={{ p: 2.25 }}>
          <Typography variant="h6" sx={{ fontWeight: 980 }}>
            {confirm.title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75 }}>
            {confirm.description}
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
              onClick={() => setConfirm((c) => ({ ...c, open: false, action: null }))}
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
              }}
              onClick={runConfirm}
            >
              {confirm.confirmText}
            </Box>
          </Stack>
        </Box>
      </GlassDialog>

      {/* Add experts dialog */}
      <GlassDialog
        open={openAddExpertsDialog}
        onClose={() => setOpenAddExpertsDialog(false)}
        PaperProps={{ elevation: 0 }}
        maxWidth="auto"
      >
        <ExpertsStep
          initialExperts={availableExperts}
          addedExperts={expertsToAdd}
          setAddedExperts={setExpertsToAdd}
          closeAddExpertsDialog={{ closeAddExpertsDialog: () => setOpenAddExpertsDialog(false) }}
        />
      </GlassDialog>

      {/* Domains assignment dialog */}
      <AddExpertsDomainsDialog
        open={openAssignDomainsDialog}
        onClose={() => setOpenAssignDomainsDialog(false)}
        issue={selectedIssue}
        expertsToAdd={expertsToAdd}
        onConfirmDomains={handleConfirmDomains}
      />
    </>
  );
};

export default ActiveIssuesPage;
