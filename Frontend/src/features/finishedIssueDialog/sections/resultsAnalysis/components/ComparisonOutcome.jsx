import { Alert, Box } from "@mui/material";

import RankingCorrelationMatrix from "./RankingCorrelationMatrix.jsx";
import RankingMovementChart from "./RankingMovementChart.jsx";
import RankingsByExecution from "./RankingsByExecution.jsx";
import ResultsDevelopmentNotice from "./ResultsDevelopmentNotice.jsx";
import { comparisonOutcomeGridSx } from "../resultsAnalysis.styles.js";

const ComparisonOutcome = ({ data }) => <>
  <Alert severity="info" variant="outlined">Scores are shown per execution and are not directly comparable across models.</Alert>
  <Box sx={comparisonOutcomeGridSx}><RankingsByExecution executions={data.comparison.rankings} /><RankingMovementChart movement={data.comparison.movement} /><RankingCorrelationMatrix correlations={data.comparison.correlations} /></Box>
  <ResultsDevelopmentNotice />
</>;

export default ComparisonOutcome;
