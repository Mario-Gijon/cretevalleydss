import { Dialog, DialogContent, DialogTitle, Stack } from "@mui/material";

import { getScenarioParameterDefinitions } from "../../../logic/buildFinishedScenarioParameters.js";
import {
  buildAddModelOptions,
  buildAddModelSubmitState,
} from "../logic/addModelDialog.js";
import {
  addModelDialogContentSx,
  addModelDialogFieldsSx,
  addModelDialogPaperSx,
  addModelDialogTitleSx,
} from "../addModelDialog.styles.js";
import AddModelDialogActions from "./addModelDialog/AddModelDialogActions.jsx";
import ModelParametersFields from "./addModelDialog/ModelParametersFields.jsx";
import ModelSelectionField from "./addModelDialog/ModelSelectionField.jsx";
import ScenarioDetailsFields from "./addModelDialog/ScenarioDetailsFields.jsx";

const AddModelDialog = ({ open, state, parameterContext, actions }) => {
  const parameters = getScenarioParameterDefinitions(state.selectedModel);
  const modelOptions = buildAddModelOptions(state.availableModels);
  const selectedModelOption = modelOptions.find(
    (option) => option.id === state.selectedModelId
  );
  const submitState = buildAddModelSubmitState(state);

  return (
    <Dialog
      open={open}
      onClose={actions.close}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: addModelDialogPaperSx }}
    >
      <DialogTitle sx={addModelDialogTitleSx}>Add model</DialogTitle>
      <DialogContent sx={addModelDialogContentSx}>
        <Stack spacing={1.3} sx={addModelDialogFieldsSx}>
          <ScenarioDetailsFields
            descriptionLength={submitState.descriptionLength}
            scenarioDescription={state.scenarioDescription}
            scenarioName={state.scenarioName}
            onDescriptionChange={actions.setScenarioDescription}
            onNameChange={actions.setScenarioName}
          />
          <ModelSelectionField
            modelOptions={modelOptions}
            selectedModel={state.selectedModel}
            selectedModelCompatible={state.selectedModelCompatible}
            selectedModelId={state.selectedModelId}
            selectedModelReason={selectedModelOption?.reason}
            onChange={actions.setSelectedModelId}
          />
          <ModelParametersFields
            parameterContext={parameterContext}
            parameters={parameters}
            selectedModel={state.selectedModel}
            values={state.scenarioParamValues}
            onParameterChange={actions.updateScenarioParameter}
          />
        </Stack>
      </DialogContent>
      <AddModelDialogActions
        submitDisabled={submitState.disabled}
        onClose={actions.close}
        onSubmit={actions.submit}
      />
    </Dialog>
  );
};

export default AddModelDialog;
