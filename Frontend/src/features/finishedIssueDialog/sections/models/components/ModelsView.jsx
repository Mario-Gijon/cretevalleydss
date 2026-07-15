import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import ScienceIcon from "@mui/icons-material/Science";
import { Pill, SectionCard, SummaryAccordionRow } from "../../../shared/components/FinishedIssueDialogPrimitives";
import ModelParamsView from "./ModelParamsView.jsx";
import ModelSpecificOutputView from "./ModelSpecificOutputView.jsx";
import { modelsEmptySx } from "../models.styles.js";

const ModelsView = ({ data, state, actions }) => {
  const isBase = data.selectedExecution?.type !== "scenario";
  const model = data.selectedExecution?.model || data.baseModel;
  return <Stack spacing={2}><SectionCard title="Models" icon={<ScienceIcon fontSize="small" />} right={!isBase ? <Button size="small" variant="outlined" color="error" onClick={actions.removeSelectedScenario} sx={{ borderColor: "rgba(255,255,255,0.16)" }}>Remove</Button> : null}><Stack spacing={1.4}>{data.status === "error" ? <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>{data.error || "This model run is not available yet."}</Typography> : null}<Divider sx={{ opacity: 0.14 }} /><SummaryAccordionRow label="Parameters" open={state.paramsOpen} onToggle={() => actions.setParamsOpen(!state.paramsOpen)} right={<Stack direction="row" spacing={1} alignItems="center"><Pill tone="secondary">Method: {model?.name || "—"}</Pill><Pill tone="info">{data.selectedExecution?.configuration?.domainType ? `Domain: ${data.selectedExecution.configuration.domainType}` : "domain: —"}</Pill><Pill tone={isBase ? "success" : "secondary"}>{isBase ? "base" : "simulation"}</Pill></Stack>}><Stack spacing={1.25}>{model ? <ModelParamsView parameters={model.parameterDefinitions || []} values={data.effectiveParameters || data.configuredParameters || {}} parameterContext={data.parameterContext} /> : <Box sx={modelsEmptySx}><Typography variant="body2" sx={{ fontWeight: 850, color: "text.secondary" }}>This simulation is not available yet.</Typography></Box>}</Stack></SummaryAccordionRow></Stack></SectionCard><ModelSpecificOutputView rawOutput={data.rawOutput} rawOutputPretty={data.rawOutputPretty} modelExecution={data.modelSpecificOutput} /></Stack>;
};

export default ModelsView;
