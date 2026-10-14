export const RESULTS_ANALYSIS_VIEWS = Object.freeze({
  VISUALIZATIONS: "visualizations",
  INTERPRETATION: "interpretation",
});

export const isResultsAnalysisView = (view) =>
  Object.values(RESULTS_ANALYSIS_VIEWS).includes(view);
