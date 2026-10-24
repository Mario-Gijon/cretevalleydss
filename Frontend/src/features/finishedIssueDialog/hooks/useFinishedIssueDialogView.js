import { useEffect, useMemo, useRef } from "react";

import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { useFinishedIssueData } from "./useFinishedIssueData.js";
import { useFinishedIssueEvaluationsSelection } from "./useFinishedIssueEvaluationsSelection.js";
import { useFinishedIssueNavigation } from "./useFinishedIssueNavigation.js";
import { useFinishedIssueResultsSelection } from "./useFinishedIssueResultsSelection.js";
import { useFinishedIssueRuns } from "./useFinishedIssueRuns.js";
import { useFinishedIssueResultsReload } from "./useFinishedIssueResultsReload.js";
import { buildResultsAnalysisSelectableOptions } from "../sections/resultsAnalysis/logic/buildResultsAnalysisWorkspaceData.js";

export const useFinishedIssueDialogView = ({ selectedIssue, openFinishedIssueDialog }) => {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const data = useFinishedIssueData({ selectedIssue, open: openFinishedIssueDialog });
  const { issueId, refreshPayload, collectiveResolutionStatus } = data;
  const runs = useFinishedIssueRuns({
    issueId: data.issueId,
    payload: data.payload,
    refreshPayload: data.refreshPayload,
    showSnackbarAlert,
  });
  const navigation = useFinishedIssueNavigation({
    payload: data.payload,
    open: openFinishedIssueDialog,
  });
  const previousNavigationRef = useRef({ issueId: data.issueId, activeView: navigation.activeView });
  useEffect(() => {
    const previous = previousNavigationRef.current;
    const changedSection =
      previous.issueId === issueId && previous.activeView !== navigation.activeView;
    previousNavigationRef.current = { issueId, activeView: navigation.activeView };
    if (openFinishedIssueDialog && changedSection && collectiveResolutionStatus === "pending") {
      void refreshPayload();
    }
  }, [
    collectiveResolutionStatus,
    issueId,
    refreshPayload,
    navigation.activeView,
    openFinishedIssueDialog,
  ]);
  const evaluationsSelection = useFinishedIssueEvaluationsSelection({ payload: data.payload, selectedPhase: navigation.selectedPhase });
  const resultsExecutionOptions = useMemo(
    () => buildResultsAnalysisSelectableOptions(data.payload, navigation.selectedPhase),
    [data.payload, navigation.selectedPhase]
  );
  const resultsSelection = useFinishedIssueResultsSelection({
    issueId: data.issueId,
    executionOptions: resultsExecutionOptions,
  });
  const resultsReload = useFinishedIssueResultsReload({ issueId: data.issueId, refreshPayload: data.refreshPayload, showSnackbarAlert });

  return {
    selectedIssue,
    dialog: {
      payload: data.payload,
      loading: data.loading,
      error: data.error,
      collectiveResolutionStatus: data.collectiveResolutionStatus,
    },
    header: {
      showRounds: navigation.basePhases.length > 1,
      selectedPhase: navigation.selectedPhase,
      basePhases: navigation.basePhases,
      changePhase: navigation.handleChangePhase,
    },
    navigation: {
      activeView: navigation.activeView,
      activeTab: navigation.activeView,
      availableTabs: navigation.availableTabs,
      selectTab: navigation.handleSelectTab,
    },
    resultsAnalysisNavigation: {
      activeView: navigation.activeResultsAnalysisView,
      setActiveView: navigation.setActiveResultsAnalysisView,
    },
    resultsAnalysis: {
      selectedPhase: navigation.selectedPhase,
      selection: resultsSelection,
      reload: resultsReload,
    },
    evaluationsSelection: { ...evaluationsSelection, selectedPhase: navigation.selectedPhase },
    runs,
    models: {
      addDialog: runs.addDialog,
      removeScenario: runs.removeScenario,
    },
  };
};

export default useFinishedIssueDialogView;
