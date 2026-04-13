import { Box, Divider, Grid, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import {
  getNextActionMeta,
  resolveActiveIssuesToneColor,
} from "../../../utils/activeIssues.meta";
import ActiveIssuesPill from "../../shared/ActiveIssuesPill";
import IssueDeadlineBar from "./IssueDeadlineBar";
import IssueStageStepper from "./IssueStageStepper";
import {
  ISSUES_GRID_CARD_HEIGHT,
  IssuesGridCard,
} from "./styles/issuesGrid.styles";

/**
 * Card individual del grid de issues.
 *
 * @param {Object} props Props del componente.
 * @param {Object} props.issue Issue a renderizar.
 * @param {Function} props.onOpenIssue Acción al abrir el issue.
 * @returns {JSX.Element}
 */
const IssueCard = ({ issue, onOpenIssue }) => {
  const theme = useTheme();

  const meta = getNextActionMeta(issue);
  const tone = meta?.tone || "info";
  const accent = alpha(resolveActiveIssuesToneColor(tone).dot, 0.9);

  return (
    <Grid item xs={12} md={6} xl={4} key={issue.id}>
      <IssuesGridCard elevation={0} sx={{ height: ISSUES_GRID_CARD_HEIGHT }}>
        <Box
          onClick={() => onOpenIssue?.(issue)}
          sx={{
            cursor: "pointer",
            height: "100%",
            position: "relative",
            overflow: "hidden",
            p: 2,
            pl: 2.35,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              bgcolor: accent,
            }}
          />

          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `
                radial-gradient(560px 240px at 0% 0%, ${alpha(accent, 0.14)}, transparent 52%),
                radial-gradient(520px 220px at 0% 0%, ${alpha(theme.palette.secondary.main, 0.05)}, transparent 58%)
              `,
            }}
          />

          <Stack
            spacing={1.05}
            sx={{ position: "relative", zIndex: 1, minHeight: 0, flex: 1 }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 980,
                  lineHeight: 1.12,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
                title={issue?.name || ""}
              >
                {issue?.name || "—"}
              </Typography>

              {issue?.isAdmin ? (
                <Tooltip title="You are the admin" placement="top" arrow>
                  <Box
                    sx={{
                      mt: 0.25,
                      color: alpha(theme.palette.common.white, 0.78),
                      bgcolor: alpha(theme.palette.common.white, 0.06),
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 2,
                      p: 0.55,
                      lineHeight: 0,
                    }}
                  >
                    <AdminPanelSettingsIcon sx={{ fontSize: 18 }} />
                  </Box>
                </Tooltip>
              ) : null}
            </Stack>

            <Typography
              variant="body2"
              sx={{
                color: alpha(theme.palette.common.white, 0.72),
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
                minHeight: 42,
                fontWeight: 850,
              }}
            >
              {issue?.description || "—"}
            </Typography>

            <Box sx={{ mt: 0.2 }}>
              <ActiveIssuesPill tone={tone}>{meta?.title || "—"}</ActiveIssuesPill>
            </Box>

            <Divider
              sx={{
                opacity: 0.14,
                my: 0.7,
                borderColor: alpha("#fff", 0.12),
              }}
            />

            <IssueStageStepper issue={issue} tone={tone} />

            <Box sx={{ flex: 1 }} />
          </Stack>

          <Box sx={{ position: "relative", zIndex: 1 }}>
            <IssueDeadlineBar issue={issue} />
          </Box>
        </Box>
      </IssuesGridCard>
    </Grid>
  );
};

export default IssueCard;