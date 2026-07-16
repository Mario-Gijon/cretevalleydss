import { useEffect, useMemo, useState } from "react";

import { resolveEvaluationsWorkspaceSelection } from "../sections/evaluations";

export const useFinishedIssueEvaluationsSelection = ({ payload }) => {
  const [selectedConsensusPhase, setSelectedConsensusPhase] = useState(null);
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  const [showCollective, setShowCollective] = useState(false);

  const selection = useMemo(
    () =>
      resolveEvaluationsWorkspaceSelection({
        payload,
        selectedConsensusPhase,
        selectedExpertId,
        showCollective,
      }),
    [
      payload,
      selectedConsensusPhase,
      selectedExpertId,
      showCollective,
    ]
  );

  useEffect(() => {
    if (selection.selectedConsensusPhase !== selectedConsensusPhase) {
      setSelectedConsensusPhase(selection.selectedConsensusPhase);
    }
    if (selection.selectedExpertId !== selectedExpertId) {
      setSelectedExpertId(selection.selectedExpertId);
    }
    if (!selection.canShowCollective && showCollective) {
      setShowCollective(false);
    }
  }, [
    selectedConsensusPhase,
    selectedExpertId,
    selection,
    showCollective,
  ]);

  return {
    selectedConsensusPhase,
    selectedExpertId,
    showCollective,

    setSelectedConsensusPhase,
    setSelectedExpertId,
    setShowCollective,
  };
};

export default useFinishedIssueEvaluationsSelection;
