import { useEffect, useMemo, useState } from "react";
import { resolveFinishedIssueEvaluationStructure } from "../utils/finishedIssueEvaluationStructure.js";
import { EVALUATION_STAGES } from "../../issueEvaluation/evaluation.constants.js";
import { getEvaluationStructureEntryForStage } from "../../issueEvaluation/evaluation.registry.js";

/**
 * Hook for managing finished issue ratings state and data extraction.
 *
 * Owns:
 * - selectedExpert state
 * - selectedCriterion state
 * - showCollective state
 * - expertList derivation from finished issue DTO
 * - criterionList derivation from finished issue DTO
 * - evaluations extraction for the Matrix
 * - collectiveEvaluations extraction for the Matrix
 * - Matrix component lookup from registry
 * - Unsupported structure state if Matrix is missing
 *
 * Does NOT own:
 * - Evaluation dialog logic (that belongs to active evaluation flow)
 * - Active/editable evaluation state (that belongs to issue.controller)
 * - Expert/criterion display in RatingsSection (selector logic belongs to RatingsSection)
 *
 * @param {Object} params - Hook parameters.
 * @param {Object|null} params.viewIssue - Active finished issue view.
 * @param {number} params.currentPhaseIndex - Current consensus phase index.
 * @param {string[]} params.leafNames - Leaf criterion names for criterion list derivation.
 * @param {Object[]} params.leafCriteria - Ordered leaf criteria for structure View context.
 * @param {boolean} params.hasSingleCriterion - Whether the issue has only one criterion.
 * @returns {Object} Ratings view model.
 */
export const useFinishedIssueRatingsView = ({
  viewIssue,
  currentPhaseIndex,
  leafNames,
  leafCriteria,
  hasSingleCriterion,
}) => {
  const [selectedExpert, setSelectedExpert] = useState("");
  const [selectedCriterion, setSelectedCriterion] = useState("");
  const [showCollective, setShowCollective] = useState(false);

  const evaluationStructure = useMemo(
    () => resolveFinishedIssueEvaluationStructure(viewIssue),
    [viewIssue]
  );

  const structureEntry = useMemo(
    () =>
      getEvaluationStructureEntryForStage({
        structureKey: evaluationStructure,
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
      }),
    [evaluationStructure]
  );

  const Matrix = structureEntry?.View ?? null;
  const unsupportedEvaluationStructure = Boolean(evaluationStructure) && !Matrix;

  const phaseRatings = useMemo(
    () => viewIssue?.expertsRatings?.[currentPhaseIndex + 1],
    [viewIssue, currentPhaseIndex]
  );

  const expertList = useMemo(
    () =>
      Object.keys(phaseRatings?.expertEvaluations || {}).sort((a, b) =>
        a.localeCompare(b)
      ),
    [phaseRatings]
  );

  const criterionList = useMemo(() => {
    return Array.isArray(leafNames) ? leafNames.filter(Boolean) : [];
  }, [leafNames]);

  const showCriterionSelector = useMemo(
    () => criterionList.length > 1 && !hasSingleCriterion,
    [criterionList, hasSingleCriterion]
  );

  useEffect(() => {
    if (!selectedExpert || !expertList.includes(selectedExpert)) {
      const newExpert = expertList[0] || "";
      setSelectedExpert(newExpert);
      setSelectedCriterion("");
    }
  }, [expertList, selectedExpert]);

  useEffect(() => {
    if (showCriterionSelector) {
      if (!selectedCriterion || !criterionList.includes(selectedCriterion)) {
        const newCriterion = criterionList[0] || "";
        setSelectedCriterion(newCriterion);
      }
    } else {
      setSelectedCriterion("");
    }
  }, [criterionList, selectedCriterion, showCriterionSelector]);

  const evaluations = useMemo(() => {
    if (!selectedExpert || !phaseRatings?.expertEvaluations?.[selectedExpert]) {
      return null;
    }

    return phaseRatings.expertEvaluations[selectedExpert] || null;
  }, [selectedExpert, phaseRatings]);

  const criteriaWeightsEvaluation = useMemo(() => {
    if (!selectedExpert || !phaseRatings) {
      return null;
    }

    const entry = phaseRatings?.criteriaWeightsEvaluationByExpert?.[selectedExpert];
    if (!entry || typeof entry !== "object") {
      return null;
    }

    return entry;
  }, [selectedExpert, phaseRatings]);

  const finalCriteriaWeights = useMemo(() => {
    const weights = viewIssue?.finalCriteriaWeights;
    if (!weights || typeof weights !== "object") {
      return null;
    }

    return weights;
  }, [viewIssue]);

  const shouldShowExpertWeights = useMemo(() => {
    if (finalCriteriaWeights?.source === "criteriaWeightingStageResult") {
      return true;
    }

    const byExpert = phaseRatings?.criteriaWeightsEvaluationByExpert;
    if (!byExpert || typeof byExpert !== "object") {
      return false;
    }

    const entries = Object.values(byExpert).filter(
      (entry) => entry && typeof entry === "object"
    );
    if (entries.length === 0) {
      return false;
    }

    return entries.some(
      (entry) =>
        typeof entry?.status === "string" && entry.status !== "notRequired"
    );
  }, [finalCriteriaWeights, phaseRatings]);

  const collectiveEvaluations = useMemo(() => {
    if (!phaseRatings || !showCollective) {
      return null;
    }

    const collective =
      (selectedExpert &&
        phaseRatings.collectiveEvaluationsLocalizedByExpert?.[selectedExpert]) ||
      phaseRatings.collectiveEvaluations;

    if (!collective) {
      return null;
    }

    return collective || null;
  }, [showCollective, selectedExpert, phaseRatings]);

  const canShowCollective = useMemo(() => {
    const sharedCollective = phaseRatings?.collectiveEvaluations;
    const localizedCollective = phaseRatings?.collectiveEvaluationsLocalizedByExpert;

    if (sharedCollective !== null && sharedCollective !== undefined) {
      if (Array.isArray(sharedCollective)) {
        return sharedCollective.length > 0;
      }
      if (typeof sharedCollective === "object") {
        return Object.keys(sharedCollective).length > 0;
      }
      return true;
    }

    if (
      localizedCollective &&
      typeof localizedCollective === "object" &&
      Object.keys(localizedCollective).length > 0
    ) {
      return true;
    }

    return false;
  }, [phaseRatings]);

  useEffect(() => {
    setShowCollective(canShowCollective);
  }, [viewIssue, currentPhaseIndex, canShowCollective]);

  return {
    evaluationStructure,
    Matrix,
    leafCriteria,
    selectedExpert,
    setSelectedExpert,
    selectedCriterion,
    setSelectedCriterion,
    expertList,
    criterionList,
    showCriterionSelector,
    showCollective,
    setShowCollective,
    canShowCollective,
    evaluations,
    criteriaWeightsEvaluation,
    finalCriteriaWeights,
    shouldShowExpertWeights,
    collectiveEvaluations,
    unsupportedEvaluationStructure,
  };
};
