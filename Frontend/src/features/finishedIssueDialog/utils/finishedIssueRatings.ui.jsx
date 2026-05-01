import PairwiseAlternativeMatrix from "../../issueAlternativeEvaluation/components/pairwise/PairwiseAlternativeMatrix";
import DirectEvaluationMatrix from "../../issueAlternativeEvaluation/components/direct/DirectEvaluationMatrix";
import { extractLeafCriteria } from "../../issueAlternativeEvaluation/utils/leafCriteria.utils";
import { ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES } from "../../issueAlternativeEvaluation/utils/evaluationStructure";

const FINISHED_ISSUE_RATINGS_UI = {
  [ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES.DIRECT]: {
    getExpertList: ({ viewIssue, currentPhaseIndex }) =>
      Object.keys(
        viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations || {}
      ),

    getCriterionList: () => [],

    getEvaluations: ({ viewIssue, currentPhaseIndex, selectedExpert }) =>
      viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[
        selectedExpert
      ] || {},

    getCollectiveEvaluations: ({
      viewIssue,
      currentPhaseIndex,
      showCollective,
      selectedExpert,
    }) =>
      showCollective
        ? viewIssue?.expertsRatings?.[currentPhaseIndex + 1]
            ?.collectiveEvaluationsLocalizedByExpert?.[selectedExpert] ||
          viewIssue?.expertsRatings?.[currentPhaseIndex + 1]
            ?.collectiveEvaluations || {}
        : {},

    showCriterionSelector: () => false,

    render: ({ viewIssue, evaluations, collectiveEvaluations }) => (
      <DirectEvaluationMatrix
        alternatives={viewIssue?.summary?.alternatives || []}
        criteria={extractLeafCriteria(viewIssue?.summary?.criteria || []).map(
          (criterion) => criterion.name
        )}
        evaluations={evaluations}
        collectiveEvaluations={collectiveEvaluations}
        permitEdit={false}
      />
    ),
  },

  [ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES]: {
    getExpertList: ({ viewIssue, currentPhaseIndex }) =>
      Object.keys(
        viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations || {}
      ),

    getCriterionList: ({ viewIssue, currentPhaseIndex, selectedExpert }) =>
      Object.keys(
        viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[
          selectedExpert
        ] || {}
      ),

    getEvaluations: ({
      viewIssue,
      currentPhaseIndex,
      selectedExpert,
      selectedCriterion,
    }) =>
      viewIssue?.expertsRatings?.[currentPhaseIndex + 1]?.expertEvaluations?.[
        selectedExpert
      ]?.[selectedCriterion] || [],

    getCollectiveEvaluations: ({
      viewIssue,
      currentPhaseIndex,
      selectedCriterion,
      showCollective,
    }) =>
      showCollective
        ? viewIssue?.expertsRatings?.[currentPhaseIndex + 1]
            ?.collectiveEvaluations?.[selectedCriterion] || []
        : [],

    showCriterionSelector: ({ hasSingleCriterion, criterionList }) =>
      !hasSingleCriterion && criterionList.length > 0,

    render: ({ viewIssue, evaluations, collectiveEvaluations }) => (
      <PairwiseAlternativeMatrix
        alternatives={viewIssue?.summary?.alternatives || []}
        evaluations={evaluations}
        collectiveEvaluations={collectiveEvaluations}
        permitEdit={false}
      />
    ),
  },
};

/**
 * Devuelve el adaptador de UI de ratings segun estructura de evaluacion.
 *
 * @param {string} evaluationStructure Estructura de evaluacion del issue.
 * @returns {Object}
 */
export const getFinishedIssueRatingsUi = (evaluationStructure) =>
  FINISHED_ISSUE_RATINGS_UI[evaluationStructure] ||
  FINISHED_ISSUE_RATINGS_UI[ISSUE_ALTERNATIVE_EVALUATION_STRUCTURES.DIRECT];
