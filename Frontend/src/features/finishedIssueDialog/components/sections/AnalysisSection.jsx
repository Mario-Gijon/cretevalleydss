import { Typography } from "@mui/material";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import { SectionCard } from "../shared/FinishedIssueDialogPrimitives";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";

/**
 * Seccion Analysis del dialogo de issue finalizado.
 *
 * @returns {JSX.Element}
 */
const AnalysisSection = () => {
  const { analysisSection } = useFinishedIssueDialogContext();
  const { viewIssue } = analysisSection;

  return (
    <SectionCard title="Results analysis" icon={<AnalyticsIcon fontSize="small" />}>
      {!viewIssue?.consensusSection ? (
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
          Section is not available yet
        </Typography>
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 850 }}>
          {viewIssue.consensusSection}
        </Typography>
      )}
    </SectionCard>
  );
};

export default AnalysisSection;
