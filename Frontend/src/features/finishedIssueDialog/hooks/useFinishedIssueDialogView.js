import { useMemo, useRef } from "react";

import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { useFinishedIssueData } from "./useFinishedIssueData.js";
import { useFinishedIssueEvaluationsSelection } from "./useFinishedIssueEvaluationsSelection.js";
import { useFinishedIssueNavigation } from "./useFinishedIssueNavigation.js";
import { useFinishedIssueResultsSelection } from "./useFinishedIssueResultsSelection.js";
import { useFinishedIssueRuns } from "./useFinishedIssueRuns.js";
import { buildResultsAnalysisSelectableOptions } from "../sections/resultsAnalysis/logic/buildResultsAnalysisWorkspaceData.js";

export const useFinishedIssueDialogView = ({ selectedIssue, openFinishedIssueDialog }) => {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const data = useFinishedIssueData({ selectedIssue, open: openFinishedIssueDialog });
  const runs = useFinishedIssueRuns({
    issueId: data.issueId,
    payload: data.payload,
    refreshPayload: data.refreshPayload,
    showSnackbarAlert,
  });
  const navigation = useFinishedIssueNavigation({
    payload: data.payload,
  });
  const evaluationsSelection = useFinishedIssueEvaluationsSelection({ payload: data.payload, selectedPhase: navigation.selectedPhase });
  const resultsExecutionOptions = useMemo(
    () => buildResultsAnalysisSelectableOptions(data.payload),
    [data.payload]
  );
  const resultsSelection = useFinishedIssueResultsSelection({
    issueId: data.issueId,
    executionOptions: resultsExecutionOptions,
  });
  const scatterPlotRef = useRef(null);

  return {
    selectedIssue,
    dialog: { payload: data.payload, loading: data.loading, error: data.error },
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
      scatterPlotRef,
      resetZoom: () => scatterPlotRef.current?.resetZoom?.(),
      selectedPhase: navigation.selectedPhase,
      selection: resultsSelection,
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
