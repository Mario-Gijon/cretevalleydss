import { Box, Stack, ToggleButton, Typography } from "@mui/material";
import { useState } from "react";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";

import RankingList from "./RankingList.jsx";
import { comparisonRankingsGridSx, executionRankingCardSx, resultsPanelSx } from "../resultsAnalysis.styles.js";
import { normalizeRankingScores } from "../logic/normalizeRankingScores.js";

const RankingsByExecution = ({ executions }) => {
  const [normalizationEnabled, setNormalizationEnabled] = useState(false);

  return <Box sx={resultsPanelSx}>
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
      <Stack direction="row" spacing={1} alignItems="center">
        <EmojiEventsOutlinedIcon sx={{ color: "secondary.light" }} />
        <Box><Typography variant="h6" component="h2">Rankings by execution</Typography><Typography variant="caption" sx={{ color: "text.secondary" }}>Complete final ranking for each selected execution.</Typography></Box>
      </Stack>
      <ToggleButton value="normalize-values" size="small" color="secondary" selected={normalizationEnabled} onChange={() => setNormalizationEnabled((enabled) => !enabled)} aria-label="Normalize values">Normalize values</ToggleButton>
    </Stack>
    <Box sx={comparisonRankingsGridSx(executions.length)}>{executions.map((execution) => <Box key={execution.key} sx={executionRankingCardSx(execution.color)}>
      <Stack direction="row" spacing={0.8} alignItems="center">
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: execution.color, flex: "0 0 auto" }} />
        <Typography variant="body2" noWrap title={execution.fullLabel} sx={{ minWidth: 0, fontWeight: "fontWeightBold" }}>
          {execution.displayLabel}
        </Typography>
      </Stack>
      {execution.available ? <Box sx={{ mt: 0.8 }}><RankingList ranking={normalizationEnabled ? normalizeRankingScores(execution.ranking) : execution.ranking} compact /></Box> : <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>{execution.unavailableReason || "Ranking unavailable."}</Typography>}
    </Box>)}</Box>
  </Box>;
};

export default RankingsByExecution;
