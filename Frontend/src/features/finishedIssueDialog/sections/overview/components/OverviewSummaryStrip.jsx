import { Box, Typography } from "@mui/material";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

import {
  overviewSummaryIconSx,
  overviewSummaryItemSx,
  overviewSummaryStripSx,
} from "../overview.styles";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
};

const SummaryItem = ({ index, icon, label, value, tone }) => (
  <Box sx={overviewSummaryItemSx(index)}>
    <Box sx={overviewSummaryIconSx(tone)}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          color: "text.secondary",
          fontSize: 11.5,
          lineHeight: 1.2,
          fontWeight: 750,
        }}
      >
        {label}
      </Typography>
      <Typography
        noWrap
        title={String(value)}
        sx={{
          mt: 0.2,
          fontSize: { xs: 14, xl: 15.5 },
          lineHeight: 1.2,
          fontWeight: 950,
        }}
      >
        {value}
      </Typography>
    </Box>
  </Box>
);

const OverviewSummaryStrip = ({ summary }) => {
  const items = [
    {
      icon: <AccountCircleRoundedIcon fontSize="small" />,
      label: "Owner",
      value: summary.owner || "—",
    },
    {
      icon: <LayersRoundedIcon fontSize="small" />,
      label: "Base model",
      value: summary.model || "—",
    },
    {
      icon: <CalendarMonthRoundedIcon fontSize="small" />,
      label: "Created",
      value: formatDate(summary.createdAt),
    },
    {
      icon: <PlayCircleOutlineRoundedIcon fontSize="small" />,
      label: "Execution",
      value: summary.execution || "Base",
    },
    {
      icon: <GroupsRoundedIcon fontSize="small" />,
      label: "Participants accepted",
      value: summary.acceptedParticipants ?? "—",
    },
    {
      icon: <ShieldOutlinedIcon fontSize="small" />,
      label: "Consensus",
      value: summary.consensusEnabled ? "Enabled" : "Disabled",
      tone: summary.consensusEnabled ? "green" : "cyan",
    },
  ];

  return (
    <Box sx={overviewSummaryStripSx}>
      {items.map((item, index) => (
        <SummaryItem
          key={item.label}
          index={index}
          {...item}
        />
      ))}
    </Box>
  );
};

export default OverviewSummaryStrip;
