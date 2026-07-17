import { Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { IssueModelParametersView, ParameterFieldHost } from "../../../../modelParameters";
import { getScenarioParameterDefinitions } from "../../../logic/buildFinishedScenarioParameters.js";
import { getCompatReason, isModelCompatible } from "../../../logic/buildFinishedScenarioRuns.js";
import ExecutionCarousel from "./ExecutionCarousel.jsx";
import RawOutputPanel from "./RawOutputPanel.jsx";
import { inlineAddModelSx, modelInnerPanelSx, modelParametersViewportSx, modelsRootSx, selectedExecutionGridSx, selectedExecutionShellSx } from "../models.styles.js";

const InfoRow = ({ label, value }) => <Stack direction="row" justifyContent="space-between" spacing={2}><Typography sx={{ color: "text.secondary", fontSize: 11.5, fontWeight: 700 }}>{label}</Typography><Typography noWrap title={String(value ?? "—")} sx={{ minWidth: 0, fontSize: 11.8, fontWeight: 850, textAlign: "right" }}>{value ?? "—"}</Typography></Stack>;

const InlineAddModelPanel = ({ consensusEnabled, state, parameterContext, actions }) => {
  if (!state.addOpen) return null;
  const parameters = getScenarioParameterDefinitions(state.selectedModel);

  return <Box sx={inlineAddModelSx} data-testid="models-inline-add-panel">
    <Stack direction="row" spacing={0.8} alignItems="center"><AddCircleOutlineRoundedIcon sx={{ color: "secondary.light" }} /><Box><Typography component="h2" sx={{ fontSize: 16, fontWeight: 950 }}>Add model</Typography><Typography sx={{ color: "text.secondary", fontSize: 11 }}>Create a new scenario. Existing scenarios are not edited.</Typography></Box></Stack>
    <Box sx={{ mt: 1.4, display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: consensusEnabled ? "minmax(0, 1fr) minmax(0, 1fr) minmax(180px, 0.65fr)" : "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 1 }}>
      <TextField label="Scenario name" value={state.scenarioName} onChange={(event) => actions.setScenarioName(event.target.value)} size="small" required fullWidth />
      <FormControl size="small" fullWidth><InputLabel id="models-add-model-label">Model</InputLabel><Select labelId="models-add-model-label" value={state.selectedModelId} label="Model" onChange={(event) => actions.setSelectedModelId(event.target.value)}>{state.availableModels.map((model) => { const compatible = isModelCompatible(model); return <MenuItem key={model.id} value={model.id} disabled={!compatible}><Box sx={{ display: "flex", width: "100%", alignItems: "center", gap: 1 }}><Box sx={{ display: "grid", color: compatible ? "success.main" : "error.main" }}>{compatible ? <CheckCircleRoundedIcon fontSize="small" /> : <CancelRoundedIcon fontSize="small" />}</Box><Box sx={{ minWidth: 0, flex: 1 }}><Typography noWrap>{model.name}</Typography>{!compatible ? <Typography noWrap color="error" variant="caption">{getCompatReason(model) || "Disabled"}</Typography> : null}</Box><Chip size="small" color={compatible ? "success" : "error"} variant="outlined" label={compatible ? "Enabled" : "Disabled"} sx={{ height: 22, fontSize: 9.5, fontWeight: 850 }} /></Box></MenuItem>; })}</Select></FormControl>
      {consensusEnabled ? <FormControl size="small" fullWidth><InputLabel id="models-source-phase-label">Source phase</InputLabel><Select labelId="models-source-phase-label" value={state.selectedSourcePhase ?? ""} label="Source phase" onChange={(event) => actions.setSelectedSourcePhase(Number(event.target.value))}>{state.sourcePhases.map((phase) => <MenuItem key={phase} value={phase}>Phase {phase}</MenuItem>)}</Select></FormControl> : null}
    </Box>
    {state.selectedModel && !state.selectedModelCompatible ? <Typography variant="caption" color="error" sx={{ mt: 0.8, display: "block" }}>{getCompatReason(state.selectedModel) || "Selected model is not compatible with this issue scenario."}</Typography> : null}
    <Box sx={{ mt: 1.25 }}><Typography sx={{ fontSize: 13, fontWeight: 900 }}>Model parameters</Typography><Typography sx={{ color: "text.secondary", fontSize: 10.8 }}>Fields are supplied by the registered parameter definitions.</Typography><Box sx={{ ...modelParametersViewportSx, mt: 0.8 }}>{state.selectedModel ? parameters.length ? <Stack spacing={1.4}>{parameters.map((parameter) => <ParameterFieldHost key={parameter.key} parameter={parameter} value={state.scenarioParamValues?.[parameter.key]} onChange={(value) => actions.setScenarioParamValues((current) => ({ ...(current || {}), [parameter.key]: value }))} parameterContext={parameterContext} disabled={false} />)}</Stack> : <Typography color="text.secondary" sx={{ fontSize: 12 }}>This model has no parameters.</Typography> : <Typography color="text.secondary" sx={{ fontSize: 12 }}>Select an enabled model to load its registered parameters.</Typography>}</Box></Box>
    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.25 }}><Button variant="outlined" onClick={actions.close}>Cancel</Button><Button variant="outlined" color="secondary" onClick={actions.submit} disabled={state.addLoading || !state.scenarioName?.trim() || !state.selectedModelCompatible}>Add model</Button></Stack>
  </Box>;
};

const SelectedExecutionPanel = ({ data, parameterContext }) => {
  const execution = data.selectedExecution;
  const isBase = execution.type === "base";
  return <Box sx={selectedExecutionShellSx}><Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 1.25 }}>{isBase ? <LayersRoundedIcon sx={{ color: "secondary.light" }} /> : <ScienceRoundedIcon sx={{ color: "secondary.light" }} />}<Box sx={{ minWidth: 0 }}><Typography sx={{ color: "text.secondary", fontSize: 10.5, fontWeight: 800 }}>Selected execution</Typography><Typography noWrap title={`${execution.label} · ${execution.model?.name || "—"}`} sx={{ fontSize: 18, fontWeight: 950 }}>{execution.label} · {execution.model?.name || "—"}</Typography></Box></Stack>
    {execution.error ? <Typography color="error" sx={{ mb: 1, fontSize: 12.5 }}>{execution.error}</Typography> : null}
    <Box sx={selectedExecutionGridSx}><Box sx={modelInnerPanelSx}><Stack direction="row" spacing={0.7} alignItems="center" sx={{ mb: 1 }}><InfoOutlinedIcon sx={{ color: "secondary.light", fontSize: 19 }} /><Typography component="h3" sx={{ fontSize: 15, fontWeight: 950 }}>Model information</Typography></Stack><Stack spacing={0.8}><InfoRow label="Model" value={execution.model?.name} /><InfoRow label="Type" value={isBase ? "Base execution" : "Scenario"} /><InfoRow label="Status" value={execution.status} />{data.consensusEnabled ? <InfoRow label="Source phase" value={Number.isInteger(execution.sourcePhase) ? `Phase ${execution.sourcePhase}` : "—"} /> : null}<InfoRow label="Created" value={execution.createdAt} /></Stack>{execution.modelDescription ? <Typography sx={{ mt: 1.2, color: "text.secondary", fontSize: 11.3, lineHeight: 1.45 }}>{execution.modelDescription}</Typography> : null}</Box>
      <Box sx={modelInnerPanelSx}><Stack direction="row" spacing={0.7} alignItems="center"><TuneRoundedIcon sx={{ color: "secondary.light", fontSize: 19 }} /><Box><Typography component="h3" sx={{ fontSize: 15, fontWeight: 950 }}>Model parameters</Typography><Typography sx={{ color: "text.secondary", fontSize: 10.8 }}>Rendered by the registered parameter views.</Typography></Box></Stack><Box sx={modelParametersViewportSx}><IssueModelParametersView parameters={execution.parameterDefinitions} values={execution.effectiveParameters || execution.configuredParameters} parameterContext={parameterContext} /></Box></Box>
    </Box>
  </Box>;
};

const ModelsView = ({ data, parameterContext, addParameterContext, state, actions }) => <Stack spacing={1.5} sx={modelsRootSx}>
  <ExecutionCarousel executions={data.executions} onSelect={actions.selectExecution} onRemove={actions.removeScenario} onAdd={actions.openAdd} />
  <SelectedExecutionPanel data={data} parameterContext={parameterContext} />
  <RawOutputPanel rawOutput={data.selectedExecution.rawOutput} />
  <InlineAddModelPanel consensusEnabled={data.consensusEnabled} state={state.add} parameterContext={addParameterContext} actions={{ close: actions.closeAdd, setScenarioName: actions.setScenarioName, setSelectedModelId: actions.setSelectedModelId, setSelectedSourcePhase: actions.setSelectedSourcePhase, setScenarioParamValues: actions.setScenarioParamValues, submit: actions.submitAdd }} />
</Stack>;

export default ModelsView;
