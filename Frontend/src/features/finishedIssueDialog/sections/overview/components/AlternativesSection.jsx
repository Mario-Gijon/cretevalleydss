import { Stack, Typography } from "@mui/material";

import { SummaryAccordionRow } from "../../../shared/components/FinishedIssueDialogPrimitives";

const AlternativesSection = ({ alternatives, expanded, onToggle }) => (
  <SummaryAccordionRow label="Alternatives" open={expanded} onToggle={onToggle}>
    <Stack spacing={0.5}>
      {alternatives.map((alternative, index) => (
        <Stack key={alternative.id || index} spacing={0.1}>
          <Typography variant="body2" sx={{ fontWeight: 850 }}>{alternative.name}</Typography>
          {alternative.description ? <Typography variant="caption" color="text.secondary">{alternative.description}</Typography> : null}
        </Stack>
      ))}
    </Stack>
  </SummaryAccordionRow>
);

export default AlternativesSection;
