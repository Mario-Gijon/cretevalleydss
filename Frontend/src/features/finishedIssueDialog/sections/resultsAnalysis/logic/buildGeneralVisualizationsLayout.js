const FULL_WIDTH_COLUMNS = "minmax(0, 1fr)";

export const buildGeneralVisualizationsLayout = ({
  expertCollectiveAvailable = false,
  issueConsensusEnabled = false,
  consensusAvailable = false,
  alternativeRelationshipsAvailable = false,
  categoryChangesAvailable = false,
}) => {
  const primaryRow = [];
  if (expertCollectiveAvailable) primaryRow.push("expertCollective");

  if (issueConsensusEnabled && consensusAvailable) primaryRow.push("consensus");

  return {
    issueConsensusEnabled,
    primaryRow,
    alternativeRelationshipsBelow: alternativeRelationshipsAvailable,
    categoryChangesBelow: categoryChangesAvailable,
    primaryGridTemplateColumns: FULL_WIDTH_COLUMNS,
  };
};
