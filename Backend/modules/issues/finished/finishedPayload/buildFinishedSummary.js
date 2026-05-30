import { buildIssueCriteriaTree } from "../../shared/criteriaTree.js";

export const mapCriteriaTreeToSummaryShape = (node) => ({
  _id: node.id,
  name: node.name,
  type: node.type,
  isLeaf: node.isLeaf,
  parentCriterion: node.parentId,
  children: node.children.map(mapCriteriaTreeToSummaryShape),
});

export const attachWeightsToTree = (node, weightMap) => {
  if (node.isLeaf) {
    return {
      ...node,
      weight: weightMap[node.name],
    };
  }

  return {
    ...node,
    children: node.children.map((child) => attachWeightsToTree(child, weightMap)),
  };
};

export const buildParticipationsSummary = ({ participations, completedEvaluations }) => {
  const completedExpertEmails = new Set(
    completedEvaluations
      .map((evaluation) => evaluation?.expert?.email)
      .filter((email) => typeof email === "string" && email.trim())
  );

  const participated = [...completedExpertEmails].sort((left, right) =>
    left.localeCompare(right)
  );

  const notAccepted = participations
    .filter((participation) => participation?.invitationStatus === "declined")
    .map((participation) => participation?.expert?.email)
    .filter((email) => typeof email === "string" && email.trim())
    .sort((left, right) => left.localeCompare(right));

  return {
    participated,
    notAccepted,
  };
};

export const buildSummarySection = ({
  issue,
  model,
  criteria,
  orderedLeafCriteria,
  alternatives,
  experts,
  consensusInfo,
}) => {
  const { criteriaTree } = buildIssueCriteriaTree(criteria, issue);
  const weights = Array.isArray(issue?.modelParameters?.weights)
    ? issue.modelParameters.weights
    : [];

  const weightMap = orderedLeafCriteria.reduce((accumulator, criterion, index) => {
    accumulator[criterion.name] = weights[index];
    return accumulator;
  }, {});

  return {
    name: issue.name,
    admin: issue?.admin?.email || null,
    description: issue.description,
    model: model?.name || null,
    criteria: criteriaTree
      .map(mapCriteriaTreeToSummaryShape)
      .map((node) => attachWeightsToTree(node, weightMap)),
    alternatives: alternatives.map((alternative) => alternative.name),
    creationDate: issue.creationDate,
    closureDate: issue.closureDate,
    alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
    criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
    isConsensus: issue?.isConsensus === true,
    consensusInfo,
    experts,
  };
};
