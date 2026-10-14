import { useEffect, useMemo, useState } from "react";

import { selectAlternativePhaseResults } from "../logic/selectFinishedIssueExecution.js";
import { FINISHED_ISSUE_TABS, FINISHED_ISSUE_VIEWS } from "../shared/logic/finishedIssueNavigation.js";
import { RESULTS_ANALYSIS_VIEWS, isResultsAnalysisView } from "../sections/resultsAnalysis/logic/resultsAnalysisNavigation.js";

export const useFinishedIssueNavigation = ({ payload, open = true }) => {
  const [activeView, setActiveView] = useState(FINISHED_ISSUE_VIEWS.DASHBOARD);
  const [activeResultsAnalysisView, setActiveResultsAnalysisView] = useState(RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const basePhases = useMemo(
    () => selectAlternativePhaseResults(payload).map((result) => result.phase),
    [payload]
  );

  useEffect(() => {
    setSelectedPhase(basePhases.at(-1) ?? null);
  }, [payload, basePhases]);
  useEffect(() => {
    if (!basePhases.includes(selectedPhase)) {
      setSelectedPhase(basePhases.at(-1) ?? null);
    }
  }, [basePhases, selectedPhase]);
  useEffect(() => {
    if (open) setActiveResultsAnalysisView(RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS);
  }, [open]);
  const handleSetActiveResultsAnalysisView = (view) => {
    if (isResultsAnalysisView(view)) setActiveResultsAnalysisView(view);
  };
  const handleSelectTab = (tab) => {
    if (tab === FINISHED_ISSUE_TABS.RESULTS_ANALYSIS) {
      setActiveResultsAnalysisView(RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS);
    }
    setActiveView(tab);
  };
  const handleChangePhase = (phase) => {
    const next = Number(phase);
    if (basePhases.includes(next)) setSelectedPhase(next);
  };
  const availableTabs = [
    FINISHED_ISSUE_TABS.DASHBOARD,
    FINISHED_ISSUE_TABS.OVERVIEW,
    FINISHED_ISSUE_TABS.RESULTS_ANALYSIS,
    FINISHED_ISSUE_TABS.EVALUATIONS,
    FINISHED_ISSUE_TABS.MODELS,
  ];

  return {
    activeView,
    activeResultsAnalysisView,
    selectedPhase,
    basePhases,
    availableTabs,
    setActiveResultsAnalysisView: handleSetActiveResultsAnalysisView,
    handleChangePhase,
    handleSelectTab,
  };
};

export default useFinishedIssueNavigation;
