const FULL_WIDTH_COLUMNS = "minmax(0, 1fr)";
const NON_CONSENSUS_COLUMNS = "minmax(420px, 1fr) minmax(540px, 1fr)";
const CONSENSUS_COLUMNS = "minmax(420px, 1.35fr) minmax(300px, 0.85fr)";

export const buildGeneralVisualizationsLayout = ({
  expertCollectiveAvailable = false,
  issueConsensusEnabled = false,
  consensusAvailable = false,
  alternativeRelationshipsAvailable = false,
}) => {
  const primaryRow = [];
  if (expertCollectiveAvailable) primaryRow.push("expertCollective");

  if (issueConsensusEnabled) {
    if (consensusAvailable) primaryRow.push("consensus");
  } else if (alternativeRelationshipsAvailable) {
    primaryRow.push("alternativeRelationships");
  }

  const twoColumnTemplate = issueConsensusEnabled
    ? CONSENSUS_COLUMNS
    : NON_CONSENSUS_COLUMNS;

  return {
    issueConsensusEnabled,
    primaryRow,
    alternativeRelationshipsBelow:
      issueConsensusEnabled && alternativeRelationshipsAvailable,
    primaryGridTemplateColumns:
      primaryRow.length > 1
        ? { xs: FULL_WIDTH_COLUMNS, lg: twoColumnTemplate }
        : FULL_WIDTH_COLUMNS,
  };
};

