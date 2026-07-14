import { Divider, Stack, Typography } from "@mui/material";

import { Pill, SummaryAccordionRow } from "../../../shared/components/FinishedIssueDialogPrimitives";
import { overviewDividerSx, overviewExpertNameSx, overviewNotAcceptedTitleSx } from "../overview.styles";

const ExpertsSection = ({ experts, expanded, onToggle }) => (
  <SummaryAccordionRow label="Experts" open={expanded} onToggle={onToggle} right={<Pill tone="info">{experts.total}</Pill>}>
    <Stack spacing={1}>
      <Stack spacing={0.5}>
        {experts.participated.map((expert, index) => <Typography key={index} variant="body2" sx={overviewExpertNameSx}>{expert}</Typography>)}
      </Stack>
      {experts.notAccepted.length ? <>
        <Divider sx={overviewDividerSx} />
        <Typography variant="body2" sx={overviewNotAcceptedTitleSx}>Not accepted</Typography>
        <Stack spacing={0.5}>
          {experts.notAccepted.map((expert, index) => <Typography key={index} variant="body2" sx={overviewExpertNameSx}>{expert}</Typography>)}
        </Stack>
      </> : null}
    </Stack>
  </SummaryAccordionRow>
);

export default ExpertsSection;
