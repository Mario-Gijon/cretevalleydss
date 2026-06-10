import { getAdminIssueStageLabel } from "./getAdminIssueStatusDisplay";

export const buildAdminIssueStats = (issues = []) => {
  const list = Array.isArray(issues) ? issues : [];

  return {
    total: list.length,
    active: list.filter((issue) => issue?.active).length,
    finished: list.filter((issue) => !issue?.active).length,
    consensus: list.filter((issue) => issue?.isConsensus).length,
    pairwise: list.filter(
      (issue) =>
        issue?.alternativeEvaluationStructureKey ===
        "alternativePairwiseByCriterion"
    ).length,
  };
};

export const buildAdminIssueStageOptions = (issues = []) => {
  const map = new Map();
  const list = Array.isArray(issues) ? issues : [];

  list.forEach((issue) => {
    const key = issue?.currentStage || "unknown";
    const label = getAdminIssueStageLabel(issue);
    if (!map.has(key)) {
      map.set(key, label);
    }
  });

  return Array.from(map.entries()).sort((left, right) =>
    left[1].localeCompare(right[1])
  );
};
