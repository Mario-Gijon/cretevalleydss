import { useMemo } from "react";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { buildParameterContext } from "../../../modelParameters/logic/buildModelParameterContext.js";
import { buildModelsData } from "./logic/buildModelsData.js";
import ModelsView from "./components/ModelsView.jsx";

const stringify = (value) => { try { return value === null || value === undefined ? "" : JSON.stringify(value, null, 2); } catch { return String(value); } };

const ModelsSection = () => {
  const { dialog, runs, models } = useFinishedIssueDialogContext();
  const data = useMemo(() => {
    const modelData = buildModelsData({ payload: dialog.payload, selectedExecution: runs.selectedExecution });
    const leafCriteria = (dialog.payload?.criteria?.nodes || []).filter((criterion) => criterion?.isLeaf).map((criterion) => ({ id: criterion.id, name: criterion.name }));
    const context = buildParameterContext({ model: modelData.selectedExecution?.model || modelData.baseModel, criteriaTree: [], leafCriteria, alternatives: [] });
    return { ...modelData, parameterContext: context, rawOutputPretty: stringify(modelData.rawOutput) };
  }, [dialog.payload, runs.selectedExecution]);
  return <ModelsView data={data} state={{ paramsOpen: models.paramsOpen }} actions={{ setParamsOpen: models.setParamsOpen, removeSelectedScenario: models.removeSelectedScenario }} />;
};

export default ModelsSection;
