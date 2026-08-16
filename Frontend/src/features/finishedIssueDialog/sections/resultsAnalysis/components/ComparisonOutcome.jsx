import { Box } from "@mui/material";

import RankingCorrelationMatrix from "./RankingCorrelationMatrix.jsx";
import RankingMovementChart from "./RankingMovementChart.jsx";
import RankingsByExecution from "./RankingsByExecution.jsx";
import ResultsDevelopmentNotice from "./ResultsDevelopmentNotice.jsx";
import { comparisonOutcomeGridSx } from "../resultsAnalysis.styles.js";

const ComparisonOutcome = ({ data }) => <>
  <Box sx={comparisonOutcomeGridSx}><RankingsByExecution executions={data.comparison.rankings} /><RankingMovementChart movement={data.comparison.movement} /><RankingCorrelationMatrix correlations={data.comparison.correlations} /></Box>
  <ResultsDevelopmentNotice />
</>;

export default ComparisonOutcome;
