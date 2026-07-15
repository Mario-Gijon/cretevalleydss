import { Box, Divider, Stack, Typography } from "@mui/material";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import { dashboardKpiItemSx, dashboardKpiStripSx } from "../dashboard.styles";

const Metric = ({ icon, label, value, detail, onClick, tone = "default" }) => (
  <Box
    component={onClick ? "button" : "div"}
    onClick={onClick}
    type={onClick ? "button" : undefined}
    sx={dashboardKpiItemSx(tone, Boolean(onClick))}
  >
    <Stack direction="row" spacing={0.9} alignItems="center">
      {icon}
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
        {label}
      </Typography>
    </Stack>
    <Typography variant="body1" noWrap sx={{ fontWeight: 950, mt: 0.45 }} title={value}>
      {value}
    </Typography>
    {detail ? <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>{detail}</Typography> : null}
  </Box>
);

const DashboardKpiStrip = ({ kpis = {}, onOpenConsensus }) => {
  const consensus = kpis.consensus || { enabled: false, label: "Disabled" };
  const phase = kpis.phase || { label: "—" };
  const items = [
    <Metric key="winner" icon={<EmojiEventsRoundedIcon fontSize="small" />} label="Winner" value={kpis.winner?.name || "—"} tone="winner" />,
    <Metric key="score" icon={<InsightsRoundedIcon fontSize="small" />} label="Top score" value={kpis.winner?.formattedScore || "—"} />,
    <Metric key="coverage" icon={<GroupsRoundedIcon fontSize="small" />} label="Evaluation coverage" value={kpis.evaluationCoverage ? `${kpis.evaluationCoverage.formattedPercentage} (${kpis.evaluationCoverage.completed}/${kpis.evaluationCoverage.total})` : "—"} />,
    <Metric key="consensus" icon={<TimelineRoundedIcon fontSize="small" />} label="Consensus" value={consensus.label} detail={consensus.enabled ? "View consensus" : null} onClick={consensus.enabled ? onOpenConsensus : undefined} tone={consensus.enabled ? "success" : "default"} />,
    <Metric key="phase" icon={<TimelineRoundedIcon fontSize="small" />} label={consensus.enabled ? "Final round" : "Result phase"} value={phase.label || "—"} />,
  ];

  return <Box sx={dashboardKpiStripSx}>{items.map((item, index) => <Box key={index} sx={{ display: "contents" }}>{item}{index < items.length - 1 ? <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" }, opacity: 0.12 }} /> : null}</Box>)}</Box>;
};

export default DashboardKpiStrip;
