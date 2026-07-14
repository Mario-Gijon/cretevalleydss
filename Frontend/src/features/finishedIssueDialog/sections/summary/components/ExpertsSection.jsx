import { Divider, Stack, Typography } from "@mui/material";

import { Pill, SummaryAccordionRow } from "../../../shared/components/FinishedIssueDialogPrimitives";
import { summaryDividerSx, summaryExpertNameSx, summaryNotAcceptedTitleSx } from "../summary.styles";

const ExpertsSection = ({ experts, expanded, onToggle }) => (
  <SummaryAccordionRow label="Experts" open={expanded} onToggle={onToggle} right={<Pill tone="info">{experts.total}</Pill>}>
    <Stack spacing={1}>
      <Stack spacing={0.5}>
        {experts.participated.map((expert, index) => <Typography key={index} variant="body2" sx={summaryExpertNameSx}>{expert}</Typography>)}
      </Stack>
      {experts.notAccepted.length ? <>
        <Divider sx={summaryDividerSx} />
        <Typography variant="body2" sx={summaryNotAcceptedTitleSx}>Not accepted</Typography>
        <Stack spacing={0.5}>
          {experts.notAccepted.map((expert, index) => <Typography key={index} variant="body2" sx={summaryExpertNameSx}>{expert}</Typography>)}
        </Stack>
      </> : null}
    </Stack>
  </SummaryAccordionRow>
);

export default ExpertsSection;
