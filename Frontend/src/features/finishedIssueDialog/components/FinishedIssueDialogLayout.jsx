import { Box } from "@mui/material";

import { getFinishedIssueDialogGridAreas } from "../styles/finishedIssueDialog.styles";
import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import AnalysisSection from "../overview/AnalysisSection";
import RankingSection from "../overview/RankingSection";
import SummarySection from "../overview/SummarySection";
import GraphsSection from "../graphs/GraphsSection";
import ModelSpecificOutputSection from "../models/ModelSpecificOutputSection";
import ModelsSection from "../models/ModelsSection";
import RatingsSection from "../evaluations/RatingsSection";

/**
 * Layout grid del contenido del dialogo de issue finalizado.
 *
 * @param {Object} props Props del layout.
 * @param {boolean} props.isMdUp Indica si se usa layout de escritorio.
 * @returns {JSX.Element}
 */
const FinishedIssueDialogLayout = ({ isMdUp }) => {
  const { modelSpecificOutputSection } = useFinishedIssueDialogContext();
  const hasModelSpecificOutput = Boolean(modelSpecificOutputSection?.hasOutput);
  const rawOutput = modelSpecificOutputSection?.rawOutput ?? null;
  const rawOutputPretty = modelSpecificOutputSection?.rawOutputPretty ?? "";
  const modelExecution = modelSpecificOutputSection?.modelExecution ?? null;

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: isMdUp ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
        gridTemplateAreas: getFinishedIssueDialogGridAreas(
          isMdUp,
          hasModelSpecificOutput
        ),
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

      {hasModelSpecificOutput ? (
        <Box sx={{ gridArea: "modelSpecificOutput", minWidth: 0 }}>
          <ModelSpecificOutputSection
            rawOutput={rawOutput}
            rawOutputPretty={rawOutputPretty}
            modelExecution={modelExecution}
          />
        </Box>
      ) : null}

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
