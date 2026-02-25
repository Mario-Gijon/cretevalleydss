import { useEffect, useMemo, useRef } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  IconButton,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { Pill, toneColor, stageLabel } from "../ActiveIssuesHeader/ActiveIssuesHeader";

const crystalBorder = () => ({ border: "1px solid rgba(109, 109, 109, 0.58)" });

const toneFromSeverity = (severity) => {
  if (severity === "success") return "success";
  if (severity === "warning") return "warning";
  if (severity === "error") return "error";
  if (severity === "info") return "info";
  return "info";
};

const formatDeadlineMini = (deadline) => {
  if (!deadline?.hasDeadline) return null;
  const d = deadline.daysLeft;
  if (typeof d !== "number") return null;
  if (d < 0) return "Expired";
  if (d === 0) return "Today";
  return `${d}d`;
};

const hideScrollbarX = {
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { height: 0 },
};

const TaskCenter = ({
  taskCenter,
  taskGroups,
  tasksCount,
  taskType,
  setTaskType,
  onOpenIssueId,
  onOpenIssue,
  height = 350,
  minHeight = 260,
  variant = "panel",
}) => {
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));

  const paperRef = useRef(null);
  const railRef = useRef(null);

  const glass = (strength = 0.14) => ({
    bgcolor: alpha(theme.palette.background.paper, strength),
    backdropFilter: "blur(12px)",
    boxShadow: `0 18px 50px ${alpha(theme.palette.common.black, 0.10)}`,
    ...crystalBorder(),
  });

  const sections = useMemo(() => {
    const s = taskCenter?.sections;
    if (Array.isArray(s) && s.length) {
      return s
        .map((sec) => ({
          key: sec.key,
          title: sec.title,
          tone: toneFromSeverity(sec.severity),
          items: Array.isArray(sec.items) ? sec.items : [],
          isServer: true,
        }))
        .filter((x) => x.items.length > 0);
    }

    const legacy = Array.isArray(taskGroups) ? taskGroups : [];
    return legacy.map((g) => ({ ...g, isServer: false })).filter((x) => (x.items || []).length > 0);
  }, [taskCenter, taskGroups]);

  const total = tasksCount ?? taskCenter?.total ?? 0;

  const options = useMemo(() => {
    const base = [{ value: "all", label: "All" }];
    const list = sections.map((s) => ({ value: s.key, label: s.title }));
    return [...base, ...list];
  }, [sections]);

  const groupsFiltered = useMemo(() => {
    if (taskType === "all") return sections;
    return sections.filter((g) => g.key === taskType);
  }, [sections, taskType]);

  const resolvedHeight = height === "auto" ? "auto" : height;
  const resolvedMaxHeight = height === "auto" ? "none" : height;

  const openItem = (payload) => {
    if (!payload) return;
    if (payload.isServer) {
      if (typeof onOpenIssueId === "function") return onOpenIssueId(payload.issueId);
      return;
    }
    if (typeof onOpenIssue === "function") return onOpenIssue(payload.raw);
  };

  const railItems = useMemo(() => {
    const list = [];
    for (const g of groupsFiltered) {
      const tone = g.tone || "info";
      const isServer = Boolean(g.isServer);

      for (const it of g.items) {
        if (isServer) {
          list.push({
            key: `${g.key}:${it.issueId}`,
            isServer: true,
            tone,
            groupTitle: g.title,
            issueId: it.issueId,
            issueName: it.issueName,
            stage: it.stage,
            deadline: it.deadline,
            raw: it,
          });
        } else {
          list.push({
            key: `${g.key}:${it.id}`,
            isServer: false,
            tone,
            groupTitle: g.title,
            issueId: it.id,
            issueName: it.name,
            stage: it.currentStage,
            deadline: it.ui?.deadline || null,
            raw: it,
          });
        }
      }
    }
    return list;
  }, [groupsFiltered]);

  const scrollRailBy = (dx) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dx, behavior: "smooth" });
  };

  // ✅ Wheel robusto: lo escuchamos en el Paper (más fiable),
  // y solo actuamos si el evento viene desde dentro del rail.
  useEffect(() => {
    if (variant !== "rail") return;

    const root = paperRef.current;
    const rail = railRef.current;
    if (!root || !rail) return;

    const onWheel = (e) => {
      // Solo si el ratón está encima del rail (o sus hijos)
      if (!rail.contains(e.target)) return;

      // Solo si hay overflow horizontal real
      const canScrollX = rail.scrollWidth > rail.clientWidth + 1;
      if (!canScrollX) return;

      // Convertimos wheel vertical a horizontal (trackpad / ratón)
      const dy = e.deltaY || 0;
      const dx = e.deltaX || 0;
      const move = Math.abs(dx) > Math.abs(dy) ? dx : dy;

      if (move !== 0) {
        rail.scrollLeft += move;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [variant]);

  // -----------------------------
  // ✅ RAIL
  // -----------------------------
  if (variant === "rail") {
    return (
      <Paper
        ref={paperRef}
        elevation={0}
        sx={{
          borderRadius: 5,
          p: isSmDown ? 1.35 : 1.75,
          ...glass(0.14),
          height: resolvedHeight,
          maxHeight: resolvedMaxHeight,
          minHeight,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header row */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.9 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: alpha(theme.palette.info.main, 0.12),
                color: "info.main",
              }}
            >
              <FactCheckIcon fontSize="small" />
            </Avatar>

            <Stack spacing={0.05} sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1 }}>
                Tasks
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                {total ? `${total} pending` : "No pending actions 🎉"}
              </Typography>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Pill tone={total ? "warning" : "success"}>{total}</Pill>

            {!isSmDown ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                <IconButton
                  size="small"
                  onClick={() => scrollRailBy(-420)}
                  sx={{
                    bgcolor: alpha(theme.palette.common.white, 0.06),
                    border: "1px solid rgba(255,255,255,0.10)",
                    "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.09) },
                  }}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => scrollRailBy(420)}
                  sx={{
                    bgcolor: alpha(theme.palette.common.white, 0.06),
                    border: "1px solid rgba(255,255,255,0.10)",
                    "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.09) },
                  }}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>
            ) : null}
          </Stack>
        </Stack>

        {/* Filter row */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.9, mt:2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel color="secondary">Task type</InputLabel>
            <Select
              value={taskType}
              label="Task type"
              color="secondary"
              onChange={(e) => setTaskType(e.target.value)}
            >
              {options.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
        </Stack>

        {/* Rail viewport (✅ ocupa TODO el alto restante) */}
        <Box sx={{ position: "relative", flex: 1, minHeight: 0, display: "flex" }}>
          {railItems.length === 0 ? (
            <Box sx={{ px: 0.5, py: 0.75 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                {total ? "No tasks for this filter" : "Nothing to do"}
              </Typography>
            </Box>
          ) : (
            <Box
              ref={railRef}
              sx={{
                flex: 1,
                height: "100%",
                display: "flex",
                alignItems: "stretch", // ✅ estira las cards -> adiós “suelo vacío”
                gap: 1.0,
                overflowX: "auto",
                overflowY: "hidden",
                pr: 0.25,
                scrollSnapType: "x proximity",
                overscrollBehaviorX: "contain",
                ...hideScrollbarX,
              }}
            >
              {railItems.map((it) => {
                const accent = toneColor(it.tone).dot;
                const dlMini = formatDeadlineMini(it.deadline);
                const dlTip = it.deadline?.hasDeadline ? it.deadline?.deadline : null;

                return (
                  <Box
                    key={it.key}
                    onClick={() => openItem(it)}
                    sx={{
                      cursor: "pointer",
                      minWidth: 240,
                      maxWidth: 280,
                      flex: "0 0 auto",
                      height: "100%", // ✅ llena el alto del carril
                      display: "flex",
                      flexDirection: "column",
                      scrollSnapAlign: "start",
                      borderRadius: 4,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.10)",
                      bgcolor: alpha(theme.palette.background.paper, 0.10),
                      boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.06)}`,
                      position: "relative",
                      "&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.08) },
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        bgcolor: alpha(accent, 0.75),
                      }}
                    />

                    <Box sx={{ p: 1.15, pl: 1.35, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                        <Stack direction="row" spacing={0.8} sx={{ alignItems: "center", minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              bgcolor: alpha(accent, 0.55),
                              boxShadow: `0 0 0 3px ${alpha(accent, 0.12)}`,
                              flex: "0 0 auto",
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 950,
                              color: alpha(theme.palette.text.primary, 0.80),
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={it.groupTitle}
                          >
                            {it.groupTitle}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 980, mt: 1.8, lineHeight: 1.1 }}
                        title={it.issueName}
                      >
                        {it.issueName}
                      </Typography>

                      {/* ✅ empuja el footer al fondo para “rellenar” bonito */}
                      <Box sx={{ flex: 1 }} />

                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.55 }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                          {stageLabel(it.stage)}
                        </Typography>

                        {dlMini ? (
                          <Tooltip title={dlTip || ""}>
                            <Stack direction="row" spacing={0.35} sx={{ alignItems: "center" }}>
                              <CalendarMonthIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 950 }}>
                                {dlMini}
                              </Typography>
                            </Stack>
                          </Tooltip>
                        ) : null}
                      </Stack>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* fades */}
          <Box
            sx={{
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: 18,
              background: `linear-gradient(to right, ${alpha(theme.palette.background.paper, 0.45)}, transparent)`,
              opacity: railItems.length ? 1 : 0,
            }}
          />
          <Box
            sx={{
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: 18,
              background: `linear-gradient(to left, ${alpha(theme.palette.background.paper, 0.45)}, transparent)`,
              opacity: railItems.length ? 1 : 0,
            }}
          />
        </Box>
      </Paper>
    );
  }

  // -----------------------------
  // ✅ PANEL (sin cambios relevantes)
  // -----------------------------
  const scrollbarSx = {
    scrollbarWidth: "thin",
    scrollbarColor: `${alpha(theme.palette.text.primary, 0.22)} transparent`,
    "&::-webkit-scrollbar": { width: 8 },
    "&::-webkit-scrollbar-track": { background: "transparent" },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: alpha(theme.palette.text.primary, 0.18),
      borderRadius: 999,
      border: `2px solid transparent`,
      backgroundClip: "content-box",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: alpha(theme.palette.text.primary, 0.28),
    },
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 5,
        p: isSmDown ? 1.35 : 1.75,
        ...glass(0.14),
        height: resolvedHeight,
        maxHeight: resolvedMaxHeight,
        minHeight,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Avatar
            sx={{
              width: isSmDown ? 34 : 36,
              height: isSmDown ? 34 : 36,
              bgcolor: alpha(theme.palette.info.main, 0.12),
              color: "info.main",
            }}
          >
            <FactCheckIcon fontSize="small" />
          </Avatar>

          <Stack spacing={0.1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1 }}>
              Tasks
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
              {total ? `${total} pending` : "No pending actions 🎉"}
            </Typography>
          </Stack>
        </Stack>

        <Pill tone={total ? "warning" : "success"}>{total}</Pill>
      </Stack>

      <FormControl size="small" sx={{ mb: 1.1, mt: 0.25 }}>
        <InputLabel color="secondary">Task type</InputLabel>
        <Select value={taskType} label="Task type" color="secondary" onChange={(e) => setTaskType(e.target.value)}>
          {options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ position: "relative", flex: 1, minHeight: 0, borderRadius: 4, overflow: "hidden" }}>
        <Box sx={{ height: "100%", overflowY: "auto", pr: 0.5, ...scrollbarSx }}>
          {groupsFiltered.length === 0 ? (
            <Box sx={{ p: 1 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
                {total ? "No tasks for this filter." : "All good. Nothing to do here."}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.05} sx={{ pb: 0.5 }}>
              {groupsFiltered.map((g) => {
                const tone = g.tone || "info";
                const accent = alpha(toneColor(tone).dot, 0.55);
                const isServer = Boolean(g.isServer);

                return (
                  <Box
                    key={g.key}
                    sx={{
                      borderRadius: 4,
                      overflow: "hidden",
                      bgcolor: alpha(theme.palette.background.paper, 0.10),
                      boxShadow: `0 14px 34px ${alpha(theme.palette.common.black, 0.06)}`,
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <Box
                      sx={{
                        px: 1.25,
                        py: 0.85,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            bgcolor: accent,
                            boxShadow: `0 0 0 3px ${alpha(accent, 0.12)}`,
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {g.title}
                        </Typography>
                      </Stack>
                      <Pill tone={tone}>{g.items.length}</Pill>
                    </Box>

                    <Divider sx={{ opacity: 0.18 }} />

                    <List disablePadding sx={{ py: 0.5 }}>
                      {g.items.map((it) => {
                        const issueId = isServer ? it.issueId : it.id;
                        const issueName = isServer ? it.issueName : it.name;
                        const stage = isServer ? it.stage : it.currentStage;

                        const dlMini = isServer ? formatDeadlineMini(it.deadline) : formatDeadlineMini(it?.ui?.deadline);
                        const dlTip = isServer && it.deadline?.hasDeadline ? it.deadline.deadline : it?.ui?.deadline?.deadline;

                        const payload = isServer
                          ? { isServer: true, issueId: it.issueId, raw: it }
                          : { isServer: false, issueId: it.id, raw: it };

                        return (
                          <ListItemButton
                            key={issueId}
                            onClick={() => openItem(payload)}
                            sx={{
                              mx: 0.75,
                              mt: 1,
                              borderRadius: 3,
                              bgcolor: alpha(theme.palette.text.primary, 0.02),
                              "&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.08) },
                            }}
                          >
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                  {issueName}
                                </Typography>
                              }
                              secondary={
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.15 }}>
                                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                                    {stageLabel(stage)}
                                  </Typography>

                                  {dlMini ? (
                                    <Tooltip title={dlTip || ""}>
                                      <Stack direction="row" spacing={0.4} sx={{ alignItems: "center" }}>
                                        <CalendarMonthIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 950 }}>
                                          {dlMini}
                                        </Typography>
                                      </Stack>
                                    </Tooltip>
                                  ) : null}
                                </Stack>
                              }
                            />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default TaskCenter;
