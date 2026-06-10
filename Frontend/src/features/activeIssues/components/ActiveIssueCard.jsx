import { Box, Divider, Grid, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

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

  const hasServerDeadline = Boolean(issue?.ui?.deadline?.hasDeadline);
  const hasLegacyDeadline = Boolean(issue?.closureDate);

  if (!hasServerDeadline && !hasLegacyDeadline) {
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
  const label = data?.label || issue?.closureDate || "—";
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
              boxShadow: `0 0 18px ${alpha(barColor, 0.25)}`,
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
  const lineWidth = "clamp(18px, 2.4vw, 34px)";
  const lineHeight = 4;
  const currentLabel = doneAll ? "Finished" : steps[currentIndex]?.label;
  const successDot = alpha(theme.palette.success.main, 0.78);
  const successBorder = alpha(theme.palette.success.main, 0.9);

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignSelf: "flex-start",
        maxWidth: "100%",
        px: 1,
        py: 0.85,
        borderRadius: 3,
        bgcolor: alpha(accent, 0.08),
        border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
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
          whiteSpace: "nowrap",
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

          const dotShadow = isActive
            ? `0 0 0 4px ${alpha(accent, 0.16)}`
            : "none";

          return (
            <Box
              key={step.key}
              sx={{ display: "inline-flex", alignItems: "center" }}
            >
              <Tooltip title={tooltip} placement="top" arrow>
                {isActive ? (
                  <Box
                    sx={{
                      height: 28,
                      px: 1.15,
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.85,
                      bgcolor: alpha(accent, 0.18),
                      border: `1px solid ${alpha(accent, 0.55)}`,
                      boxShadow: dotShadow,
                      transition: "all 160ms ease",
                      maxWidth: 260,
                    }}
                  >
                    <Box
                      sx={{
                        width: 11,
                        height: 11,
                        borderRadius: 999,
                        bgcolor: alpha(accent, 0.9),
                        border: `1px solid ${alpha(theme.palette.common.white, 0.16)}`,
                        flex: "0 0 auto",
                      }}
                    />

                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 980,
                        color: alpha(theme.palette.common.white, 0.92),
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 200,
                      }}
                      title={currentLabel}
                    >
                      {currentLabel}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: isDone ? 12 : 11,
                      height: isDone ? 12 : 11,
                      borderRadius: 999,
                      bgcolor: dotBackground,
                      border: `1px solid ${dotBorder}`,
                      transition: "all 160ms ease",
                    }}
                  />
                )}
              </Tooltip>

              {index !== steps.length - 1 ? (
                <Box
                  sx={{
                    width: lineWidth,
                    height: lineHeight,
                    mx: 1.15,
                    borderRadius: 999,
                    bgcolor: isDone
                      ? alpha(theme.palette.success.main, 0.26)
                      : alpha(theme.palette.common.white, 0.10),
                    border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
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

            <ActiveIssueStageStepper issue={issue} tone={tone} />

            <Box sx={{ flex: 1 }} />
          </Stack>

          <Box sx={{ position: "relative", zIndex: 1 }}>
            <ActiveIssueDeadlineBar issue={issue} />
          </Box>
        </Box>
      </IssuesGridCard>
    </Grid>
  );
};

export default ActiveIssueCard;
