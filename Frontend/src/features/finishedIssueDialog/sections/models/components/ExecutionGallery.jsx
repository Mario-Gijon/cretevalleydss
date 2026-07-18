import { useEffect, useMemo, useState } from "react";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Box, IconButton, useMediaQuery, useTheme } from "@mui/material";

import AddModelCard from "./AddModelCard.jsx";
import ExecutionCard from "./ExecutionCard.jsx";
import { capacityForExecutionGallery } from "../logic/executionGalleryCapacity.js";
import {
  executionCarouselControlSx,
  executionCarouselItemSx,
  executionCarouselShellSx,
  executionCarouselTrackSx,
  executionCarouselViewportSx,
  executionGalleryGridSx,
} from "../models.styles.js";

const ExecutionGallery = ({ executions, formatDateTime, onSelect, onRemove, onAdd }) => {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const tablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));
  const capacity = capacityForExecutionGallery({ mobile, tablet });
  const [start, setStart] = useState(0);
  const orderedExecutions = useMemo(() => {
    const baseExecution = executions.find((execution) => execution.type === "base");
    const scenarioExecutions = executions.filter((execution) => execution.type === "scenario");
    return baseExecution ? [baseExecution, ...scenarioExecutions] : scenarioExecutions;
  }, [executions]);
  const selectedIndex = orderedExecutions.findIndex((execution) => execution.selected);
  const showCarousel = orderedExecutions.length > capacity;
  const trackItemCount = orderedExecutions.length + (showCarousel ? 1 : 0);
  const maxStart = Math.max(0, trackItemCount - capacity);

  useEffect(() => {
    setStart((current) => {
      const clampedCurrent = Math.min(Math.max(0, current), maxStart);
      if (selectedIndex < 0) return clampedCurrent;
      if (selectedIndex < clampedCurrent) return selectedIndex;
      if (selectedIndex >= clampedCurrent + capacity) {
        return Math.min(maxStart, selectedIndex - capacity + 1);
      }
      return clampedCurrent;
    });
  }, [capacity, maxStart, selectedIndex]);

  const executionCards = orderedExecutions.map((execution) => (
    <Box key={execution.key} sx={executionCarouselItemSx(capacity)}>
      <ExecutionCard execution={execution} formattedComputedAt={formatDateTime(execution.computedAt)} onSelect={onSelect} onRemove={onRemove} />
    </Box>
  ));

  const carouselItems = showCarousel ? [...executionCards,
    <Box key="add-model" data-testid="models-add-model-carousel-slide" sx={executionCarouselItemSx(capacity)}>
      <AddModelCard carousel onAdd={onAdd} />
    </Box>,
  ] : executionCards;

  return (
    <Box sx={executionGalleryGridSx({ executionCount: orderedExecutions.length, carousel: showCarousel })} data-testid="models-execution-gallery">
      {showCarousel ? <Box sx={executionCarouselShellSx} data-testid="models-execution-carousel">
          <IconButton aria-label="Previous executions" disabled={start === 0} onClick={() => setStart((current) => Math.max(0, current - 1))} sx={executionCarouselControlSx}><ChevronLeftRoundedIcon /></IconButton>
          <Box sx={executionCarouselViewportSx}>
            <Box data-testid="models-execution-carousel-track" data-carousel-start={start} data-visible-capacity={capacity} sx={executionCarouselTrackSx({ capacity, start })}>{carouselItems}</Box>
          </Box>
          <IconButton aria-label="Next executions" disabled={start >= maxStart} onClick={() => setStart((current) => Math.min(maxStart, current + 1))} sx={executionCarouselControlSx}><ChevronRightRoundedIcon /></IconButton>
        </Box> : <>
        <Box data-testid="models-execution-carousel" sx={{ display: "contents" }}>{executionCards}</Box>
        <AddModelCard onAdd={onAdd} />
      </>}
    </Box>
  );
};

export default ExecutionGallery;
