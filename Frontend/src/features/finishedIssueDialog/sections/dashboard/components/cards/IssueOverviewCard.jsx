import { Box, Chip, Stack, Typography } from "@mui/material";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";

import DashboardCardShell, { MetaText } from "../DashboardCardShell";
import { dashboardDescriptionSx } from "../../dashboard.styles";

const readableDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

const IssueOverviewCard = ({ overview, onViewMore }) => (
  <DashboardCardShell number="1" title="Overview" subtitle="Finished issue summary" icon={<AssignmentTurnedInIcon fontSize="small" />} actionLabel="View overview" onAction={onViewMore} accent="green">
    <Stack spacing={0.8}>
      <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1.15 }} noWrap title={overview.name}>{overview.name || "—"}</Typography>
      <Typography variant="body2" sx={dashboardDescriptionSx}>{overview.description || "—"}</Typography>
      <Stack spacing={0.38}>
        <MetaText>Owner · {overview.owner || "—"}{overview.ownerEmail ? ` (${overview.ownerEmail})` : ""}</MetaText>
        <MetaText>Base model · {overview.baseModelName || "—"}</MetaText>
        <MetaText>Created · {readableDate(overview.creationDate)}</MetaText>
        <MetaText>Finished · {readableDate(overview.closureDate)}</MetaText>
      </Stack>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.55, pt: 0.15 }}>
        <Chip size="small" label={overview.consensusEnabled ? "Consensus enabled" : "Consensus disabled"} color={overview.consensusEnabled ? "success" : "default"} variant="outlined" />
        <Chip size="small" label={overview.lifecycleStage || "—"} variant="outlined" />
        <Chip size="small" label={`${overview.acceptedParticipantsCount || 0} accepted`} variant="outlined" />
      </Box>
    </Stack>
  </DashboardCardShell>
);

export default IssueOverviewCard;
