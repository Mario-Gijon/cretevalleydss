import { Box, Stack, Typography } from "@mui/material";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";

import RankingList from "./RankingList.jsx";
import { comparisonRankingsGridSx, executionRankingCardSx, resultsPanelSx } from "../resultsAnalysis.styles.js";

const RankingsByExecution = ({ executions }) => <Box sx={resultsPanelSx}>
  <Stack direction="row" spacing={1} alignItems="center"><EmojiEventsOutlinedIcon sx={{ color: "secondary.light" }} /><Box><Typography component="h2" sx={{ fontSize: 18, fontWeight: 950 }}>Rankings by execution</Typography><Typography sx={{ color: "text.secondary", fontSize: 11.5 }}>Complete final ranking and original scores for each selected execution.</Typography></Box></Stack>
  <Box sx={comparisonRankingsGridSx(executions.length)}>{executions.map((execution) => <Box key={execution.key} sx={executionRankingCardSx(execution.color)}>
    <Stack direction="row" spacing={0.8} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: execution.color, flex: "0 0 auto" }} /><Typography noWrap title={execution.displayLabel} sx={{ minWidth: 0, fontSize: 13.5, fontWeight: 950 }}>{execution.displayLabel}</Typography></Stack>
    {execution.available ? <Box sx={{ mt: 0.8 }}><RankingList ranking={execution.ranking} compact /></Box> : <Typography sx={{ mt: 1, color: "text.secondary", fontSize: 12 }}>{execution.unavailableReason || "Ranking unavailable."}</Typography>}
  </Box>)}</Box>
</Box>;

export default RankingsByExecution;
