import { Alert, Typography } from "@mui/material";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import { SectionCard } from "../../../shared/components/FinishedIssueDialogPrimitives";

const InterpretationPanel = () => (
  <SectionCard title="Interpretation" icon={<AnalyticsIcon fontSize="small" />}>
    <Alert severity="info" variant="outlined"><Typography variant="body2">Results interpretation is not available yet. Natural-language explanation will appear here when analysis generation is enabled.</Typography></Alert>
  </SectionCard>
);

export default InterpretationPanel;
