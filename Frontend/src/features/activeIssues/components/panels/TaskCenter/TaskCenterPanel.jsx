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
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

import {
  resolveActiveIssuesToneColor,
  stageLabel,
} from "../../../utils/activeIssues.meta";
import ActiveIssuesPill from "../../shared/ActiveIssuesPill";
import { formatTaskCenterDeadlineMini } from "./utils/taskCenter.utils";
import {
  getTaskCenterGlassSx,
  getTaskCenterScrollbarSx,
} from "./styles/taskCenter.styles";

/**
 * Variante en panel del task center.
 *
 * @param {Object} props Props del componente.
 * @param {boolean} props.isSmDown Indica si la pantalla es pequeña.
 * @param {number|string} props.resolvedHeight Altura aplicada.
 * @param {number|string} props.resolvedMaxHeight Altura máxima aplicada.
 * @param {number} props.minHeight Altura mínima.
 * @param {number} props.total Número total de tareas.
 * @param {string} props.taskType Tipo de tarea seleccionado.
 * @param {Function} props.setTaskType Setter del tipo de tarea.
 * @param {Array} props.options Opciones del selector.
 * @param {Array} props.groupsFiltered Grupos visibles.
 * @param {Function} props.openItem Abre una tarea.
 * @returns {JSX.Element}
 */
const TaskCenterPanel = ({
  isSmDown,
  resolvedHeight,
  resolvedMaxHeight,
  minHeight,
  total,
  taskType,
  setTaskType,
  options,
  groupsFiltered,
  openItem,
}) => {
  const theme = useTheme();
  const scrollbarSx = getTaskCenterScrollbarSx(theme);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 5,
        p: isSmDown ? 1.35 : 1.75,
        ...getTaskCenterGlassSx(theme),
        height: resolvedHeight,
        maxHeight: resolvedMaxHeight,
        minHeight,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1.1 }}
      >
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

        <ActiveIssuesPill tone={total ? "warning" : "success"}>
          {total}
        </ActiveIssuesPill>
      </Stack>

      <FormControl size="small" sx={{ mb: 1.1, mt: 0.25 }}>
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

      <Box
        sx={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <Box sx={{ height: "100%", overflowY: "auto", pr: 0.5, ...scrollbarSx }}>
          {groupsFiltered.length === 0 ? (
            <Box sx={{ p: 1 }}>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", fontWeight: 850 }}
              >
                {total
                  ? "No tasks for this filter."
                  : "All good. Nothing to do here."}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.05} sx={{ pb: 0.5 }}>
              {groupsFiltered.map((group) => {
                const tone = group.tone || "info";
                const accent = alpha(
                  resolveActiveIssuesToneColor(tone).dot,
                  0.55
                );
                const isServer = Boolean(group.isServer);

                return (
                  <Box
                    key={group.key}
                    sx={{
                      borderRadius: 4,
                      overflow: "hidden",
                      bgcolor: alpha(theme.palette.background.paper, 0.10),
                      boxShadow: `0 14px 34px ${alpha(
                        theme.palette.common.black,
                        0.06
                      )}`,
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
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center", minWidth: 0 }}
                      >
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
                          sx={{
                            fontWeight: 950,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {group.title}
                        </Typography>
                      </Stack>

                      <ActiveIssuesPill tone={tone}>
                        {group.items.length}
                      </ActiveIssuesPill>
                    </Box>

                    <Divider sx={{ opacity: 0.18 }} />

                    <List disablePadding sx={{ py: 0.5 }}>
                      {group.items.map((item) => {
                        const issueId = isServer ? item.issueId : item.id;
                        const issueName = isServer ? item.issueName : item.name;
                        const stage = isServer ? item.stage : item.currentStage;

                        const deadlineMini = isServer
                          ? formatTaskCenterDeadlineMini(item.deadline)
                          : formatTaskCenterDeadlineMini(item?.ui?.deadline);

                        const deadlineTooltip =
                          isServer && item.deadline?.hasDeadline
                            ? item.deadline.deadline
                            : item?.ui?.deadline?.deadline;

                        const payload = isServer
                          ? { isServer: true, issueId: item.issueId, raw: item }
                          : { isServer: false, issueId: item.id, raw: item };

                        return (
                          <ListItemButton
                            key={issueId}
                            onClick={() => openItem(payload)}
                            sx={{
                              mx: 0.75,
                              mt: 1,
                              borderRadius: 3,
                              bgcolor: alpha(theme.palette.text.primary, 0.02),
                              "&:hover": {
                                bgcolor: alpha(theme.palette.secondary.main, 0.08),
                              },
                            }}
                          >
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ fontWeight: 900 }}>
                                  {issueName}
                                </Typography>
                              }
                              secondary={
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  sx={{ alignItems: "center", mt: 0.15 }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{ color: "text.secondary", fontWeight: 900 }}
                                  >
                                    {stageLabel(stage)}
                                  </Typography>

                                  {deadlineMini ? (
                                    <Tooltip title={deadlineTooltip || ""}>
                                      <Stack
                                        direction="row"
                                        spacing={0.4}
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

export default TaskCenterPanel;