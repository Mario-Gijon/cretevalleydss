import { useEffect, useMemo, useState } from "react";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Box, IconButton, useMediaQuery, useTheme } from "@mui/material";

import AddModelCard from "./AddModelCard.jsx";
import ExecutionCard from "./ExecutionCard.jsx";
import { capacityForExecutionGallery } from "../logic/executionGalleryCapacity.js";
import {
  executionGalleryGridSx,
  scenarioCarouselControlSx,
  scenarioCarouselShellSx,
  scenarioCarouselWindowSx,
} from "../models.styles.js";

const ExecutionGallery = ({ executions, scenarioCount, formatDateTime, onSelect, onRemove, onAdd }) => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const tablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));
  const capacity = capacityForExecutionGallery({ mobile, tablet });
  const [start, setStart] = useState(0);
  const baseExecution = executions.find((execution) => execution.type === "base");
  const scenarioExecutions = executions.filter((execution) => execution.type === "scenario");
  const maxStart = Math.max(0, scenarioExecutions.length - capacity);
  const showCarousel = scenarioExecutions.length > capacity;

  useEffect(() => setStart((current) => Math.min(current, maxStart)), [maxStart]);
  useEffect(() => {
    const selectedIndex = scenarioExecutions.findIndex((execution) => execution.selected);
    if (selectedIndex < 0) return;
    if (selectedIndex < start) setStart(selectedIndex);
    if (selectedIndex >= start + capacity) setStart(selectedIndex - capacity + 1);
  }, [capacity, scenarioExecutions, start]);

  const visibleScenarios = useMemo(
    () => scenarioExecutions.slice(start, start + capacity),
    [capacity, scenarioExecutions, start]
  );
  const scenarioCards = visibleScenarios.map((execution) => (
    <ExecutionCard key={execution.key} execution={execution} formattedComputedAt={formatDateTime(execution.computedAt)} onSelect={onSelect} onRemove={onRemove} />
  ));

  return (
    <Box sx={executionGalleryGridSx({ scenarioCount, carousel: showCarousel })} data-testid="models-execution-gallery">
      {baseExecution ? <ExecutionCard execution={baseExecution} formattedComputedAt={formatDateTime(baseExecution.computedAt)} onSelect={onSelect} onRemove={onRemove} /> : null}
      {showCarousel ? (
        <Box sx={scenarioCarouselShellSx} data-testid="models-scenario-carousel">
          <IconButton aria-label="Previous scenarios" disabled={start === 0} onClick={() => setStart((current) => Math.max(0, current - 1))} sx={scenarioCarouselControlSx}><ChevronLeftRoundedIcon /></IconButton>
          <Box sx={scenarioCarouselWindowSx(capacity)}>{scenarioCards}</Box>
          <IconButton aria-label="Next scenarios" disabled={start >= maxStart} onClick={() => setStart((current) => Math.min(maxStart, current + 1))} sx={scenarioCarouselControlSx}><ChevronRightRoundedIcon /></IconButton>
        </Box>
      ) : scenarioCards}
        <AddModelCard onAdd={onAdd} />
    </Box>
  );
};

export default ExecutionGallery;
