import { Box, Stack, Typography } from "@mui/material";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";

import { dashboardBoundedListSx, dashboardDescriptionSx } from "../../dashboard.styles";
import DashboardInnerPanel from "../DashboardInnerPanel";
import DashboardPreviewCard from "../DashboardPreviewCard";

const readableDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const MetadataRow = ({ icon, label, value }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "18px minmax(78px, max-content) minmax(0, 1fr)", gap: 0.7, alignItems: "center", minWidth: 0 }}>
    <Box data-testid="overview-metadata-icon" sx={{ color: "secondary.light", display: "grid", placeItems: "center" }}>{icon}</Box>
    <Typography variant="caption" sx={{ color: "text.secondary" }}>{label}</Typography>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap title={String(value)} sx={{ color: "text.primary", fontWeight: "fontWeightBold" }}>{value}</Typography>
    </Box>
  </Box>
);

const OverviewList = ({ title, items = [] }) => (
  <DashboardInnerPanel sx={{ minWidth: 0, p: 1 }}>
    <Typography variant="subtitle2" sx={{ mb: 0.6, color: "text.secondary" }}>{title}</Typography>
    <Stack spacing={0.45} sx={dashboardBoundedListSx}>
      {items.map((item, index) => <Typography variant="body2" noWrap key={item.id || index} title={item.name} sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.35 }}>{item.name}</Typography>)}
      {!items.length ? <Typography variant="body2" color="text.secondary">None available.</Typography> : null}
    </Stack>
  </DashboardInnerPanel>
);

const IssueOverviewCard = ({ overview, onViewMore }) => (
  <DashboardPreviewCard icon={<InfoOutlinedIcon fontSize="small" />} title="Overview" actionLabel="View overview" onAction={onViewMore}>
    <Stack spacing={0.75}>
      <Box>
        <Typography variant="h5" component="h3" noWrap title={overview.name}>{overview.name || "—"}</Typography>
        <Typography variant="body2" sx={{ ...dashboardDescriptionSx, mt: 0.5 }}>{overview.description || "—"}</Typography>
      </Box>
      <DashboardInnerPanel>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: { xs: 0.65, sm: 1.2 } }}>
          <Stack spacing={0.55}>
            <MetadataRow icon={<AccountCircleRoundedIcon sx={{ fontSize: 16 }} />} label="Owner" value={overview.owner || overview.ownerEmail || "—"} />
            <MetadataRow icon={<LayersRoundedIcon sx={{ fontSize: 16 }} />} label="Base model" value={overview.baseModelName || "—"} />
            <MetadataRow icon={<CalendarMonthRoundedIcon sx={{ fontSize: 16 }} />} label="Created" value={readableDate(overview.creationDate)} />
            <MetadataRow icon={<EventAvailableRoundedIcon sx={{ fontSize: 16 }} />} label="Finished" value={readableDate(overview.closureDate)} />
          </Stack>
          <Stack spacing={0.55}>
            <MetadataRow icon={<TimelineRoundedIcon sx={{ fontSize: 16 }} />} label="Consensus" value={overview.consensusEnabled ? "Enabled" : "Disabled"} />
            <MetadataRow icon={<FlagRoundedIcon sx={{ fontSize: 16 }} />} label="Stage" value={overview.lifecycleStage || "—"} />
            <MetadataRow icon={<GroupsRoundedIcon sx={{ fontSize: 16 }} />} label="Participants" value={overview.participantSummaryLabel || `${overview.acceptedParticipantsCount || 0} participated`} />
          </Stack>
        </Box>
      </DashboardInnerPanel>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 0.75 }}>
        <OverviewList title="Alternatives" items={overview.alternatives} />
        <OverviewList title="Leaf criteria" items={overview.leafCriteria} />
      </Box>
    </Stack>
  </DashboardPreviewCard>
);

export default IssueOverviewCard;
