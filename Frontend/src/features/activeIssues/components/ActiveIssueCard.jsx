import { Box, Divider, Grid, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";

import {
  getNextActionMeta,
  resolveActiveIssuesToneColor,
} from "../logic/activeIssuesMeta";
import { computeIssueDeadlineProgress } from "../logic/activeIssueDeadline";
import ActiveIssuesPill from "./ActiveIssuesPill";
import {
  buildIssueWorkflowSteps,
  resolveIssueCurrentStepKey,
} from "../logic/activeIssueWorkflow";
import {
  ISSUES_GRID_CARD_HEIGHT,
  IssuesGridCard,
  getIssueDeadlineColorByProgress,
  issuesGridHideScrollbarSx,
} from "../styles/ActiveIssuesGrid.styles";

const ActiveIssueDeadlineBar = ({ issue }) => {
  const theme = useTheme();

  const hasServerDeadline = issue.ui.deadline.hasDeadline;

  if (!hasServerDeadline) {
    return (
      <Box
        sx={{
          mt: 0.9,
          display: "flex",
          alignItems: "center",
          gap: 0.8,
          color: alpha(theme.palette.common.white, 0.7),
        }}
      >
        <CalendarMonthIcon sx={{ fontSize: 16, opacity: 0.75 }} />
        <Typography variant="caption" sx={{ fontWeight: 950 }}>
          No deadline
        </Typography>
      </Box>
    );
  }

  const data = computeIssueDeadlineProgress(issue);
  const progress = data?.progress ?? 0;
  const daysLeft = data?.daysLeft;
  const label = data?.label || issue.closureDate;
  const barColor = getIssueDeadlineColorByProgress(theme, progress);

  const tooltip =
    typeof daysLeft === "number"
      ? `${label} • ${daysLeft <= 0 ? "Expired" : `${daysLeft} day(s) left`}`
      : String(label);

  return (
    <Tooltip title={tooltip} placement="top" arrow>
      <Box sx={{ mt: 0.9 }}>
        <Stack
          direction="row"
          spacing={0.8}
          sx={{ alignItems: "center", mb: 0.6 }}
        >
          <CalendarMonthIcon
            sx={{ fontSize: 16, color: alpha(theme.palette.common.white, 0.72) }}
          />

          <Typography
            variant="caption"
            sx={{
              fontWeight: 950,
              color: alpha(theme.palette.common.white, 0.82),
            }}
          >
            {label}
          </Typography>

          <Box sx={{ flex: 1 }} />

          {typeof daysLeft === "number" ? (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 950,
                color: alpha(theme.palette.common.white, 0.72),
              }}
            >
              {daysLeft <= 0 ? "Expired" : `${daysLeft}d`}
            </Typography>
          ) : null}
        </Stack>

        <Box
          sx={{
            height: 9,
            borderRadius: 999,
            bgcolor: alpha(theme.palette.common.white, 0.08),
            border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              height: "100%",
              width: `${Math.round(progress * 100)}%`,
              bgcolor: barColor,
              boxShadow: "none",
              transition: "width 220ms ease, background 220ms ease",
            }}
          />
        </Box>
      </Box>
    </Tooltip>
  );
};

const ActiveIssueStageStepper = ({ issue, tone = "info" }) => {
  const theme = useTheme();

  const steps = buildIssueWorkflowSteps(issue);
  const currentKey = resolveIssueCurrentStepKey(issue, steps);

  const doneAll = currentKey === "__done__";
  const currentIndex = doneAll
    ? steps.length - 1
    : Math.max(0, steps.findIndex((step) => step.key === currentKey));

  const accent = resolveActiveIssuesToneColor(tone).dot;
  const lineWidth = "clamp(12px, 1.5vw, 26px)";
  const successDot = alpha(theme.palette.success.main, 0.78);
  const successBorder = alpha(theme.palette.success.main, 0.9);

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignSelf: "flex-start",
        maxWidth: "100%",
        px: 0.2,
        py: 0.65,
        overflowX: "auto",
        overflowY: "hidden",
        ...issuesGridHideScrollbarSx,
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          flexWrap: "nowrap",
          minWidth: "max-content",
        }}
      >
        {steps.map((step, index) => {
          const isDone = doneAll ? true : index < currentIndex;
          const isActive = doneAll ? index === steps.length - 1 : index === currentIndex;
          const tooltip = step.label;

          const dotBackground = isDone
            ? successDot
            : isActive
              ? alpha(accent, 0.75)
              : alpha(theme.palette.common.white, 0.14);

          const dotBorder = isDone
            ? successBorder
            : isActive
              ? alpha(accent, 0.95)
              : alpha(theme.palette.common.white, 0.16);

          const labelColor = isDone
            ? alpha(theme.palette.success.main, 0.9)
            : isActive
              ? accent
              : alpha(theme.palette.common.white, 0.56);

          return (
            <Box
              key={step.key}
              sx={{ display: "inline-flex", alignItems: "flex-start" }}
            >
              <Tooltip title={tooltip} placement="top" arrow>
                <Stack
                  spacing={0.45}
                  sx={{ width: 62, alignItems: "center", minWidth: 0 }}
                >
                  <Box
                    sx={{
                      width: isActive ? 14 : 12,
                      height: isActive ? 14 : 12,
                      borderRadius: 999,
                      bgcolor: dotBackground,
                      border: `1px solid ${dotBorder}`,
                      boxShadow: isActive
                        ? `0 0 0 2px ${alpha(accent, 0.13)}`
                        : "none",
                      transition: "all 160ms ease",
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: labelColor,
                      fontWeight: isActive ? 800 : 650,
                      fontSize: "0.66rem",
                      lineHeight: 1.15,
                      textAlign: "center",
                      whiteSpace: "normal",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {step.label}
                  </Typography>
                </Stack>
              </Tooltip>

              {index !== steps.length - 1 ? (
                <Box
                  sx={{
                    width: lineWidth,
                    height: "1px",
                    mt: 0.75,
                    mx: 0.35,
                    borderRadius: 999,
                    bgcolor: isDone
                      ? alpha(theme.palette.success.main, 0.5)
                      : alpha(theme.palette.common.white, 0.18),
                  }}
                />
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const ActiveIssueFooterMetadata = ({ issue }) => {
  const alternativesCount = Array.isArray(issue?.alternatives)
    ? issue.alternatives.length
    : null;
  const expertsCount = Number.isFinite(issue?.totalExperts)
    ? issue.totalExperts
    : null;

  if (alternativesCount === null && expertsCount === null) return null;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", mt: 0.95, color: "#77848E" }}
    >
      {alternativesCount !== null ? (
        <Stack direction="row" spacing={0.55} sx={{ alignItems: "center" }}>
          <AltRouteIcon sx={{ fontSize: 15 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {alternativesCount} alternatives
          </Typography>
        </Stack>
      ) : null}
      {expertsCount !== null ? (
        <Stack direction="row" spacing={0.55} sx={{ alignItems: "center" }}>
          <GroupsOutlinedIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {expertsCount} experts
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  );
};

/**
 * Card individual del grid de issues.
 *
 * @param {Object} props Props del componente.
 * @param {Object} props.issue Issue a renderizar.
 * @param {Function} props.onOpenIssue Acción al abrir el issue.
 * @returns {JSX.Element}
 */
const ActiveIssueCard = ({ issue, onOpenIssue }) => {
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

          <Stack
            spacing={1.05}
            sx={{ position: "relative", zIndex: 1, minHeight: 0, flex: 1 }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.12,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "normal",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  flex: 1,
                  minWidth: 0,
                }}
                title={issue?.name || ""}
              >
                {issue?.name || "—"}
              </Typography>

              {issue?.isIssueOwner ? (
                <Tooltip title="You are the owner" placement="top" arrow>
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
                fontWeight: 500,
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

            <ActiveIssueStageStepper issue={issue} tone={tone} />

            <Box sx={{ flex: 1 }} />
          </Stack>

          <Box sx={{ position: "relative", zIndex: 1 }}>
            <ActiveIssueFooterMetadata issue={issue} />
            <ActiveIssueDeadlineBar issue={issue} />
          </Box>
        </Box>
      </IssuesGridCard>
    </Grid>
  );
};

export default ActiveIssueCard;
