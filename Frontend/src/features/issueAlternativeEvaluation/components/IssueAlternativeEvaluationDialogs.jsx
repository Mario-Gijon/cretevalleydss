import { resolveAlternativeEvaluationDialog } from "../registry/alternativeEvaluation.registry.js";

/**
 * Renderiza los diálogos del flujo de evaluación de alternativas.
 *
 * El propio feature resuelve qué implementación debe usar
 * a partir de la estructura de evaluación del issue.
 *
 * @param {Object} props
 * @param {Object|null} props.selectedIssue
 * @param {boolean} props.isRatingAlternatives
 * @param {Function} props.setIsRatingAlternatives
 * @param {Function} props.setOpenIssueDialog
 * @returns {JSX.Element|null}
 */
const IssueAlternativeEvaluationDialogs = ({
  selectedIssue,
  isRatingAlternatives,
  setIsRatingAlternatives,
  setOpenIssueDialog,
}) => {
  const DialogComponent = resolveAlternativeEvaluationDialog(selectedIssue);

  if (!selectedIssue || !DialogComponent) {
    return null;
  }

  return (
    <DialogComponent
      setOpenIssueDialog={setOpenIssueDialog}
      isRatingAlternatives={isRatingAlternatives}
      setIsRatingAlternatives={setIsRatingAlternatives}
      selectedIssue={selectedIssue}
    />
  );
};

export default IssueAlternativeEvaluationDialogs;