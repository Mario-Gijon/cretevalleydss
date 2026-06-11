import { useState } from "react";
import { Box, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { CircularLoading } from "../../../components/LoadingProgress/CircularLoading";
import { useActiveIssueDrawer } from "../hooks/useActiveIssueDrawer";
import { useActiveIssuesListing } from "../hooks/useActiveIssuesListing";
import { useActiveIssueActions } from "../hooks/useActiveIssueActions";
import { useActiveIssuesScreenSync } from "../hooks/useActiveIssuesScreenSync";
import { useActiveIssueConfirm } from "../hooks/useActiveIssueConfirm";
import ActiveIssuesDesktopView from "./ActiveIssuesDesktopView";
import ActiveIssuesMobileView from "./ActiveIssuesMobileView";
import ActiveIssuesOverlays from "./ActiveIssuesOverlays";
import IssueExpertsProvider from "../../issueExperts/context/issueExperts.provider.jsx";

/**
 * Vista principal del feature de issues activos.
 *
 * Orquesta hooks de estado y delega el render
 * en layouts y overlays del propio feature.
 *
 * @returns {JSX.Element}
 */
const ActiveIssuesView = () => {
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
    tasksCount,
    overview,
    setQuery,
    setSearchBy,
    setSortBy,
    setTaskType,
  } = useActiveIssuesListing({
    activeIssues,
    taskCenter,
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
      <Box p={{xs: 1, sm:0}}>
        {isLgUp ? (
          <ActiveIssuesDesktopView
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
            taskCenter={taskCenter}
            tasksCount={tasksCount}
            taskType={taskType}
            setTaskType={setTaskType}
            openDetails={openDetails}
            openDetailsById={openDetailsById}
          />
        ) : (
          <ActiveIssuesMobileView
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
            taskCenter={taskCenter}
            tasksCount={tasksCount}
            taskType={taskType}
            setTaskType={setTaskType}
            openDetails={openDetails}
            openDetailsById={openDetailsById}
          />
        )}

      </Box>


      <IssueExpertsProvider
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
      </IssueExpertsProvider>
    </>
  );
};

export default ActiveIssuesView;
