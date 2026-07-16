import { useRef, useState } from "react";

import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { useFinishedIssueData } from "./useFinishedIssueData.js";
import { useFinishedIssueEvaluationsSelection } from "./useFinishedIssueEvaluationsSelection.js";
import { useFinishedIssueNavigation } from "./useFinishedIssueNavigation.js";
import { useFinishedIssueRuns } from "./useFinishedIssueRuns.js";

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
    selectedExecutionType: runs.selectedExecution.type,
  });
  const evaluationsSelection = useFinishedIssueEvaluationsSelection({ payload: data.payload });
  const scatterPlotRef = useRef(null);
  const [modelsParamsOpen, setModelsParamsOpen] = useState(false);

  return {
    selectedIssue,
    dialog: { payload: data.payload, loading: data.loading, error: data.error },
    header: {
      selectedExecutionKey: runs.selectedExecutionKey,
      selectedModelName: runs.selectedExecution.model?.name || "—",
      executionOptions: runs.executionOptions,
      showRounds: runs.selectedExecution.type === "base" && navigation.basePhases.length > 1,
      selectedPhase: navigation.selectedPhase,
      basePhases: navigation.basePhases,
      selectExecution: runs.selectExecution,
      changePhase: navigation.handleChangePhase,
      openAddScenario: runs.addDialog.open,
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
    },
    evaluationsSelection,
    runs,
    models: {
      paramsOpen: modelsParamsOpen,
      setParamsOpen: setModelsParamsOpen,
      addDialog: runs.addDialog,
      removeSelectedScenario: runs.removeSelectedScenario,
    },
  };
};

export default useFinishedIssueDialogView;
