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
  Tooltip,
  IconButton,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import {
  resolveActiveIssuesToneColor,
} from "../../../utils/activeIssues.meta";
import ActiveIssuesPill from "../../shared/ActiveIssuesPill";
import { formatTaskCenterDeadlineMini } from "./utils/taskCenter.utils";
import {
  getTaskCenterGlassSx,
  taskCenterHideScrollbarXSx,
} from "./styles/taskCenter.styles";

/**
 * Variante horizontal del task center.
 *
 * @param {Object} props Props del componente.
 * @param {boolean} props.isSmDown Indica si la pantalla es pequeña.
 * @param {Object} props.paperRef Ref del contenedor.
 * @param {Object} props.railRef Ref del carril horizontal.
 * @param {number|string} props.resolvedHeight Altura aplicada.
 * @param {number|string} props.resolvedMaxHeight Altura máxima aplicada.
 * @param {number} props.minHeight Altura mínima.
 * @param {number} props.total Número total de tareas.
 * @param {string} props.taskType Tipo de tarea seleccionado.
 * @param {Function} props.setTaskType Setter del tipo de tarea.
 * @param {Array} props.options Opciones del selector.
 * @param {Array} props.railItems Items lineales del carril.
 * @param {Function} props.scrollRailBy Desplaza el carril.
 * @param {Function} props.openItem Abre un item del carril.
 * @returns {JSX.Element}
 */
const TaskCenterRail = ({
  isSmDown,
  paperRef,
  railRef,
  resolvedHeight,
  resolvedMaxHeight,
  minHeight,
  total,
  taskType,
  setTaskType,
  options,
  railItems,
  scrollRailBy,
  openItem,
}) => {
  const theme = useTheme();

  return (
    <Paper
      ref={paperRef}
      elevation={0}
      sx={{
        borderRadius: 5,
        p: isSmDown ? 1.35 : 1.75,
        ...getTaskCenterGlassSx(theme),
        height: resolvedHeight,
        maxHeight: resolvedMaxHeight,
        minHeight,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 0.9 }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", minWidth: 0 }}
        >
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
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 980, lineHeight: 1 }}
            >
              Tasks
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", fontWeight: 900 }}
            >
              {total ? `${total} pending` : "No pending actions"}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ActiveIssuesPill tone={total ? "warning" : "success"}>
            {total}
          </ActiveIssuesPill>

          {!isSmDown ? (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: "center" }}
            >
              <IconButton
                size="small"
                onClick={() => scrollRailBy(-420)}
                sx={{
                  bgcolor: alpha(theme.palette.common.white, 0.06),
                  border: "1px solid rgba(255,255,255,0.10)",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.common.white, 0.09),
                  },
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
                  "&:hover": {
                    bgcolor: alpha(theme.palette.common.white, 0.09),
                  },
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Stack>
          ) : null}
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ mb: 0.9, mt: 1.2 }}
      >
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel color="secondary">Task type</InputLabel>
          <Select
            value={taskType}
            label="Task type"
            color="secondary"
            onChange={(event) => setTaskType(event.target.value)}
          >
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />
      </Stack>

      <Box
        sx={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          display: "flex",
        }}
      >
        {railItems.length === 0 ? (
          <Box sx={{ px: 0.5, py: 0.75 }}>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", fontWeight: 850 }}
            >
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
              alignItems: "stretch",
              gap: 1,
              overflowX: "auto",
              overflowY: "hidden",
              pr: 0.25,
              scrollSnapType: "x proximity",
              overscrollBehaviorX: "contain",
              ...taskCenterHideScrollbarXSx,
            }}
          >
            {railItems.map((item) => {
              const accent = resolveActiveIssuesToneColor(item.tone).dot;
              const deadlineMini = formatTaskCenterDeadlineMini(item.deadline);
              const deadlineTooltip = item.deadline?.hasDeadline
                ? item.deadline?.deadline
                : null;

              return (
                <Box
                  key={item.key}
                  onClick={() => openItem(item)}
                  sx={{
                    cursor: "pointer",
                    minWidth: 240,
                    maxWidth: 280,
                    flex: "0 0 auto",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    scrollSnapAlign: "start",
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.10)",
                    bgcolor: alpha(theme.palette.background.paper, 0.10),
                    boxShadow: `0 14px 34px ${alpha(
                      theme.palette.common.black,
                      0.06
                    )}`,
                    position: "relative",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.secondary.main, 0.08),
                    },
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

                  <Box
                    sx={{
                      p: 1.15,
                      pl: 1.35,
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                      minHeight: 0,
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Stack
                        direction="row"
                        spacing={0.8}
                        sx={{ alignItems: "center", minWidth: 0 }}
                      >
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
                          title={item.groupTitle}
                        >
                          {item.groupTitle}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 980, mt: 1.8, lineHeight: 1.1 }}
                      title={item.issueName}
                    >
                      {item.issueName}
                    </Typography>

                    <Box sx={{ flex: 1 }} />

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", mt: 0.55 }}
                    >
                      {deadlineMini ? (
                        <Tooltip title={deadlineTooltip || ""}>
                          <Stack
                            direction="row"
                            spacing={0.35}
                            sx={{ alignItems: "center" }}
                          >
                            <CalendarMonthIcon
                              sx={{ fontSize: 14, opacity: 0.7 }}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                color: "text.secondary",
                                fontWeight: 950,
                              }}
                            >
                              {deadlineMini}
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

        <Box
          sx={{
            pointerEvents: "none",
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: 18,
            background: `linear-gradient(to right, ${alpha(
              theme.palette.background.paper,
              0.45
            )}, transparent)`,
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
            background: `linear-gradient(to left, ${alpha(
              theme.palette.background.paper,
              0.45
            )}, transparent)`,
            opacity: railItems.length ? 1 : 0,
          }}
        />
      </Box>
    </Paper>
  );
};

export default TaskCenterRail;