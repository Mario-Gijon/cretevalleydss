import { Box, Stack, Typography } from "@mui/material";

import { dashboardBoundedListSx, dashboardDescriptionSx } from "../../dashboard.styles";
import DashboardInnerPanel from "../DashboardInnerPanel";
import DashboardPreviewCard from "../DashboardPreviewCard";

const readableDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const MetadataRow = ({ label, value, tone = "default" }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "minmax(78px, max-content) minmax(0, 1fr)", gap: 0.75, alignItems: "baseline", minWidth: 0 }}>
    <Typography sx={{ color: "text.secondary", fontSize: 11.5, fontWeight: 750, lineHeight: 1.3 }}>{label}</Typography>
    <Box sx={{ minWidth: 0 }}>
      <Typography noWrap title={String(value)} sx={{ color: tone === "green" ? "success.light" : tone === "cyan" ? "secondary.light" : "text.primary", fontSize: 12.5, fontWeight: 850, lineHeight: 1.3 }}>{value}</Typography>
    </Box>
  </Box>
);

const OverviewList = ({ title, items = [] }) => (
  <DashboardInnerPanel sx={{ minWidth: 0, p: 1 }}>
    <Typography sx={{ mb: 0.6, color: "text.secondary", fontSize: 12, fontWeight: 900 }}>{title}</Typography>
    <Stack spacing={0.45} sx={dashboardBoundedListSx}>
      {items.map((item, index) => <Typography key={item.id || index} title={item.name} sx={{ minWidth: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 12, lineHeight: 1.35, fontWeight: 650 }}>{item.name}</Typography>)}
      {!items.length ? <Typography color="text.secondary" sx={{ fontSize: 12 }}>None available.</Typography> : null}
    </Stack>
  </DashboardInnerPanel>
);

const IssueOverviewCard = ({ overview, onViewMore }) => (
  <DashboardPreviewCard number="1" title="Overview" subtitle="Finished issue summary" actionLabel="View overview" onAction={onViewMore} accent="green">
    <Stack spacing={1.15}>
      <Box>
        <Typography component="h3" noWrap title={overview.name} sx={{ fontSize: { xs: 20, xl: 22 }, fontWeight: 950, lineHeight: 1.15 }}>{overview.name || "—"}</Typography>
        <Typography sx={{ ...dashboardDescriptionSx, mt: 0.65 }}>{overview.description || "—"}</Typography>
      </Box>
      <DashboardInnerPanel>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: { xs: 0.65, sm: 1.2 } }}>
          <Stack spacing={0.6}>
            <MetadataRow label="Owner" value={overview.owner || overview.ownerEmail || "—"} />
            <MetadataRow label="Base model" value={overview.baseModelName || "—"} tone="cyan" />
            <MetadataRow label="Created" value={readableDate(overview.creationDate)} />
            <MetadataRow label="Finished" value={readableDate(overview.closureDate)} tone="green" />
          </Stack>
          <Stack spacing={0.6}>
            <MetadataRow label="Consensus" value={overview.consensusEnabled ? "Enabled" : "Disabled"} tone={overview.consensusEnabled ? "green" : "cyan"} />
            <MetadataRow label="Stage" value={overview.lifecycleStage || "—"} tone="green" />
            <MetadataRow label="Participants" value={`${overview.acceptedParticipantsCount || 0} accepted`} />
          </Stack>
        </Box>
      </DashboardInnerPanel>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1 }}>
        <OverviewList title="Alternatives" items={overview.alternatives} />
        <OverviewList title="Leaf criteria" items={overview.leafCriteria} />
      </Box>
    </Stack>
  </DashboardPreviewCard>
);

export default IssueOverviewCard;
