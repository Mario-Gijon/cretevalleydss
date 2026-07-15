import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { getFinishedIssueDialogAuroraBg } from "../../../styles/finishedIssueDialog.styles.js";
import { getCompatReason, isModelCompatible } from "../../../logic/buildFinishedScenarioRuns.js";
import { buildParameterContext } from "../../../../modelParameters/logic/buildModelParameterContext.js";
import ModelsSectionParametersForm from "./ModelsSectionParametersForm.jsx";

const ModelsSectionAddDialog = ({ state, actions }) => {
  const theme = useTheme();
  const parameterContext = buildParameterContext({ model: state.selectedModel, alternatives: [], criteriaTree: [], leafCriteria: state.leafCriteria || [] });
  return <Dialog open={state.addOpen} onClose={actions.close} maxWidth="md" fullWidth PaperProps={{ elevation: 0, sx: { borderRadius: 5, bgcolor: alpha("#0B1118", 0.72), ...getFinishedIssueDialogAuroraBg(theme, 0.1), backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.10)" } }}><DialogTitle sx={{ fontWeight: 980 }}>Add model</DialogTitle><DialogContent><Stack spacing={1.4} sx={{ pt: 1 }}><TextField label="Run name (optional)" value={state.scenarioName} onChange={(event) => actions.setScenarioName(event.target.value)} size="small" fullWidth /><FormControl size="small" fullWidth><InputLabel color="info">Model</InputLabel><Select value={state.selectedModelId} label="Model" color="info" onChange={(event) => actions.setSelectedModelId(event.target.value)}>{state.availableModels.map((model) => <MenuItem key={model.id} value={model.id} disabled={!isModelCompatible(model)}>{model.name}</MenuItem>)}</Select></FormControl>{state.selectedModel && !state.selectedModelCompatible ? <Typography variant="caption" color="error">{getCompatReason(state.selectedModel) || "Selected model is not compatible with this issue scenario."}</Typography> : null}<ModelsSectionParametersForm model={state.selectedModel} values={state.scenarioParamValues} setValues={actions.setScenarioParamValues} parameterContext={parameterContext} /></Stack></DialogContent><DialogActions sx={{ px: 2.25, pb: 2 }}><Button onClick={actions.close} variant="outlined" color="warning">Cancel</Button><Button onClick={actions.submit} variant="outlined" color="secondary" disabled={state.addLoading || (state.selectedModel && !state.selectedModelCompatible)}>Add</Button></DialogActions></Dialog>;
};

export default ModelsSectionAddDialog;
