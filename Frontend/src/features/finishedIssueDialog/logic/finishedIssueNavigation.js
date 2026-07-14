export const FINISHED_ISSUE_VIEWS = Object.freeze({
  OVERVIEW: "overview",
  ISSUE_DETAILS: "issue-details",
  RESULTS: "results",
  GRAPHS: "graphs",
  ANALYSIS: "analysis",
  EVALUATIONS: "evaluations",
  CONSENSUS: "consensus",
  MODELS: "models",
});

export const FINISHED_ISSUE_TABS = Object.freeze({
  OVERVIEW: "overview",
  RESULTS: "results",
  ANALYSIS: "analysis",
  EVALUATIONS: "evaluations",
  CONSENSUS: "consensus",
  MODELS: "models",
});

export const getFinishedIssueParentTab = (view) => {
  if (view === FINISHED_ISSUE_VIEWS.ISSUE_DETAILS) return FINISHED_ISSUE_TABS.OVERVIEW;
  if (view === FINISHED_ISSUE_VIEWS.GRAPHS) return FINISHED_ISSUE_TABS.RESULTS;
  return view;
};

export const getFinishedIssueTabDefaultView = (tab) => {
  if (tab === FINISHED_ISSUE_TABS.OVERVIEW) return FINISHED_ISSUE_VIEWS.OVERVIEW;
  return tab;
};
