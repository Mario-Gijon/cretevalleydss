import { Box } from "@mui/material";

import {
  dashboardGridSx,
  dashboardItemSx,
  dashboardRootSx,
} from "../dashboard.styles";

import DashboardKpiStrip from "./DashboardKpiStrip";
import EvaluationsOverviewCard from "./cards/EvaluationsOverviewCard";
import IssueOverviewCard from "./cards/IssueOverviewCard";
import ModelsOverviewCard from "./cards/ModelsOverviewCard";
import ResultsAnalysisPreviewCard from "./cards/ResultsAnalysisPreviewCard";

const DashboardView = ({ data, actions }) => {
  return (
    <Box sx={dashboardRootSx}>
      <DashboardKpiStrip kpis={data.kpis} onOpenConsensus={actions.openConsensus} />
      <Box sx={dashboardGridSx}>
        <Box sx={dashboardItemSx("overview")}>
          <IssueOverviewCard
            overview={data.overview}
            onViewMore={actions.openOverview}
          />
        </Box>
        <Box sx={dashboardItemSx("results")}>
          <ResultsAnalysisPreviewCard resultsAnalysis={data.resultsAnalysis} onViewResultsAnalysis={actions.openResultsAnalysis} />
        </Box>

        <Box sx={dashboardItemSx("evaluations")}>
          <EvaluationsOverviewCard
            evaluations={data.evaluations}
            onViewEvaluations={actions.openEvaluations}
          />
        </Box>

        <Box sx={dashboardItemSx("models")}>
          <ModelsOverviewCard
            models={data.models}
            onViewModels={actions.openModels}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardView;
