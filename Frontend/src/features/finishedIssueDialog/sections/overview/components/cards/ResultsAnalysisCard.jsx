import { Stack, Typography } from "@mui/material";
import InsightsIcon from "@mui/icons-material/Insights";

import OverviewCardShell, { MetaText } from "../OverviewCardShell";

const ResultsAnalysisCard = ({ onViewAnalysis }) => (
  <OverviewCardShell title="Results analysis" icon={<InsightsIcon fontSize="small" />} actionLabel="View analysis" onAction={onViewAnalysis}>
    <Stack spacing={0.5}>
      <Typography variant="body2" color="text.secondary">Results analysis is not available yet.</Typography>
      <MetaText>Natural-language interpretation will appear here when analysis generation is enabled.</MetaText>
    </Stack>
  </OverviewCardShell>
);

export default ResultsAnalysisCard;
