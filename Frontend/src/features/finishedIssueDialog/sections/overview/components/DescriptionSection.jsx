import { Typography } from "@mui/material";

import { SummaryAccordionRow } from "../../../shared/components/FinishedIssueDialogPrimitives";
import { overviewDescriptionSx } from "../overview.styles";

const DescriptionSection = ({ description, expanded, onToggle }) => (
  <SummaryAccordionRow label="Description" open={expanded} onToggle={onToggle}>
    <Typography variant="body2" sx={overviewDescriptionSx}>{description || "—"}</Typography>
  </SummaryAccordionRow>
);

export default DescriptionSection;
