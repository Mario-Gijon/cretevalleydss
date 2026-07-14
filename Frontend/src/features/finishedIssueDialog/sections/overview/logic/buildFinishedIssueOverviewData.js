const asArray = (value) => (Array.isArray(value) ? value : []);
const text = (value) => (typeof value === "string" ? value : "");

export const buildFinishedIssueOverviewData = ({ viewIssue, selectedModelName, reachedPhaseLabel }) => {
  const summary = viewIssue?.summary || {};
  const alternatives = asArray(summary.alternatives).map((alternative, index) => ({
    id: alternative?.id || alternative?._id || `alternative-${index}`,
    name: typeof alternative === "string" ? alternative : text(alternative?.name) || "—",
    description: text(alternative?.description),
  }));
  const consensusInfo = summary.consensusInfo;

  return {
    general: {
      name: text(summary.name),
      owner: text(summary.owner),
      model: selectedModelName || "—",
      creationDate: summary.creationDate ?? null,
      closureDate: summary.closureDate ?? null,
    },
    description: text(summary.description),
    criteria: asArray(summary.criteria),
    alternatives,
    experts: {
      total: asArray(summary.experts?.participated).length + asArray(summary.experts?.notAccepted).length,
      participated: asArray(summary.experts?.participated),
      notAccepted: asArray(summary.experts?.notAccepted),
    },
    consensus: consensusInfo ? {
      threshold: consensusInfo.threshold ?? null,
      maxPhases: consensusInfo.maxPhases ?? null,
      reachedPhaseLabel: reachedPhaseLabel || "—",
      finalizationReason: consensusInfo.finalizationReason ?? null,
      finalMeasure: consensusInfo.finalConsensusMeasure ?? null,
    } : null,
  };
};
