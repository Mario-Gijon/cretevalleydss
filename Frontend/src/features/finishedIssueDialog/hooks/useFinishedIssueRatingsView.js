import { useEffect, useMemo, useState } from "react";
import { buildEvaluationsData } from "../sections/evaluations/logic/buildEvaluationsData.js";

export const useFinishedIssueRatingsView = ({ payload }) => {
  const [selectedStage, setSelectedStage] = useState("alternativeEvaluation");
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  const [showCollective, setShowCollective] = useState(false);

  const data = useMemo(() => buildEvaluationsData({
    payload,
    selectedStage,
    selectedPhase,
    selectedExpertId,
    showCollective,
  }), [payload, selectedStage, selectedPhase, selectedExpertId, showCollective]);

  useEffect(() => {
    if (data.selectedStage !== selectedStage) setSelectedStage(data.selectedStage);
    if (data.selectedPhase !== selectedPhase) setSelectedPhase(data.selectedPhase);
    if (data.selectedExpertId !== selectedExpertId) setSelectedExpertId(data.selectedExpertId);
    if (!data.canShowCollective && showCollective) setShowCollective(false);
  }, [data, selectedStage, selectedPhase, selectedExpertId, showCollective]);

  return {
    ...data,
    setSelectedStage,
    setSelectedPhase,
    setSelectedExpertId,
    setShowCollective,
  };
};

export default useFinishedIssueRatingsView;
