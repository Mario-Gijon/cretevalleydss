import { Avatar, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import {
  getAdminIssueDetailCardSx,
  getAdminIssueToneColor,
} from "../styles/adminIssues.styles";

/**
 * Tarjeta compacta de metrica para la seccion de admin issues.
 *
 * @param {object} props
 * @param {*} props.icon
 * @param {string} props.label
 * @param {*} props.value
 * @param {string} [props.tone]
 * @returns {JSX.Element}
 */
const AdminIssuesStatCard = ({ icon, label, value, tone = "info" }) => {
  const theme = useTheme();
  const color = getAdminIssueToneColor(theme, tone);

  return (
    <Paper
      elevation={0}
      sx={{
        ...getAdminIssueDetailCardSx(theme),
        p: 1.1,
        minWidth: 0,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Avatar
          sx={{
            width: 38,
            height: 38,
            bgcolor: alpha(color, 0.12),
            color,
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          {icon}
        </Avatar>

        <Stack spacing={0.1} sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
            {label}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 980,
              lineHeight: 1.05,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default AdminIssuesStatCard;
