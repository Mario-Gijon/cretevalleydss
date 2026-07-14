import { Box } from "@mui/material";

import { dashboardGridSx, dashboardRootSx } from "../dashboard.styles";
import ConsensusOverviewCard from "./cards/ConsensusOverviewCard";
import EvaluationsOverviewCard from "./cards/EvaluationsOverviewCard";
import IssueOverviewCard from "./cards/IssueOverviewCard";
import ModelsOverviewCard from "./cards/ModelsOverviewCard";
import ResultsAnalysisPreviewCard from "./cards/ResultsAnalysisPreviewCard";

const DashboardView = ({ data, actions }) => (
  <Box sx={dashboardRootSx}>
    <Box sx={dashboardGridSx}>
      <IssueOverviewCard issue={data.issue} onViewMore={actions.openOverview} />
      <ModelsOverviewCard models={data.models} onViewModels={actions.openModels} />
      <ResultsAnalysisPreviewCard resultsAnalysis={data.resultsAnalysis} onViewResultsAnalysis={actions.openResultsAnalysis} />
      <EvaluationsOverviewCard evaluations={data.evaluations} onViewEvaluations={actions.openEvaluations} />
      {data.consensus ? <ConsensusOverviewCard consensus={data.consensus} onViewConsensus={actions.openConsensus} /> : null}
    </Box>
  </Box>
);

export default DashboardView;
