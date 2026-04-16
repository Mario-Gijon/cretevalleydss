import { useState } from "react";
import { Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { CircularLoading } from "../../../components/LoadingProgress/CircularLoading";
import { useActiveIssueDrawer } from "../../../features/activeIssues/hooks/useActiveIssueDrawer";
import { useActiveIssuesListing } from "../../../features/activeIssues/hooks/useActiveIssuesListing";
import { useActiveIssueActions } from "../../../features/activeIssues/hooks/useActiveIssueActions";
import { useActiveIssuesScreenSync } from "../../../features/activeIssues/hooks/useActiveIssuesScreenSync";
import { useActiveIssueConfirm } from "../../../features/activeIssues/hooks/useActiveIssueConfirm";
import ActiveIssuesDesktopLayout from "../../../features/activeIssues/components/layout/ActiveIssuesDesktopLayout";
import ActiveIssuesMobileLayout from "../../../features/activeIssues/components/layout/ActiveIssuesMobileLayout";
import ActiveIssuesOverlays from "../../../features/activeIssues/components/shared/ActiveIssuesOverlays";
import IssueExpertsFlowProvider from "../../../features/issueExperts/providers/IssueExpertsFlowProvider.jsx";

/**
 * Página de issues activos.
 *
 * Se encarga de orquestar hooks de estado y delega
 * el render principal en layouts y overlays del feature.
 *
 * @returns {JSX.Element}
 */
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

  const {
    taskCenter,
    filtersMeta,
    refreshing,
    refresh,
    handleRefresh,
  } = useActiveIssuesScreenSync({
    taskCenterFromContext: issuesCtx.taskCenter,
    filtersMetaFromContext: issuesCtx.filtersMeta,
    issueCreated,
    setIssueCreated,
    showSnackbarAlert,
    fetchActiveIssues,
    fetchFinishedIssues,
  });

  const {
    query,
    searchBy,
    sortBy,
    taskType,
    filteredIssues,
    taskGroupsLegacy,
    tasksCount,
    overview,
    setQuery,
    setSearchBy,
    setSortBy,
    setTaskType,
  } = useActiveIssuesListing({
    activeIssues,
    taskCenter,
    filtersMeta,
  });

  const [isRatingAlternatives, setIsRatingAlternatives] = useState(false);
  const [isRatingWeights, setIsRatingWeights] = useState(false);

  const {
    selectedIssue,
    drawerOpen,
    drawerTab,
    setDrawerTab,
    setDrawerOpen,
    openDetails,
    openDetailsById,
    closeDrawer,
    minimizeDrawerOnly,
  } = useActiveIssueDrawer({
    activeIssues,
    loading,
  });

  const {
    busy,
    setBusy,
    handleRemoveIssue,
    handleLeaveIssue,
    handleResolveIssue,
    handleComputeWeights,
  } = useActiveIssueActions({
    selectedIssue,
    showSnackbarAlert,
    refresh,
    closeDrawer,
    setLoading,
  });

  const {
    confirm,
    openConfirm,
    closeConfirm,
    runConfirm,
  } = useActiveIssueConfirm();

  if (loading) {
    return <CircularLoading color="secondary" size={50} height="30vh" />;
  }

  if (!activeIssues || activeIssues.length === 0) {
    return (
      <Stack sx={{ mt: 6 }} spacing={1} alignItems="center">
        <Typography variant="h4" sx={{ textAlign: "center", fontWeight: 950 }}>
          No active issues
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      {isLgUp ? (
        <ActiveIssuesDesktopLayout
          filteredIssues={filteredIssues}
          totalIssues={activeIssues.length}
          overview={overview}
          refreshing={refreshing}
          handleRefresh={handleRefresh}
          query={query}
          setQuery={setQuery}
          searchBy={searchBy}
          setSearchBy={setSearchBy}
          sortBy={sortBy}
          setSortBy={setSortBy}
          filtersMeta={filtersMeta}
          taskCenter={taskCenter}
          taskGroupsLegacy={taskGroupsLegacy}
          tasksCount={tasksCount}
          taskType={taskType}
          setTaskType={setTaskType}
          openDetails={openDetails}
          openDetailsById={openDetailsById}
        />
      ) : (
        <ActiveIssuesMobileLayout
          isMobile={isMobile}
          filteredIssues={filteredIssues}
          overview={overview}
          refreshing={refreshing}
          handleRefresh={handleRefresh}
          query={query}
          setQuery={setQuery}
          searchBy={searchBy}
          setSearchBy={setSearchBy}
          sortBy={sortBy}
          setSortBy={setSortBy}
          filtersMeta={filtersMeta}
          taskCenter={taskCenter}
          taskGroupsLegacy={taskGroupsLegacy}
          tasksCount={tasksCount}
          taskType={taskType}
          setTaskType={setTaskType}
          openDetails={openDetails}
          openDetailsById={openDetailsById}
        />
      )}

      <IssueExpertsFlowProvider
        selectedIssue={selectedIssue}
        initialExperts={initialExperts}
        showSnackbarAlert={showSnackbarAlert}
        refresh={refresh}
        setBusy={setBusy}
      >
        <ActiveIssuesOverlays
          busy={busy}
          drawerOpen={drawerOpen}
          closeDrawer={closeDrawer}
          minimizeDrawerOnly={minimizeDrawerOnly}
          selectedIssue={selectedIssue}
          isMobile={isMobile}
          drawerTab={drawerTab}
          setDrawerTab={setDrawerTab}
          openConfirm={openConfirm}
          handleLeaveIssue={handleLeaveIssue}
          handleComputeWeights={handleComputeWeights}
          handleResolveIssue={handleResolveIssue}
          handleRemoveIssue={handleRemoveIssue}
          setIsRatingAlternatives={setIsRatingAlternatives}
          setIsRatingWeights={setIsRatingWeights}
          setDrawerOpen={setDrawerOpen}
          isRatingAlternatives={isRatingAlternatives}
          isRatingWeights={isRatingWeights}
          confirm={confirm}
          closeConfirm={closeConfirm}
          runConfirm={runConfirm}
        />
      </IssueExpertsFlowProvider>
    </>
  );
};

export default ActiveIssuesPage;