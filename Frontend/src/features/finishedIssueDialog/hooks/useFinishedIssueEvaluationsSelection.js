import { useEffect, useMemo, useState } from "react";

import { resolveEvaluationsWorkspaceSelection } from "../sections/evaluations";

export const useFinishedIssueEvaluationsSelection = ({ payload }) => {
  const [selectedConsensusPhase, setSelectedConsensusPhase] = useState(null);
  const [selectedCriteriaExpertId, setSelectedCriteriaExpertId] = useState(null);
  const [selectedAlternativeExpertId, setSelectedAlternativeExpertId] =
    useState(null);
  const [showCollective, setShowCollective] = useState(false);

  const selection = useMemo(
    () =>
      resolveEvaluationsWorkspaceSelection({
        payload,
        selectedConsensusPhase,
        selectedCriteriaExpertId,
        selectedAlternativeExpertId,
        showCollective,
      }),
    [
      payload,
      selectedAlternativeExpertId,
      selectedConsensusPhase,
      selectedCriteriaExpertId,
      showCollective,
    ]
  );

  useEffect(() => {
    if (selection.selectedConsensusPhase !== selectedConsensusPhase) {
      setSelectedConsensusPhase(selection.selectedConsensusPhase);
    }
    if (selection.selectedCriteriaExpertId !== selectedCriteriaExpertId) {
      setSelectedCriteriaExpertId(selection.selectedCriteriaExpertId);
    }
    if (selection.selectedAlternativeExpertId !== selectedAlternativeExpertId) {
      setSelectedAlternativeExpertId(selection.selectedAlternativeExpertId);
    }
    if (!selection.canShowCollective && showCollective) {
      setShowCollective(false);
    }
  }, [
    selectedAlternativeExpertId,
    selectedConsensusPhase,
    selectedCriteriaExpertId,
    selection,
    showCollective,
  ]);

  return {
    selectedConsensusPhase,
    selectedCriteriaExpertId,
    selectedAlternativeExpertId,
    showCollective,

    setSelectedConsensusPhase,
    setSelectedCriteriaExpertId,
    setSelectedAlternativeExpertId,
    setShowCollective,
  };
};

export default useFinishedIssueEvaluationsSelection;
