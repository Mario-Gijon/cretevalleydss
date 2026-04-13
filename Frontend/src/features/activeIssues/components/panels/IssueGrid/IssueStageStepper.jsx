import { Box, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { resolveActiveIssuesToneColor } from "../../../utils/activeIssues.meta";
import {
  buildIssueWorkflowSteps,
  resolveIssueCurrentStepKey,
} from "./utils/issuesGrid.utils";
import { issuesGridHideScrollbarSx } from "./styles/issuesGrid.styles";

/**
 * Stepper compacto del workflow del issue.
 *
 * @param {Object} props Props del componente.
 * @param {Object|null} props.issue Issue a renderizar.
 * @param {string} props.tone Tono visual principal.
 * @returns {JSX.Element}
 */
const IssueStageStepper = ({ issue, tone = "info" }) => {
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

export default IssueStageStepper;