import { useEffect, useMemo, useState } from "react";
import DirectEvaluationMatrix from "../../issueEvaluation/structures/alternativeCriteriaMatrix/DirectEvaluationMatrix.jsx";
import PairwiseAlternativeMatrix from "../../issueEvaluation/structures/alternativePairwiseByCriterion/PairwiseAlternativeMatrix.jsx";
import { resolveFinishedIssueEvaluationStructure } from "../utils/finishedIssueEvaluationStructure.js";
import { EVALUATION_STRUCTURE_KEYS } from "../../issueEvaluation/evaluation.constants.js";

const MATRIX_BY_STRUCTURE_KEY = Object.freeze({
  [EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_CRITERIA_MATRIX]: DirectEvaluationMatrix,
  [EVALUATION_STRUCTURE_KEYS.ALTERNATIVE_PAIRWISE_BY_CRITERION]:
    PairwiseAlternativeMatrix,
});

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
 * @param {boolean} params.hasSingleCriterion - Whether the issue has only one criterion.
 * @returns {Object} Ratings view model.
 */
export const useFinishedIssueRatingsView = ({
  viewIssue,
  currentPhaseIndex,
  leafNames,
  hasSingleCriterion,
}) => {
  const [selectedExpert, setSelectedExpert] = useState("");
  const [selectedCriterion, setSelectedCriterion] = useState("");
  const [showCollective, setShowCollective] = useState(false);

  const evaluationStructure = useMemo(
    () => resolveFinishedIssueEvaluationStructure(viewIssue),
    [viewIssue]
  );

  const Matrix = MATRIX_BY_STRUCTURE_KEY[evaluationStructure] || null;
  const unsupportedEvaluationStructure = !Matrix;

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
    if (!selectedExpert || !phaseRatings?.expertEvaluations?.[selectedExpert]) {
      return [];
    }

    const selected = phaseRatings.expertEvaluations[selectedExpert];

    if (!selected || Array.isArray(selected) || typeof selected !== "object") {
      return [];
    }

    if (Array.isArray(leafNames) && leafNames.length) {
      return leafNames.filter((name) => Array.isArray(selected[name]));
    }

    return Object.keys(selected).filter((key) => Array.isArray(selected[key]));
  }, [selectedExpert, phaseRatings, leafNames]);

  const showCriterionSelector = useMemo(
    () => criterionList.length > 1 && !hasSingleCriterion,
    [criterionList, hasSingleCriterion]
  );

  const activeCriterion = useMemo(
    () => selectedCriterion || criterionList[0] || "",
    [selectedCriterion, criterionList]
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

    const selected = phaseRatings.expertEvaluations[selectedExpert];

    if (
      activeCriterion &&
      selected &&
      typeof selected === "object" &&
      !Array.isArray(selected) &&
      Array.isArray(selected[activeCriterion])
    ) {
      return selected[activeCriterion] || null;
    }

    return selected || null;
  }, [selectedExpert, activeCriterion, phaseRatings]);

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

    if (
      activeCriterion &&
      typeof collective === "object" &&
      !Array.isArray(collective) &&
      Array.isArray(collective[activeCriterion])
    ) {
      return collective[activeCriterion] || null;
    }

    return collective || null;
  }, [showCollective, selectedExpert, activeCriterion, phaseRatings]);

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
    collectiveEvaluations,
    unsupportedEvaluationStructure,
  };
};
