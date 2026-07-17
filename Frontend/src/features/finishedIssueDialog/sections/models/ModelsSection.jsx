import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { buildParameterContext } from "../../../modelParameters/logic/buildModelParameterContext.js";
import { buildModelsParameterContextData } from "./logic/buildModelsData.js";
import { buildModelsWorkspaceData } from "./logic/buildModelsWorkspaceData.js";
import ModelsView from "./components/ModelsView.jsx";

const ModelsSection = () => {
  const { dialog, runs, models } = useFinishedIssueDialogContext();
  const data = buildModelsWorkspaceData({
    payload: dialog.payload,
    selectedExecution: runs.selectedExecution,
    executionOptions: runs.executionOptions,
  });
  const parameterContext = buildParameterContext(
    buildModelsParameterContextData({
      payload: dialog.payload,
      selectedExecution: runs.selectedExecution,
    })
  );
  const addParameterContext = buildParameterContext({
    ...buildModelsParameterContextData({
      payload: dialog.payload,
      selectedExecution: {
        model: models.addDialog.selectedModel,
      },
    }),
    model: models.addDialog.selectedModel,
  });

  return <ModelsView data={data} parameterContext={parameterContext} addParameterContext={addParameterContext} state={{ add: models.addDialog }} actions={{ selectExecution: runs.selectExecution, removeScenario: models.removeScenario, openAdd: models.addDialog.open, closeAdd: models.addDialog.close, setScenarioName: models.addDialog.setScenarioName, setSelectedModelId: models.addDialog.setSelectedModelId, setSelectedSourcePhase: models.addDialog.setSelectedSourcePhase, setScenarioParamValues: models.addDialog.setScenarioParamValues, submitAdd: models.addDialog.submit }} />;
};

export default ModelsSection;
