import { getEvaluationStructureEntryForStage } from "../../../decisionPlugins/evaluations/evaluationStructureRegistry";
import { EVALUATION_STAGES } from "../../../decisionPlugins/evaluations/evaluationStages";

export const pickInitialAdminIssueExpertId = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return "";

  const acceptedCurrent = rows.find(
    (row) => row?.currentParticipant && row?.invitationStatus === "accepted"
  );
  if (acceptedCurrent?.expert?.id) return acceptedCurrent.expert.id;

  const current = rows.find((row) => row?.currentParticipant);
  if (current?.expert?.id) return current.expert.id;

  return rows[0]?.expert?.id || "";
};

export const hasVisibleAdminIssueCollectivePayload = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return value != null;
};

export const buildAdminIssueDetailView = ({
  issueDetail,
  expertEvaluations,
  expertWeights,
}) => {
  const criteriaWeightingStructureEntry = getEvaluationStructureEntryForStage({
    structureKey: issueDetail?.criteriaWeightingStructureKey,
    stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  });
  const alternativeEvaluationStructureEntry = getEvaluationStructureEntryForStage({
    structureKey: issueDetail?.alternativeEvaluationStructureKey,
    stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  });
  const expertAlternativeEvaluationStructureEntry =
    getEvaluationStructureEntryForStage({
      structureKey: expertEvaluations?.issue?.alternativeEvaluationStructureKey,
      stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    });

  const alternatives = Array.isArray(issueDetail?.alternatives)
    ? issueDetail.alternatives
    : [];
  const leafCriteria = Array.isArray(issueDetail?.leafCriteria)
    ? issueDetail.leafCriteria
    : [];
  const fallbackCriteria = leafCriteria.map((criterion) => ({
    name: criterion?.name,
    type: criterion?.type,
    children: [],
  }));
  const criteria = Array.isArray(issueDetail?.criteria)
    ? issueDetail.criteria
    : [];
  const scenarios = Array.isArray(issueDetail?.scenarios)
    ? issueDetail.scenarios
    : [];

  return {
    criteriaWeightingStructureLabel:
      criteriaWeightingStructureEntry?.label ||
      issueDetail?.criteriaWeightingStructureKey ||
      "—",
    alternativeEvaluationStructureLabel:
      alternativeEvaluationStructureEntry?.label ||
      issueDetail?.alternativeEvaluationStructureKey ||
      "—",
    alternativeEvaluationViewComponent:
      expertAlternativeEvaluationStructureEntry?.View || null,
    orderedAlternativesForReview: alternatives
      .map((alternative) => ({
        id: alternative?.id || alternative?._id || alternative?.name,
        name: alternative?.name,
      }))
      .filter((alternative) => Boolean(alternative?.name)),
    orderedLeafCriteriaForReview: leafCriteria
      .map((criterion) => ({
        id: criterion?.id || criterion?._id || criterion?.name,
        name: criterion?.name,
        type: criterion?.type || null,
        expressionDomain: criterion?.expressionDomain || null,
      }))
      .filter((criterion) => Boolean(criterion?.name)),
    shouldShowExpertWeights: Boolean(expertWeights?.weights),
    hasExpertCollectiveEvaluations: hasVisibleAdminIssueCollectivePayload(
      expertEvaluations?.collectiveEvaluations
    ),
    issueForDomains: issueDetail
      ? {
        ...issueDetail,
        alternatives,
        criteria: criteria.length > 0 ? criteria : fallbackCriteria,
      }
      : null,
    leafNames: leafCriteria
      .map((criterion) => criterion?.name)
      .filter(Boolean),
    alternatives,
    leafCriteria,
    scenarios,
  };
};
