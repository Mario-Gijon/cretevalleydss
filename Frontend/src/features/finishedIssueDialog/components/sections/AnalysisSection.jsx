import AnalyticsIcon from "@mui/icons-material/Analytics";
import { Alert, Typography } from "@mui/material";

import { SectionCard } from "../shared/FinishedIssueDialogPrimitives";

/**
 * Results analysis placeholder.
 *
 * Analysis generation is currently disabled.
 */
const AnalysisSection = () => (
  <SectionCard title="Results Analysis" icon={<AnalyticsIcon fontSize="small" />}>
    <Alert severity="info" variant="outlined">
      <Typography variant="body2">
        Not available yet.
      </Typography>
    </Alert>
  </SectionCard>
);

export default AnalysisSection;