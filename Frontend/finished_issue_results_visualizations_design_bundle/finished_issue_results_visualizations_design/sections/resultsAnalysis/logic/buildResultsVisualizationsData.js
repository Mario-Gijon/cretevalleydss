import { buildConsensusData } from "../../consensus/logic/buildConsensusData.js";
import { normalizePlotsGraphic } from "../../../shared/logic/buildFinishedIssueGraphs.js";

const finiteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const scatterUnavailableReason = (normalized) => {
  if (normalized?.reason) return normalized.reason;
  if (!normalized) return "missing_analytical_projection";
  if (!normalized.isValid) return "invalid_analytical_projection";
  return null;
};

export const buildResultsVisualizationsData = ({ payload, execution }) => {
  const normalizedScatter = normalizePlotsGraphic(
    execution?.standardizedOutput?.plotsGraphic
  );
  const consensus = buildConsensusData(payload);
  const consensusValues = consensus.graph.data.map(finiteNumber);
  const finiteConsensusValues = consensusValues.filter(
    (value) => value !== null
  );

  return {
    expertCollective: {
      available: Boolean(normalizedScatter?.isValid),
      unavailableReason: scatterUnavailableReason(normalizedScatter),
      selectedPhase: execution?.sourcePhase ?? null,
      data: normalizedScatter?.isValid
        ? [
            {
              expertPoints: normalizedScatter.expertPoints,
              collectivePoint: normalizedScatter.collectivePoint,
            },
          ]
        : null,
    },
    consensus: {
      enabled: consensus.enabled === true,
      supported: consensus.supported === true,
      available:
        consensus.enabled === true && finiteConsensusValues.length > 0,
      unavailableReason:
        consensus.enabled !== true
          ? "Consensus is not enabled for this issue."
          : finiteConsensusValues.length === 0
            ? "No finite consensus progression data is available."
            : null,
      threshold: finiteNumber(consensus.threshold),
      finalPhase: consensus.finalPhase,
      finalizationReason: consensus.finalizationReason,
      graph: {
        labels: consensus.graph.labels,
        data: consensusValues,
        threshold: finiteNumber(consensus.threshold),
      },
    },
  };
};

export default buildResultsVisualizationsData;
