import { Box, Stack, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";

import { developmentNoticeSx } from "../resultsAnalysis.styles.js";

const ResultsDevelopmentNotice = () => <Box sx={developmentNoticeSx}>
  <Stack direction="row" spacing={1.2} alignItems="center"><Box sx={{ width: 42, height: 42, borderRadius: "50%", display: "grid", placeItems: "center", color: "secondary.light", border: "1px solid rgba(39,213,228,0.35)", bgcolor: "rgba(39,213,228,0.09)" }}><InfoOutlinedIcon /></Box><Box><Typography variant="subtitle2">Results analysis is under active development.</Typography><Typography variant="caption" sx={{ color: "text.secondary" }}>Additional insights and visualizations will be added as the analysis contract evolves.</Typography></Box></Stack>
  <QueryStatsRoundedIcon sx={{ ml: "auto", display: { xs: "none", sm: "block" }, color: "rgba(39,213,228,0.35)", fontSize: 64 }} />
</Box>;

export default ResultsDevelopmentNotice;
