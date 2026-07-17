import { useEffect, useMemo, useState } from "react";
import { Box, IconButton, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import { executionCardSx, executionCarouselGridSx, executionCarouselShellSx } from "../models.styles.js";

const visibleCountFor = ({ mobile, tablet }) => (mobile ? 1 : tablet ? 2 : 3);

const ExecutionCard = ({ execution, onSelect, onRemove }) => {
  const isBase = execution.type === "base";
  const isFailed = execution.status === "error" || execution.status === "failed";

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSelect(execution.key)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(execution.key);
        }
      }}
      aria-pressed={execution.selected}
      sx={executionCardSx(execution.selected)}
    >
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <Box sx={{ width: 36, height: 36, flex: "0 0 auto", borderRadius: 2, display: "grid", placeItems: "center", bgcolor: "rgba(56, 184, 201, 0.12)", color: "secondary.light" }}>
          {isBase ? <LayersRoundedIcon /> : <ScienceRoundedIcon />}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box component="span" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, fontWeight: 900 }}>{execution.label}</Box>
          <Box component="span" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "text.secondary", fontSize: 11.5, mt: 0.25 }}>{execution.modelName}</Box>
        </Box>
        {execution.removable ? <Tooltip title="Remove scenario"><IconButton size="small" color="error" aria-label={`Remove ${execution.label}`} onClick={(event) => { event.stopPropagation(); onRemove(execution.key); }}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip> : null}
      </Box>
      <Box component="span" sx={{ display: "inline-block", mt: 1.1, px: 0.8, py: 0.25, borderRadius: 1.5, border: "1px solid", borderColor: isFailed ? "error.main" : "rgba(255,255,255,0.16)", color: isFailed ? "error.light" : "text.secondary", fontSize: 10, fontWeight: 850 }}>
        {isFailed ? "Failed" : isBase ? "Base execution" : "Scenario"}
      </Box>
    </Box>
  );
};

const ExecutionCarousel = ({ executions, onSelect, onRemove, onAdd }) => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const tablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));
  const visibleCount = visibleCountFor({ mobile, tablet });
  const [start, setStart] = useState(0);
  const maxStart = Math.max(0, executions.length - visibleCount);

  useEffect(() => setStart((current) => Math.min(current, maxStart)), [maxStart]);
  useEffect(() => {
    const selectedIndex = executions.findIndex((execution) => execution.selected);
    if (selectedIndex < start) setStart(selectedIndex);
    if (selectedIndex >= start + visibleCount) setStart(selectedIndex - visibleCount + 1);
  }, [executions, start, visibleCount]);

  const visibleExecutions = useMemo(() => executions.slice(start, start + visibleCount), [executions, start, visibleCount]);
  const showArrows = executions.length > visibleCount;

  return (
    <Box sx={executionCarouselShellSx} data-testid="models-execution-carousel">
      {showArrows ? <IconButton aria-label="Previous executions" onClick={() => setStart((current) => Math.max(0, current - 1))} disabled={start === 0}><ChevronLeftRoundedIcon /></IconButton> : <Box />}
      <Box sx={executionCarouselGridSx(visibleCount)}>
        {visibleExecutions.map((execution) => <ExecutionCard key={execution.key} execution={execution} onSelect={onSelect} onRemove={onRemove} />)}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
        {showArrows ? <IconButton aria-label="Next executions" onClick={() => setStart((current) => Math.min(maxStart, current + 1))} disabled={start >= maxStart}><ChevronRightRoundedIcon /></IconButton> : null}
        <Tooltip title="Add model"><IconButton aria-label="Add model" color="secondary" onClick={onAdd}><AddRoundedIcon /></IconButton></Tooltip>
      </Box>
    </Box>
  );
};

export default ExecutionCarousel;
