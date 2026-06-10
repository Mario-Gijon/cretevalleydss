export const normalizeAdminIssueText = (value) =>
  String(value ?? "").toLowerCase().trim();

export const getAdminIssueStageLabel = (issue) =>
  issue?.currentStageMeta?.label ||
  issue?.currentStageMeta?.key ||
  issue?.currentStage ||
  "—";

export const getAdminIssueStageTone = (stageKey) => {
  if (stageKey === "finished") return "success";
  if (stageKey === "weightsFinished") return "warning";
  if (stageKey === "criteriaWeighting") return "info";
  if (stageKey === "alternativeEvaluation") return "info";
  return "secondary";
};

export const getAdminIssueProgressTone = (pct) => {
  if (pct >= 100) return "success";
  if (pct > 0) return "warning";
  return "info";
};
