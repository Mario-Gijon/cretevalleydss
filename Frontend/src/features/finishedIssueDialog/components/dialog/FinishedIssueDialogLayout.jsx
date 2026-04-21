import { Box } from "@mui/material";

import { getFinishedIssueDialogGridAreas } from "../../styles/finishedIssueDialog.styles";
import SummarySection from "../sections/SummarySection";
import RankingSection from "../sections/RankingSection";
import AnalysisSection from "../sections/AnalysisSection";
import ModelsSection from "../sections/ModelsSection";
import GraphsSection from "../sections/GraphsSection";
import RatingsSection from "../sections/RatingsSection";

/**
 * Layout grid del contenido del dialogo de issue finalizado.
 *
 * @param {Object} props Props del layout.
 * @param {boolean} props.isMdUp Indica si se usa layout de escritorio.
 * @returns {JSX.Element}
 */
const FinishedIssueDialogLayout = ({ isMdUp }) => {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: isMdUp ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
        gridTemplateAreas: getFinishedIssueDialogGridAreas(isMdUp),
        alignItems: "stretch",
      }}
    >
      <Box sx={{ gridArea: "summary", minWidth: 0 }}>
        <SummarySection />
      </Box>

      <Box sx={{ gridArea: "ranking", minWidth: 0 }}>
        <RankingSection />
      </Box>

      <Box sx={{ gridArea: "analysis", minWidth: 0 }}>
        <AnalysisSection />
      </Box>

      <Box sx={{ gridArea: "models", minWidth: 0 }}>
        <ModelsSection />
      </Box>

      <Box sx={{ gridArea: "graphs", minWidth: 0 }}>
        <GraphsSection />
      </Box>

      <Box sx={{ gridArea: "ratings", minWidth: 0 }}>
        <RatingsSection />
      </Box>
    </Box>
  );
};

export default FinishedIssueDialogLayout;
