import { Box, Chip, Stack, Typography } from "@mui/material";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";

import RankingList from "./RankingList.jsx";
import { resultsPanelSx } from "../resultsAnalysis.styles.js";

const FinalRankingPanel = ({ ranking }) => <Box sx={resultsPanelSx}>
  <Stack direction="row" justifyContent="space-between" spacing={1}>
    <Stack direction="row" spacing={1} alignItems="center"><EmojiEventsOutlinedIcon sx={{ color: "secondary.light" }} /><Box><Typography variant="h6" component="h2">Final ranking</Typography><Typography variant="caption" sx={{ color: "text.secondary" }}>Alternatives ranked by performance with original scores.</Typography></Box></Stack>
    <Chip size="small" color="secondary" variant="outlined" label={`${ranking.length} alternatives`} />
  </Stack>
  <Box sx={{ mt: 1.2 }}><RankingList ranking={ranking} showDescriptions /></Box>
</Box>;

export default FinalRankingPanel;
