import { useEffect, useMemo, useState } from "react";

import { resolveEvaluationsWorkspaceSelection } from "../sections/evaluations";

export const useFinishedIssueEvaluationsSelection = ({ payload, selectedPhase }) => {
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  const [showCollective, setShowCollective] = useState(false);

  const selection = useMemo(
    () =>
      resolveEvaluationsWorkspaceSelection({
        payload,
        selectedPhase,
        selectedExpertId,
        showCollective,
      }),
    [
      payload,
      selectedPhase,
      selectedExpertId,
      showCollective,
    ]
  );

  useEffect(() => {
    if (selection.selectedExpertId !== selectedExpertId) {
      setSelectedExpertId(selection.selectedExpertId);
    }
    if (!selection.canShowCollective && showCollective) {
      setShowCollective(false);
    }
  }, [
    selectedExpertId,
    selection,
    showCollective,
  ]);

  return {
    selectedExpertId,
    showCollective,

    setSelectedExpertId,
    setShowCollective,
  };
};

export default useFinishedIssueEvaluationsSelection;
