import { Box } from "@mui/material";

import { overviewGridSx, overviewRootSx } from "../overview.styles";
import AnalyticalGraphsOverviewCard from "./cards/AnalyticalGraphsOverviewCard";
import ConsensusOverviewCard from "./cards/ConsensusOverviewCard";
import EvaluationsOverviewCard from "./cards/EvaluationsOverviewCard";
import IssueOverviewCard from "./cards/IssueOverviewCard";
import ModelsOverviewCard from "./cards/ModelsOverviewCard";
import ResultsAnalysisCard from "./cards/ResultsAnalysisCard";
import ResultsSummaryCard from "./cards/ResultsSummaryCard";

const OverviewView = ({ data, actions }) => (
  <Box sx={overviewRootSx}>
    <Box sx={overviewGridSx}>
      <IssueOverviewCard issue={data.issue} onViewMore={actions.openIssueDetails} />
      <ModelsOverviewCard models={data.models} onViewModels={actions.openModels} />
      <ResultsSummaryCard results={data.results} onViewResults={actions.openResults} />
      <ResultsAnalysisCard onViewAnalysis={actions.openAnalysis} />
      <EvaluationsOverviewCard evaluations={data.evaluations} onViewEvaluations={actions.openEvaluations} />
      {data.consensus ? <ConsensusOverviewCard consensus={data.consensus} onViewConsensus={actions.openConsensus} /> : null}
      <AnalyticalGraphsOverviewCard graphs={data.graphs} onViewGraphs={actions.openGraphs} />
    </Box>
  </Box>
);

export default OverviewView;
