import { Stack } from "@mui/material";

import ConsensusEvolutionCard from "./ConsensusEvolutionCard.jsx";
import ExpertCollectiveVisualizationCard from "./ExpertCollectiveVisualizationCard.jsx";
import VisualizationsDevelopmentNotice from "./VisualizationsDevelopmentNotice.jsx";
import { visualizationsGridSx } from "../resultsVisualizations.styles.js";

const VisualizationsPanel = ({
  visualizations,
  scatterPlotRef,
  onResetZoom,
}) => {
  const showConsensus = visualizations?.consensus?.enabled === true;

  return (
    <Stack spacing={1.4}>
      <Stack sx={visualizationsGridSx(showConsensus)}>
        <ExpertCollectiveVisualizationCard
          visualization={visualizations?.expertCollective}
          scatterPlotRef={scatterPlotRef}
          onResetZoom={onResetZoom}
          fullWidth={!showConsensus}
        />

        {showConsensus ? (
          <ConsensusEvolutionCard
            consensus={visualizations.consensus}
          />
        ) : null}
      </Stack>

      <VisualizationsDevelopmentNotice
        consensusEnabled={showConsensus}
      />
    </Stack>
  );
};

export default VisualizationsPanel;
