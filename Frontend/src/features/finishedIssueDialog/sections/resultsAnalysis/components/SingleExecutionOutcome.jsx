import { Box, Typography } from "@mui/material";

import FinalRankingPanel from "./FinalRankingPanel.jsx";
import ResultsDevelopmentNotice from "./ResultsDevelopmentNotice.jsx";
import ScoreOverviewChart from "./ScoreOverviewChart.jsx";
import { resultsPanelSx, singleOutcomeGridSx } from "../resultsAnalysis.styles.js";

const SingleExecutionOutcome = ({ data }) => {
  if (!data.single?.available) return <Box sx={resultsPanelSx}><Typography color="text.secondary">{data.single?.unavailableReason || "No ranking output is available for this execution."}</Typography></Box>;
  return <><Box sx={singleOutcomeGridSx}><FinalRankingPanel ranking={data.single.ranking} /><ScoreOverviewChart ranking={data.single.ranking} /></Box><ResultsDevelopmentNotice /></>;
};

export default SingleExecutionOutcome;
