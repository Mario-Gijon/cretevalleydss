import { Box } from "@mui/material";

import { dashboardFirstRowSx, dashboardItemSx, dashboardRootSx, dashboardSecondRowSx } from "../dashboard.styles";
import DashboardKpiStrip from "./DashboardKpiStrip";
import EvaluationsOverviewCard from "./cards/EvaluationsOverviewCard";
import IssueOverviewCard from "./cards/IssueOverviewCard";
import ModelsOverviewCard from "./cards/ModelsOverviewCard";
import ResultsAnalysisPreviewCard from "./cards/ResultsAnalysisPreviewCard";

const DashboardView = ({ data, actions }) => (
  <Box sx={dashboardRootSx}>
    <DashboardKpiStrip kpis={data.kpis} onOpenConsensus={actions.openConsensus} />
    <Box sx={dashboardFirstRowSx}>
      <Box sx={dashboardItemSx}><IssueOverviewCard overview={data.overview} onViewMore={actions.openOverview} /></Box>
      <Box sx={dashboardItemSx}><ModelsOverviewCard models={data.models} onViewModels={actions.openModels} /></Box>
    </Box>
    <Box sx={dashboardSecondRowSx}>
      <Box sx={dashboardItemSx}><ResultsAnalysisPreviewCard resultsAnalysis={data.resultsAnalysis} onViewResultsAnalysis={actions.openResultsAnalysis} /></Box>
      <Box sx={dashboardItemSx}><EvaluationsOverviewCard evaluations={data.evaluations} onViewEvaluations={actions.openEvaluations} /></Box>
    </Box>
  </Box>
);

export default DashboardView;
