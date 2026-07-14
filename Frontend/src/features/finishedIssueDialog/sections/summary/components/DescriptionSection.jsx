import { Typography } from "@mui/material";

import { SummaryAccordionRow } from "../../../shared/components/FinishedIssueDialogPrimitives";
import { summaryDescriptionSx } from "../summary.styles";

const DescriptionSection = ({ description, expanded, onToggle }) => (
  <SummaryAccordionRow label="Description" open={expanded} onToggle={onToggle}>
    <Typography variant="body2" sx={summaryDescriptionSx}>{description || "—"}</Typography>
  </SummaryAccordionRow>
);

export default DescriptionSection;
