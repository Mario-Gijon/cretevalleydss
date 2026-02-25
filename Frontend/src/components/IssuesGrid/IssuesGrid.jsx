import { Box, Grid, Stack, Typography, Divider, Tooltip, Paper } from "@mui/material";
import { alpha, styled, useTheme } from "@mui/material/styles";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import { Pill, getNextActionMeta, toneColor } from "../ActiveIssuesHeader/ActiveIssuesHeader";

/* -----------------------------
 * Card shell (glass / dark)
 * ----------------------------- */

const IssueGlassIssueCard = styled(Paper)(({ theme }) => ({
  borderRadius: 20,
  height: "100%",
  transition: "transform 160ms ease, box-shadow 160ms ease, background 220ms ease, border-color 220ms ease",
  background: "rgba(21, 30, 38, 0.18)",
  color: theme.palette.common.white,
  boxShadow: "0 12px 34px rgba(29, 82, 81, 0.18)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.10)",
  overflow: "hidden",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 18px 46px rgba(21, 60, 59, 0.30)",
    background: "rgba(60, 119, 121, 0.1)",
    borderColor: "rgba(255,255,255,0.14)",
  },
}));

/* -----------------------------
 * Deadline helpers
 * ----------------------------- */

const clamp01 = (n) => Math.max(0, Math.min(1, n));

const parseDateDDMMYYYY = (d) => {
  if (!d || typeof d !== "string") return null;
  const [dd, mm, yyyy] = d.split("-").map((x) => Number(x));
  if (!dd || !mm || !yyyy) return null;
  const t = new Date(yyyy, mm - 1, dd).getTime();
  return Number.isFinite(t) ? t : null;
};

const computeDeadlineProgress = (issue) => {
  const uiD = issue?.ui?.deadline;

  if (uiD?.hasDeadline && typeof uiD.daysLeft === "number") {
    const end = parseDateDDMMYYYY(issue?.closureDate);
    const start = parseDateDDMMYYYY(issue?.creationDate);
    const now = Date.now();

    if (end) {
      const fallbackTotal = 1000 * 60 * 60 * 24 * 30;
      const baseStart = start || end - fallbackTotal;
      const total = Math.max(1, end - baseStart);
      const progress = clamp01((now - baseStart) / total);
      return { progress, daysLeft: uiD.daysLeft, label: issue?.closureDate };
    }
    return { progress: 0, daysLeft: uiD.daysLeft, label: issue?.closureDate };
  }

  const end = parseDateDDMMYYYY(issue?.closureDate);
  if (!end) return null;

  const start = parseDateDDMMYYYY(issue?.creationDate);
  const now = Date.now();
  const fallbackTotal = 1000 * 60 * 60 * 24 * 30;
  const baseStart = start || end - fallbackTotal;

  const total = Math.max(1, end - baseStart);
  const progress = clamp01((now - baseStart) / total);

  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return { progress, daysLeft, label: issue?.closureDate };
};

const deadlineColorByProgress = (theme, progress) => {
  if (progress < 0.25) return alpha(theme.palette.info.main, 0.95);
  if (progress < 0.50) return alpha(theme.palette.success.main, 0.95);
  if (progress < 0.70) return alpha(theme.palette.warning.light, 0.95);
  if (progress < 0.85) return alpha(theme.palette.warning.main, 0.95);
  return alpha(theme.palette.error.main, 0.95);
};

const DeadlineBar = ({ issue }) => {
  const theme = useTheme();

  const hasServerDeadline = Boolean(issue?.ui?.deadline?.hasDeadline);
  const hasLegacyDeadline = Boolean(issue?.closureDate);
  if (!hasServerDeadline && !hasLegacyDeadline) {
    return (
      <Box sx={{ mt: 0.9, display: "flex", alignItems: "center", gap: 0.8, color: alpha(theme.palette.common.white, 0.70) }}>
        <CalendarMonthIcon sx={{ fontSize: 16, opacity: 0.75 }} />
        <Typography variant="caption" sx={{ fontWeight: 950 }}>
          No deadline
        </Typography>
      </Box>
    );
  }

  const data = computeDeadlineProgress(issue);
  const progress = data?.progress ?? 0;
  const daysLeft = data?.daysLeft;
  const label = data?.label || issue?.closureDate || "—";
  const barColor = deadlineColorByProgress(theme, progress);

  const tip =
    typeof daysLeft === "number"
      ? `${label} • ${daysLeft <= 0 ? "Expired" : `${daysLeft} day(s) left`}`
      : String(label);

  return (
    <Tooltip title={tip} placement="top" arrow>
      <Box sx={{ mt: 0.9 }}>
        <Stack direction="row" spacing={0.8} sx={{ alignItems: "center", mb: 0.6 }}>
          <CalendarMonthIcon sx={{ fontSize: 16, color: alpha(theme.palette.common.white, 0.72) }} />
          <Typography variant="caption" sx={{ fontWeight: 950, color: alpha(theme.palette.common.white, 0.82) }}>
            {label}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {typeof daysLeft === "number" ? (
            <Typography variant="caption" sx={{ fontWeight: 950, color: alpha(theme.palette.common.white, 0.72) }}>
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

/* -----------------------------
 * Stepper logic (dynamic steps)
 * ----------------------------- */

const detectDirectWeights = (issue) => {
  // ✅ server-first
  if (issue?.ui?.hasDirectWeights === true) return true;
  if (issue?.ui?.hasDirectWeights === false) return false;

  // fallback legacy
  const wm = String(issue?.weightingMode || "").toLowerCase();
  if (["manual", "direct", "predefined", "fixed"].includes(wm)) return true;

  const w = issue?.modelParameters?.weights;
  if (Array.isArray(w) && w.length > 0 && w.some((x) => x !== null && x !== undefined)) return true;

  return false;
};


const detectAltConsensus = (issue) => {
  // ✅ server-first (estable)
  if (issue?.ui?.hasAlternativeConsensus === true) return true;
  if (issue?.ui?.hasAlternativeConsensus === false) return false;

  // si el backend ya manda steps, úsalo
  const ss = issue?.ui?.workflowSteps;
  if (Array.isArray(ss) && ss.some((s) => s?.key === "alternativeConsensus")) return true;

  // fallback legacy (solo si aún no migraste todo)
  const f = issue?.statusFlags || {};
  return Boolean(
    issue?.isConsensus ||
      f.alternativeConsensusActive ||
      f.waitingAlternativeConsensus ||
      f.consensusAlternativesActive ||
      f.altConsensusActive ||
      issue?.alternativeConsensusActive ||
      issue?.consensusAlternativesActive
  );
};

const buildWorkflowSteps = (issue) => {
  // ✅ server-first: lista estable -> nunca desaparece el punto
  const serverSteps = issue?.ui?.workflowSteps;
  if (Array.isArray(serverSteps) && serverSteps.length) return serverSteps;

  // fallback legacy (tu lógica actual)
  const direct = detectDirectWeights(issue);
  const altConsensus = detectAltConsensus(issue);

  if (direct) {
    return [
      { key: "weightsAssigned", label: "Weights assigned" },
      { key: "alternativeEvaluation", label: "Alternative evaluation" },
      ...(altConsensus ? [{ key: "alternativeConsensus", label: "Alternative consensus" }] : []),
      { key: "readyResolve", label: "Ready to resolve" },
    ];
  }

  return [
    { key: "criteriaWeighting", label: "Criteria weighting" },
    { key: "weightsFinished", label: "Weights finished" },
    { key: "alternativeEvaluation", label: "Alternative evaluation" },
    ...(altConsensus ? [{ key: "alternativeConsensus", label: "Alternative consensus" }] : []),
    { key: "readyResolve", label: "Ready to resolve" },
  ];
};

const mapServerStatusToStepKey = (issue) => {
  const k = issue?.ui?.statusKey || issue?.nextAction?.key;
  if (!k) return null;
  const s = String(k);

  if (s === "evaluateWeights") return detectDirectWeights(issue) ? "weightsAssigned" : "criteriaWeighting";
  if (s === "computeWeights") return detectDirectWeights(issue) ? "weightsAssigned" : "weightsFinished";
  if (s === "evaluateAlternatives") return "alternativeEvaluation";

  // ✅ si algún día lo usas como statusKey directo
  if (s === "alternativeConsensus") return "alternativeConsensus";

  if (s === "resolveIssue" || s === "waitingAdmin") return "readyResolve";

  // ✅ nuevo
  if (s === "waitingExperts") return detectDirectWeights(issue) ? "weightsAssigned" : "criteriaWeighting";

  // legacy
  if (s === "pendingInvitations") return detectDirectWeights(issue) ? "weightsAssigned" : "criteriaWeighting";

  if (s === "finished") return "__done__";

  return null;
};


const resolveCurrentStepKey = (issue, steps) => {
  if (!issue) return steps?.[0]?.key || "criteriaWeighting";
  if (issue?.currentStage === "finished") return "__done__";

  const sk = mapServerStatusToStepKey(issue);
  if (sk === "__done__") return "__done__";
  if (sk && steps.some((x) => x.key === sk)) return sk;

  const f = issue?.statusFlags || {};
  const stage = issue?.currentStage;

  if (steps.some((x) => x.key === "alternativeConsensus") && detectAltConsensus(issue)) return "alternativeConsensus";

  const waitingAdminResolve = Boolean(f.waitingAdmin) && stage !== "weightsFinished" && stage !== "criteriaWeighting";
  if (f.canResolveIssue || waitingAdminResolve) return "readyResolve";

  if (stage === "alternativeEvaluation") return "alternativeEvaluation";
  if (stage === "weightsFinished") return detectDirectWeights(issue) ? "weightsAssigned" : "weightsFinished";
  if (stage === "criteriaWeighting") return detectDirectWeights(issue) ? "weightsAssigned" : "criteriaWeighting";

  return detectDirectWeights(issue) ? "weightsAssigned" : "criteriaWeighting";
};

/* -----------------------------
 * Stepper UI (single line, no wrap, green completed circles)
 * ----------------------------- */

const hideScrollbarSx = {
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { height: 0 },
};

const IssueStageStepper = ({ issue, tone = "info" }) => {
  const theme = useTheme();
  const steps = buildWorkflowSteps(issue);
  const currentKey = resolveCurrentStepKey(issue, steps);

  const doneAll = currentKey === "__done__";
  const currentIndex = doneAll ? steps.length - 1 : Math.max(0, steps.findIndex((s) => s.key === currentKey));

  const accent = toneColor(tone).dot;

  const LINE_W = "clamp(18px, 2.4vw, 34px)";
  const LINE_H = 4;

  const currentLabel = doneAll ? "Finished" : steps[currentIndex]?.label;

  const successDot = alpha(theme.palette.success.main, 0.78);
  const successBr = alpha(theme.palette.success.main, 0.90);

  return (
    // ✅ inline-flex so the box hugs content when it fits,
    // ✅ maxWidth 100% + overflowX for small screens without wrapping
    <Box
      sx={{
        display: "inline-flex",
        alignSelf: "flex-start",
        maxWidth: "100%",
        px: 1.0,
        py: 0.85,
        borderRadius: 3,
        bgcolor: alpha(accent, 0.08),
        border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
        overflowX: "auto",
        overflowY: "hidden",
        ...hideScrollbarSx,
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
        {steps.map((s, i) => {
          const isDone = doneAll ? true : i < currentIndex;
          const isActive = doneAll ? i === steps.length - 1 : i === currentIndex;

          const tooltip = s.label; // ✅ no “current/upcoming” text

          const dotBg = isDone
            ? successDot
            : isActive
              ? alpha(accent, 0.75)
              : alpha(theme.palette.common.white, 0.14);

          const dotBr = isDone
            ? successBr
            : isActive
              ? alpha(accent, 0.95)
              : alpha(theme.palette.common.white, 0.16);

          const dotShadow = isActive ? `0 0 0 4px ${alpha(accent, 0.16)}` : "none";

          return (
            <Box key={s.key} sx={{ display: "inline-flex", alignItems: "center" }}>
              <Tooltip title={tooltip} placement="top" arrow>
                {isActive ? (
                  // ✅ current label inside “dot-pill”
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
                        bgcolor: alpha(accent, 0.90),
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
                  // ✅ idle/done dot (bigger)
                  <Box
                    sx={{
                      width: isDone ? 12 : 11,
                      height: isDone ? 12 : 11,
                      borderRadius: 999,
                      bgcolor: dotBg,
                      border: `1px solid ${dotBr}`,
                      transition: "all 160ms ease",
                    }}
                  />
                )}
              </Tooltip>

              {i !== steps.length - 1 ? (
                <Box
                  sx={{
                    width: LINE_W,
                    height: LINE_H,
                    mx: 1.15,
                    borderRadius: 999,
                    bgcolor: isDone ? alpha(theme.palette.success.main, 0.26) : alpha(theme.palette.common.white, 0.10),
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

/* -----------------------------
 * Component
 * ----------------------------- */

const CARD_HEIGHT = 262;

const IssuesGrid = ({ issues = [], onOpenIssue, sx }) => {
  const theme = useTheme();

  return (
    <Grid container spacing={2} sx={sx}>
      {(issues || []).map((issue) => {
        const meta = getNextActionMeta(issue);
        const tone = meta?.tone || "info";
        const accent = alpha(toneColor(tone).dot, 0.90);

        return (
          <Grid item xs={12} md={6} xl={4} key={issue.id}>
            <IssueGlassIssueCard elevation={0} sx={{ height: CARD_HEIGHT }}>
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
                {/* Left accent bar */}
                <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, bgcolor: accent }} />

                {/* Soft glow */}
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

                <Stack spacing={1.05} sx={{ position: "relative", zIndex: 1, minHeight: 0, flex: 1 }}>
                  {/* Name + admin icon */}
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

                  {/* Description */}
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

                  {/* Action */}
                  <Box sx={{ mt: 0.2 }}>
                    <Pill tone={tone}>{meta?.title || "—"}</Pill>
                  </Box>

                  <Divider sx={{ opacity: 0.14, my: 0.7, borderColor: alpha("#fff", 0.12) }} />

                  {/* Stepper (single line, scroll if needed) */}
                  <IssueStageStepper issue={issue} tone={tone} />

                  <Box sx={{ flex: 1 }} />
                </Stack>

                {/* Deadline */}
                <Box sx={{ position: "relative", zIndex: 1 }}>
                  <DeadlineBar issue={issue} />
                </Box>
              </Box>
            </IssueGlassIssueCard>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default IssuesGrid;
