import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import ModelsSectionAddDialog from "../sections/models/components/ModelsSectionAddDialog.jsx";

const FinishedIssueAddModelHost = () => {
  const { models } = useFinishedIssueDialogContext();
  return <ModelsSectionAddDialog state={models.addDialog} actions={{ close: models.addDialog.close, setScenarioName: models.addDialog.setScenarioName, setSelectedModelId: models.addDialog.setSelectedModelId, setScenarioParamValues: models.addDialog.setScenarioParamValues, submit: models.addDialog.submit }} />;
};

export default FinishedIssueAddModelHost;
