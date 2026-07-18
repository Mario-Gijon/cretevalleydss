import { Stack } from "@mui/material";

import AddModelDialog from "./AddModelDialog.jsx";
import ExecutionGallery from "./ExecutionGallery.jsx";
import RawOutputPanel from "./RawOutputPanel.jsx";
import SelectedExecutionPanel from "./SelectedExecutionPanel.jsx";
import { modelsRootSx } from "../models.styles.js";

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
};

const ModelsView = ({ data, parameterContext, addParameterContext, state, actions }) => (
  <Stack spacing={1.5} sx={modelsRootSx}>
    <ExecutionGallery
      executions={data.executions}
      formatDateTime={formatDateTime}
      onSelect={actions.selectExecution}
      onRemove={actions.removeScenario}
      onAdd={actions.openAdd}
    />
    <SelectedExecutionPanel
      execution={data.selectedExecution}
      parameterContext={parameterContext}
    />
    <RawOutputPanel rawOutput={data.selectedExecution.rawOutput} />
    <AddModelDialog
      open={state.add.addOpen}
      consensusEnabled={data.consensusEnabled}
      state={state.add}
      parameterContext={addParameterContext}
      actions={{
        close: actions.closeAdd,
        setScenarioName: actions.setScenarioName,
        setScenarioDescription: actions.setScenarioDescription,
        setSelectedModelId: actions.setSelectedModelId,
        setSelectedSourcePhase: actions.setSelectedSourcePhase,
        updateScenarioParameter: actions.updateScenarioParameter,
        submit: actions.submitAdd,
      }}
    />
  </Stack>
);

export default ModelsView;
