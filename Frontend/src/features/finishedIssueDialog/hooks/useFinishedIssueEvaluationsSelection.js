import { useEffect, useMemo, useState } from "react";

import { resolveEvaluationsSelection } from "../sections/evaluations";

export const useFinishedIssueEvaluationsSelection = ({ payload }) => {
  const [selectedStage, setSelectedStage] = useState("alternativeEvaluation");
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  const [showCollective, setShowCollective] = useState(false);
  const selection = useMemo(() => resolveEvaluationsSelection({
    payload,
    selectedStage,
    selectedPhase,
    selectedExpertId,
    showCollective,
  }), [payload, selectedStage, selectedPhase, selectedExpertId, showCollective]);

  useEffect(() => {
    if (selection.selectedStage !== selectedStage) setSelectedStage(selection.selectedStage);
    if (selection.selectedPhase !== selectedPhase) setSelectedPhase(selection.selectedPhase);
    if (selection.selectedExpertId !== selectedExpertId) setSelectedExpertId(selection.selectedExpertId);
    if (!selection.canShowCollective && showCollective) setShowCollective(false);
  }, [selectedExpertId, selectedPhase, selectedStage, selection, showCollective]);

  return {
    selectedStage,
    selectedPhase,
    selectedExpertId,
    showCollective,
    setSelectedStage,
    setSelectedPhase,
    setSelectedExpertId,
    setShowCollective,
  };
};

export default useFinishedIssueEvaluationsSelection;
