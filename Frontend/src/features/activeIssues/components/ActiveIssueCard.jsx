import { Box, Divider, Grid, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";

import {
  getNextActionMeta,
  resolveActiveIssuesToneColor,
} from "../logic/activeIssuesMeta";
import { computeIssueDeadlineProgress } from "../logic/activeIssueDeadline";
import {
  buildIssueWorkflowSteps,
  resolveIssueCurrentStepKey,
} from "../logic/activeIssueWorkflow";
import { ISSUES_GRID_CARD_HEIGHT, IssuesGridCard } from "../styles/ActiveIssuesGrid.styles";

const countLeafCriteria = (criteria = []) => {
  const nodes = Array.isArray(criteria) ? [...criteria] : [];
  let count = 0;

  while (nodes.length > 0) {
    const node = nodes.pop();
    const children = Array.isArray(node?.children) ? node.children : [];

    if (children.length === 0) {
      count += 1;
      continue;
    }

    nodes.push(...children);
  }

  return count;
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
  const successDot = alpha(theme.palette.success.main, 0.78);
  const successBorder = alpha(theme.palette.success.main, 0.9);

  return (
    <Box sx={{ width: "92%", mx: "auto", py: 0.65, overflow: "visible" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          width: "100%",
          minWidth: 0,
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
              sx={{
                position: "relative",
                display: "flex",
                flex: "1 1 0",
                minWidth: 0,
                justifyContent: "center",
              }}
            >
              <Tooltip title={tooltip} placement="top" arrow>
                <Stack
                  spacing={0.45}
                  sx={{ width: "100%", alignItems: "center", minWidth: 0 }}
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
                      fontSize: "0.68rem",
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
                    height: "1px",
                    position: "absolute",
                    top: 6,
                    left: "calc(50% + 8px)",
                    right: "calc(-50% + 8px)",
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
  const criteriaCount = countLeafCriteria(issue?.criteria);
  const deadline = issue?.ui?.deadline?.hasDeadline
    ? computeIssueDeadlineProgress(issue)?.label || issue?.closureDate
    : "No deadline";
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: "center",
        mt: 1.15,
        color: "#77848E",
        flexWrap: "wrap",
        rowGap: 0.65,
        width: "100%",
        justifyContent: "space-between",
      }}
    >
      {alternativesCount !== null ? (
        <Stack direction="row" spacing={0.55} sx={{ alignItems: "center" }}>
          <AltRouteIcon sx={{ fontSize: 15 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {alternativesCount} alternatives
          </Typography>
        </Stack>
      ) : null}
      <Stack direction="row" spacing={0.55} sx={{ alignItems: "center" }}>
        <AccountTreeIcon sx={{ fontSize: 15 }} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {criteriaCount} criteria
        </Typography>
      </Stack>
      {expertsCount !== null ? (
        <Stack direction="row" spacing={0.55} sx={{ alignItems: "center" }}>
          <GroupsOutlinedIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {expertsCount} experts
          </Typography>
        </Stack>
      ) : null}
      <Stack direction="row" spacing={0.55} sx={{ alignItems: "center" }}>
        <CalendarMonthIcon sx={{ fontSize: 15 }} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {deadline}
        </Typography>
      </Stack>
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
  const ownerLabel = issue?.isIssueOwner
    ? "You are the owner"
    : typeof issue?.owner === "string" && issue.owner.trim()
      ? issue.owner
      : null;

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
            p: 2.4,
            pl: 2.6,
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
                minWidth: 0,
              }}
              title={issue?.name || ""}
            >
              {issue?.name || "—"}
            </Typography>

            {ownerLabel ? (
              <Typography
                variant="body2"
                sx={{ color: alpha(theme.palette.common.white, 0.62), fontWeight: 500 }}
              >
                {ownerLabel}
              </Typography>
            ) : null}

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

            <ActiveIssueStageStepper issue={issue} tone={tone} />

            <Box sx={{ flex: 1 }} />
          </Stack>

          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Divider
              sx={{
                borderColor: "rgba(150, 170, 185, 0.12)",
                mb: 0.2,
              }}
            />
            <ActiveIssueFooterMetadata issue={issue} />
          </Box>
        </Box>
      </IssuesGridCard>
    </Grid>
  );
};

export default ActiveIssueCard;
