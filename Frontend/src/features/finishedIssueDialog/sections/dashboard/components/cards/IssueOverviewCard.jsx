import { Stack, Typography } from "@mui/material";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

import DashboardCardShell, { MetaText } from "../DashboardCardShell";
import { dashboardDescriptionSx } from "../../dashboard.styles";

const IssueOverviewCard = ({ issue, onViewMore }) => (
  <DashboardCardShell title="Overview" icon={<AssignmentTurnedInIcon fontSize="small" />} actionLabel="View more" onAction={onViewMore}>
    <Stack spacing={0.8}>
      <Typography variant="body2" sx={dashboardDescriptionSx}>{issue.description || "—"}</Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <MetaText>Created: {issue.creationDate || "—"}</MetaText>
        {issue.closureDate ? <MetaText>Closed: {issue.closureDate}</MetaText> : null}
      </Stack>
      <MetaText>{issue.alternativesCount} alternatives · {issue.criteriaCount} criteria · {issue.participatingExpertsCount} participating experts</MetaText>
    </Stack>
  </DashboardCardShell>
);

export default IssueOverviewCard;
