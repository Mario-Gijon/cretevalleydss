import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import { buildIssueCriteriaTree } from "../../shared/criteriaTree.js";

const requireExpertEmail = ({ expert, field, issueId, recordId = null }) => {
  const email = typeof expert?.email === "string" ? expert.email.trim() : "";

  if (!email) {
    throw createInternalError("Finished issue expert email is invalid", {
      field,
      details: {
        issueId,
        recordId,
      },
    });
  }

  return email;
};

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
  const issueId =
    toIdString(participations[0]?.issue || completedEvaluations[0]?.issue) || null;
  const completedExpertEmails = new Set(
    completedEvaluations.map((evaluation) =>
      requireExpertEmail({
        expert: evaluation.expert,
        field: "evaluations.expert.email",
        issueId,
        recordId: toIdString(evaluation._id) || null,
      })
    )
  );

  const participated = [...completedExpertEmails].sort((left, right) =>
    left.localeCompare(right)
  );

  const notAccepted = participations
    .filter((participation) => participation.invitationStatus === "declined")
    .map((participation) =>
      requireExpertEmail({
        expert: participation.expert,
        field: "participations.expert.email",
        issueId,
        recordId: toIdString(participation._id) || null,
      })
    )
    .sort((left, right) => left.localeCompare(right));

  return {
    participated,
    notAccepted,
  };
};

export const buildSummarySection = ({
  issue,
  model,
  finalCriteriaWeights,
  criteria,
  orderedLeafCriteria,
  alternatives,
  experts,
  consensusInfo,
}) => {
  const issueName = typeof issue.name === "string" ? issue.name.trim() : "";
  const admin = issue.admin;
  const modelName = typeof model.name === "string" ? model.name.trim() : "";

  if (!issueName) {
    throw createInternalError("Finished issue name is invalid", {
      field: "issue.name",
      details: {
        issueId: toIdString(issue._id),
      },
    });
  }

  if (!admin || typeof admin !== "object") {
    throw createInternalError("Finished issue admin is invalid", {
      field: "issue.admin",
      details: {
        issueId: toIdString(issue._id),
      },
    });
  }

  const adminEmail = typeof admin.email === "string" ? admin.email.trim() : "";

  if (!adminEmail) {
    throw createInternalError("Finished issue admin email is invalid", {
      field: "issue.admin.email",
      details: {
        issueId: toIdString(issue._id),
      },
    });
  }

  if (!modelName) {
    throw createInternalError("Finished issue model name is invalid", {
      field: "model.name",
      details: {
        issueId: toIdString(issue._id),
      },
    });
  }

  if (!isPlainObject(finalCriteriaWeights.weightsByCriterion)) {
    throw createInternalError(
      "Finished issue finalCriteriaWeights.weightsByCriterion must be an object",
      {
        field: "finalCriteriaWeights.weightsByCriterion",
        details: {
          issueId: toIdString(issue._id),
        },
      }
    );
  }

  const { criteriaTree } = buildIssueCriteriaTree(criteria, issue);
  const weightMap = orderedLeafCriteria.reduce((accumulator, criterion) => {
    accumulator[criterion.name] =
      finalCriteriaWeights.weightsByCriterion[criterion.name];
    return accumulator;
  }, {});

  return {
    name: issueName,
    admin: adminEmail,
    description: issue.description,
    model: modelName,
    criteria: criteriaTree
      .map(mapCriteriaTreeToSummaryShape)
      .map((node) => attachWeightsToTree(node, weightMap)),
    alternatives: alternatives.map((alternative) => alternative.name),
    creationDate: issue.creationDate,
    closureDate: issue.closureDate,
    alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
    criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
    isConsensus: issue.isConsensus === true,
    consensusInfo,
    experts,
  };
};
