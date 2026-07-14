import { Box, Stack, Typography } from "@mui/material";
import QueryStatsIcon from "@mui/icons-material/QueryStats";

import { AnalyticalScatterChart } from "../../../../graphs/components/AnalyticalScatterChart";
import { AnalyticalConsensusLineChart } from "../../../../graphs/components/AnalyticalConsensusLineChart";
import OverviewCardShell from "../OverviewCardShell";
import { overviewGraphPreviewSx } from "../../overview.styles";

const AnalyticalGraphsOverviewCard = ({ graphs, onViewGraphs }) => (
  <OverviewCardShell title="Analytical graphs" icon={<QueryStatsIcon fontSize="small" />} actionLabel="View all graphs" onAction={onViewGraphs}>
    <Stack spacing={0.5}>
      {graphs.hasPerformanceMap && graphs.performanceMapData ? (
        <Box sx={overviewGraphPreviewSx}><AnalyticalScatterChart data={graphs.performanceMapData} phase={graphs.performanceMapData.length === 1 ? 0 : graphs.selectedPhaseIndex} compact /></Box>
      ) : null}
      {!graphs.hasPerformanceMap && graphs.hasConsensusEvolution && graphs.consensusEvolutionData ? (
        <Box sx={overviewGraphPreviewSx}><AnalyticalConsensusLineChart data={graphs.consensusEvolutionData} compact /></Box>
      ) : null}
      {graphs.hasPerformanceMap ? <Typography variant="body2">Performance map available</Typography> : null}
      {graphs.hasConsensusEvolution ? <Typography variant="body2">Consensus evolution available</Typography> : null}
      {!graphs.hasPerformanceMap && !graphs.hasConsensusEvolution ? <Typography variant="body2" color="text.secondary">No analytical graph data available.</Typography> : null}
    </Stack>
  </OverviewCardShell>
);

export default AnalyticalGraphsOverviewCard;
