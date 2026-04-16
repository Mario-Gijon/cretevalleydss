import { resolveWeightEvaluationDialog } from "../registry/weightEvaluation.registry.js";

/**
 * Renderiza los diálogos del flujo de evaluación de pesos.
 *
 * @param {Object} props
 * @param {Object|null} props.selectedIssue
 * @param {boolean} props.isRatingWeights
 * @param {Function} props.setIsRatingWeights
 * @param {Function} props.handleCloseIssueDialog
 * @returns {JSX.Element|null}
 */
const IssueWeightEvaluationDialogs = ({
  selectedIssue,
  isRatingWeights,
  setIsRatingWeights,
  handleCloseIssueDialog,
}) => {
  const DialogComponent = resolveWeightEvaluationDialog(selectedIssue);

  if (!selectedIssue || !DialogComponent) {
    return null;
  }

  return (
    <DialogComponent
      isRatingWeights={isRatingWeights}
      setIsRatingWeights={setIsRatingWeights}
      selectedIssue={selectedIssue}
      handleCloseIssueDialog={handleCloseIssueDialog}
    />
  );
};

export default IssueWeightEvaluationDialogs;