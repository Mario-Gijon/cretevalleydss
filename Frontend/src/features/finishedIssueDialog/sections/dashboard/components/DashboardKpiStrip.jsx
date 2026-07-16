import { Box, Stack, Typography } from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";

import { dashboardKpiIconSx, dashboardKpiItemSx, dashboardKpiStripSx } from "../dashboard.styles";

const Metric = ({ index, icon, label, value, detail, tone = "default", onClick }) => (
  <Box component={onClick ? "button" : "div"} type={onClick ? "button" : undefined} onClick={onClick} aria-label={onClick ? `${label}: ${value}` : undefined} sx={dashboardKpiItemSx({ tone, interactive: Boolean(onClick), index })}>
    <Stack direction="row" spacing={1.05} alignItems="center">
      <Box sx={dashboardKpiIconSx(tone)}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: "text.secondary", fontSize: 12.5, fontWeight: 800, lineHeight: 1.25 }}>{label}</Typography>
        <Typography noWrap title={String(value)} sx={{ mt: 0.15, fontSize: { xs: 16, xl: 18 }, lineHeight: 1.2, fontWeight: 950 }}>{value}</Typography>
        {detail ? <Typography noWrap title={detail} sx={{ mt: 0.2, color: "text.secondary", fontSize: 11.5, fontWeight: 650 }}>{detail}</Typography> : null}
      </Box>
    </Stack>
  </Box>
);

const DashboardKpiStrip = ({ kpis = {}, onOpenConsensus }) => {
  const consensus = kpis.consensus || { enabled: false, label: "Disabled" };
  const phase = kpis.phase || { label: "—" };
  const metrics = [
    { key: "winner", icon: <EmojiEventsRoundedIcon fontSize="small" />, label: "Winner", value: kpis.winner?.name || "—", tone: "winner" },
    { key: "score", icon: <InsightsRoundedIcon fontSize="small" />, label: "Top score", value: kpis.winner?.formattedScore || "—" },
    { key: "coverage", icon: <GroupsRoundedIcon fontSize="small" />, label: "Evaluation coverage", value: kpis.evaluationCoverage ? `${kpis.evaluationCoverage.formattedPercentage}` : "—", detail: kpis.evaluationCoverage ? `${kpis.evaluationCoverage.completed}/${kpis.evaluationCoverage.total} completed` : null },
    { key: "consensus", icon: <TimelineRoundedIcon fontSize="small" />, label: "Consensus", value: consensus.label, detail: consensus.enabled ? "Open consensus" : null, tone: consensus.enabled ? "success" : "default", onClick: consensus.enabled ? onOpenConsensus : undefined },
    { key: "phase", icon: <EventAvailableRoundedIcon fontSize="small" />, label: consensus.enabled ? "Round" : "Result phase", value: phase.label || "—" },
  ];
  return <Box sx={dashboardKpiStripSx}>{metrics.map((metric, index) => <Metric key={metric.key} index={index} {...metric} />)}</Box>;
};

export default DashboardKpiStrip;
