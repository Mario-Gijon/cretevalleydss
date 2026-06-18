import { normalizeAdminIssueText } from "./getAdminIssueStatusDisplay";

export const filterAdminIssues = ({
  issues,
  search,
  activeFilter,
  consensusFilter,
  stageFilter,
}) => {
  const query = normalizeAdminIssueText(search);
  const list = Array.isArray(issues) ? issues : [];

  return list.filter((issue) => {
    const matchesSearch =
      !query ||
      normalizeAdminIssueText(issue?.name).includes(query) ||
      normalizeAdminIssueText(issue?.description).includes(query) ||
      normalizeAdminIssueText(issue?.model?.name).includes(query) ||
      normalizeAdminIssueText(issue?.owner?.email).includes(query) ||
      normalizeAdminIssueText(issue?.owner?.name).includes(query);

    const matchesActive =
      activeFilter === "all"
        ? true
        : activeFilter === "active"
          ? Boolean(issue?.active)
          : !issue?.active;

    const matchesConsensus =
      consensusFilter === "all"
        ? true
        : consensusFilter === "consensus"
          ? Boolean(issue?.isConsensus)
          : !issue?.isConsensus;

    const matchesStage =
      stageFilter === "all"
        ? true
        : normalizeAdminIssueText(issue?.currentStage) ===
          normalizeAdminIssueText(stageFilter);

    return matchesSearch && matchesActive && matchesConsensus && matchesStage;
  });
};
