import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";

import { ParameterFieldHost } from "../../../../modelParameters";
import { getScenarioParameterDefinitions } from "../../../logic/buildFinishedScenarioParameters.js";
import { getCompatReason, isModelCompatible } from "../../../logic/buildFinishedScenarioRuns.js";

const DESCRIPTION_MAX = 320;

const AddModelDialog = ({ open, consensusEnabled, state, parameterContext, actions }) => {
  const parameters = getScenarioParameterDefinitions(state.selectedModel);
  const descriptionLength = state.scenarioDescription?.length || 0;

  return <Dialog open={open} onClose={actions.close} fullWidth maxWidth="md" PaperProps={{ sx: { opacity: 1, borderRadius: 3, border: "1px solid rgba(83, 198, 214, 0.22)", backgroundColor: "#07131f", backgroundImage: "linear-gradient(145deg, #0a1d2a 0%, #07131f 45%, #06101a 100%)" } }}>
    <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5, fontWeight: 950 }}>Add model</DialogTitle>
    <DialogContent sx={{ px: 3, pt: "12px !important" }}><Stack spacing={1.3} sx={{ pt: 0.75 }}>
      <TextField color="secondary" label="Scenario name" required fullWidth value={state.scenarioName} onChange={(event) => actions.setScenarioName(event.target.value)} />
      <TextField color="secondary" label="Scenario description" required fullWidth multiline minRows={3} value={state.scenarioDescription} inputProps={{ maxLength: DESCRIPTION_MAX }} helperText={`${descriptionLength}/${DESCRIPTION_MAX}`} onChange={(event) => actions.setScenarioDescription(event.target.value)} />
      <FormControl color="secondary" fullWidth><InputLabel id="models-dialog-model-label">Model</InputLabel><Select color="secondary" labelId="models-dialog-model-label" label="Model" value={state.selectedModelId} onChange={(event) => actions.setSelectedModelId(event.target.value)}>
        {state.availableModels.map((model) => { const compatible = isModelCompatible(model); const reason = getCompatReason(model) || "Disabled"; return <MenuItem key={model.id} value={model.id} disabled={!compatible} title={compatible ? undefined : reason}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ width: "100%", minWidth: 0 }}><Typography noWrap sx={{ minWidth: 0, flex: 1 }}>{model.name}</Typography><Chip size="small" color={compatible ? "success" : "error"} variant="outlined" label={compatible ? "Enabled" : "Disabled"} /></Stack>
        </MenuItem>; })}
      </Select></FormControl>
      {state.selectedModel && !state.selectedModelCompatible ? <Typography color="error" variant="caption">{getCompatReason(state.selectedModel) || "Selected model is not compatible with this issue scenario."}</Typography> : null}
      {consensusEnabled ? <FormControl color="secondary" fullWidth><InputLabel id="models-dialog-phase-label">Source phase</InputLabel><Select color="secondary" labelId="models-dialog-phase-label" label="Source phase" value={state.selectedSourcePhase ?? ""} onChange={(event) => actions.setSelectedSourcePhase(Number(event.target.value))}>{state.sourcePhases.map((phase) => <MenuItem key={phase} value={phase}>Phase {phase}</MenuItem>)}</Select></FormControl> : null}
      <Box sx={(theme) => ({
        "& .MuiInputLabel-root.Mui-focused:not(.Mui-error)": { color: theme.palette.secondary.main },
        "& .MuiOutlinedInput-root.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.secondary.main },
        "& .MuiInput-underline:not(.Mui-disabled):after, & .MuiFilledInput-underline:not(.Mui-disabled):after": { borderBottomColor: theme.palette.secondary.main },
        "& .MuiSelect-icon:not(.Mui-disabled)": { color: theme.palette.secondary.main },
        "& .MuiSlider-root:not(.Mui-disabled), & .MuiCheckbox-root:not(.Mui-disabled), & .MuiRadio-root:not(.Mui-disabled), & .MuiSwitch-switchBase:not(.Mui-disabled).Mui-checked": { color: theme.palette.secondary.main },
      })}>
        <Stack spacing={0.8}><Typography sx={{ fontSize: 14, fontWeight: 950 }}>Model parameters</Typography>{state.selectedModel ? parameters.length ? parameters.map((parameter) => <ParameterFieldHost key={parameter.key} parameter={parameter} value={state.scenarioParamValues?.[parameter.key]} onChange={(value) => actions.setScenarioParamValues((current) => ({ ...(current || {}), [parameter.key]: value }))} parameterContext={parameterContext} disabled={false} />) : <Typography color="text.secondary">This model has no parameters.</Typography> : <Typography color="text.secondary">Select an enabled model to load its registered parameters.</Typography>}</Stack>
      </Box>
    </Stack></DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5 }}><Button variant="outlined" onClick={actions.close}>Cancel</Button><Button variant="outlined" color="secondary" onClick={actions.submit} disabled={state.addLoading || !state.scenarioName?.trim() || !state.scenarioDescription?.trim() || descriptionLength > DESCRIPTION_MAX || !state.selectedModelCompatible}>Add model</Button></DialogActions>
  </Dialog>;
};

export default AddModelDialog;
