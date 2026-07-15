import { Box } from "@mui/material";

import {
  dashboardGridSx,
  dashboardItemSx,
  dashboardRootSx,
} from "../dashboard.styles";

import ConsensusOverviewCard from "./cards/ConsensusOverviewCard";
import EvaluationsOverviewCard from "./cards/EvaluationsOverviewCard";
import IssueOverviewCard from "./cards/IssueOverviewCard";
import ModelsOverviewCard from "./cards/ModelsOverviewCard";
import ResultsAnalysisPreviewCard from "./cards/ResultsAnalysisPreviewCard";

const DashboardView = ({ data, actions }) => {
  const hasConsensus = Boolean(data.consensus);

  return (
    <Box sx={dashboardRootSx}>
      <Box sx={dashboardGridSx(hasConsensus)}>
        <Box sx={dashboardItemSx("results")}>
          <ResultsAnalysisPreviewCard
            resultsAnalysis={data.resultsAnalysis}
            onViewResultsAnalysis={actions.openResultsAnalysis}
          />
        </Box>

        <Box sx={dashboardItemSx("overview")}>
          <IssueOverviewCard
            issue={data.issue}
            onViewMore={actions.openOverview}
          />
        </Box>

        <Box sx={dashboardItemSx("evaluations")}>
          <EvaluationsOverviewCard
            evaluations={data.evaluations}
            onViewEvaluations={actions.openEvaluations}
          />
        </Box>

        {hasConsensus ? (
          <Box sx={dashboardItemSx("consensus")}>
            <ConsensusOverviewCard
              consensus={data.consensus}
              onViewConsensus={actions.openConsensus}
            />
          </Box>
        ) : null}

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