import { useEffect, useMemo, useState } from "react";

import { selectAlternativePhaseResults } from "../logic/selectFinishedIssueExecution.js";
import { FINISHED_ISSUE_TABS, FINISHED_ISSUE_VIEWS } from "../shared/logic/finishedIssueNavigation.js";
import { RESULTS_ANALYSIS_VIEWS } from "../sections/resultsAnalysis";

export const useFinishedIssueNavigation = ({ payload }) => {
  const [activeView, setActiveView] = useState(FINISHED_ISSUE_VIEWS.DASHBOARD);
  const [activeResultsAnalysisView, setActiveResultsAnalysisView] = useState(RESULTS_ANALYSIS_VIEWS.OUTCOME);
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
  const handleSelectTab = (tab) => {
    if (tab === FINISHED_ISSUE_TABS.RESULTS_ANALYSIS) {
      setActiveResultsAnalysisView(RESULTS_ANALYSIS_VIEWS.OUTCOME);
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
    setActiveResultsAnalysisView,
    handleChangePhase,
    handleSelectTab,
  };
};

export default useFinishedIssueNavigation;
