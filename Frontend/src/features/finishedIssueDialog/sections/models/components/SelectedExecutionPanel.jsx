import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { Box, Stack, Typography } from "@mui/material";

import { IssueModelParametersView } from "../../../../modelParameters";
import { modelParametersViewportSx, selectedExecutionShellSx } from "../models.styles.js";

const SelectedExecutionPanel = ({ execution, parameterContext }) => (
  <Box sx={selectedExecutionShellSx}>
    <Stack direction="row" spacing={0.9} alignItems="center">
      {execution.type === "base" ? <LayersRoundedIcon sx={{ color: "secondary.light" }} /> : <ShowChartRoundedIcon sx={{ color: "secondary.light" }} />}
      <Typography component="h2" noWrap title={`${execution.name} · ${execution.modelName}`} sx={{ minWidth: 0, fontSize: { xs: 17, md: 20 }, fontWeight: 950 }}>
        Selected execution — <Box component="span" sx={{ color: "secondary.light" }}>{execution.name} · {execution.modelName}</Box>
      </Typography>
    </Stack>
    <Box sx={{ mt: 1, p: 1.15, borderRadius: 2, border: "1px solid rgba(255,255,255,0.075)", bgcolor: "rgba(3, 10, 17, 0.26)" }}>
      <Stack direction="row" spacing={0.7} alignItems="center"><TuneRoundedIcon sx={{ color: "secondary.light", fontSize: 19 }} /><Typography component="h3" sx={{ fontSize: 15, fontWeight: 950 }}>Model parameters</Typography></Stack>
      <Box sx={modelParametersViewportSx}><IssueModelParametersView parameters={execution.parameterDefinitions} values={execution.values} parameterContext={parameterContext} /></Box>
    </Box>
  </Box>
);

export default SelectedExecutionPanel;
