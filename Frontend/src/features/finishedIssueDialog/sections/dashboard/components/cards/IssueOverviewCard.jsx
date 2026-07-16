import { Box, Stack, Typography } from "@mui/material";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";

import { dashboardDescriptionSx, dashboardInfoIconSx, dashboardInfoRowSx } from "../../dashboard.styles";
import DashboardInnerPanel from "../DashboardInnerPanel";
import DashboardPreviewCard from "../DashboardPreviewCard";

const readableDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const InfoRow = ({ icon, label, value, secondary, tone }) => (
  <Box sx={dashboardInfoRowSx}>
    <Box sx={dashboardInfoIconSx(tone)}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ color: "text.secondary", fontSize: 11.5, fontWeight: 750, lineHeight: 1.2 }}>{label}</Typography>
      <Typography noWrap title={String(value)} sx={{ mt: 0.2, fontSize: 13.5, fontWeight: 900, lineHeight: 1.25 }}>{value}</Typography>
      {secondary ? <Typography noWrap title={secondary} sx={{ mt: 0.15, color: "text.secondary", fontSize: 11.5, fontWeight: 600 }}>{secondary}</Typography> : null}
    </Box>
  </Box>
);

const StatusCell = ({ label, value, tone = "cyan" }) => (
  <Box sx={{ minWidth: 0, px: 1, py: 0.85 }}>
    <Typography sx={{ color: "text.secondary", fontSize: 11.5, fontWeight: 700 }}>{label}</Typography>
    <Typography noWrap title={String(value)} sx={{ mt: 0.2, color: tone === "green" ? "success.light" : "secondary.light", fontSize: 13, fontWeight: 900 }}>{value}</Typography>
  </Box>
);

const IssueOverviewCard = ({ overview, onViewMore }) => (
  <DashboardPreviewCard number="1" title="Overview" subtitle="Finished issue summary" actionLabel="View overview" onAction={onViewMore} accent="green">
    <Stack spacing={1.15}>
      <Box>
        <Typography component="h3" noWrap title={overview.name} sx={{ fontSize: { xs: 20, xl: 22 }, fontWeight: 950, lineHeight: 1.15 }}>{overview.name || "—"}</Typography>
        <Typography sx={{ ...dashboardDescriptionSx, mt: 0.65 }}>{overview.description || "—"}</Typography>
      </Box>
      <Stack spacing={0.7}>
        <InfoRow icon={<AccountCircleRoundedIcon fontSize="small" />} label="Owner" value={overview.owner || "—"} secondary={overview.ownerEmail || null} />
        <InfoRow icon={<LayersRoundedIcon fontSize="small" />} label="Base model" value={overview.baseModelName || "—"} />
        <InfoRow icon={<CalendarMonthRoundedIcon fontSize="small" />} label="Created" value={readableDate(overview.creationDate)} />
        <InfoRow icon={<CheckCircleRoundedIcon fontSize="small" />} label="Finished" value={readableDate(overview.closureDate)} tone="green" />
      </Stack>
      <DashboardInnerPanel sx={{ p: 0 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", "& > *:not(:last-child)": { borderRight: "1px solid rgba(255,255,255,0.075)" } }}>
          <StatusCell label="Consensus" value={overview.consensusEnabled ? "Enabled" : "Disabled"} tone={overview.consensusEnabled ? "green" : "cyan"} />
          <StatusCell label="Stage" value={overview.lifecycleStage || "—"} tone="green" />
          <StatusCell label="Participants" value={`${overview.acceptedParticipantsCount || 0} accepted`} />
        </Box>
      </DashboardInnerPanel>
    </Stack>
  </DashboardPreviewCard>
);

export default IssueOverviewCard;
