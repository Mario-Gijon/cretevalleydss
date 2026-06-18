import { toIdString } from "../../../utils/common/ids.js";
import { hasOwnKey } from "../../../utils/common/objects.js";
import { buildCriteriaTreeFromDocs } from "../../issues/shared/criteriaTree.js";

export const sortByNameStable = (a, b) => {
  const byName = a.name.localeCompare(
    b.name,
    undefined,
    {
      sensitivity: "base",
      numeric: true,
    }
  );

  if (byName !== 0) return byName;

  return toIdString(a).localeCompare(toIdString(b));
};

export const buildCriteriaTreeAdmin = (criteriaDocs) => {
  return buildCriteriaTreeFromDocs({
    criteriaDocs,
    mapNode: (criterion) => ({
      id: toIdString(criterion._id),
      name: criterion.name,
      type: criterion.type,
      isLeaf: criterion.isLeaf,
      parentId: criterion.parentCriterion
        ? toIdString(criterion.parentCriterion)
        : null,
      children: [],
    }),
    sortChildren: sortByNameStable,
  });
};

export const getIssueStageMeta = (stage) => {
  const stageMap = {
    criteriaWeighting: {
      key: "criteriaWeighting",
      label: "Criteria weighting",
    },
    weightsFinished: {
      key: "weightsFinished",
      label: "Weights finished",
    },
    alternativeEvaluation: {
      key: "alternativeEvaluation",
      label: "Alternative evaluation",
    },
    finished: {
      key: "finished",
      label: "Finished",
    },
  };

  return stageMap[stage] || { key: stage, label: stage || "Unknown" };
};

export const getOwnerActionFlags = ({
  issue,
  acceptedExperts = 0,
  pendingExperts = 0,
  weightsDoneAccepted = 0,
  evaluationsDoneAccepted = 0,
}) => {
  const stage = issue.currentStage;
  const hasPendingExperts = pendingExperts > 0;

  const allWeightsDone =
    acceptedExperts > 0 && weightsDoneAccepted === acceptedExperts;

  const allEvaluationsDone =
    acceptedExperts > 0 && evaluationsDoneAccepted === acceptedExperts;

  return {
    canEditExperts: issue.active,
    canRemoveIssue: issue.active,
    canComputeWeights:
      stage === "weightsFinished" && !hasPendingExperts && allWeightsDone,
    canResolveIssue:
      stage === "alternativeEvaluation" &&
      !hasPendingExperts &&
      allEvaluationsDone,
  };
};

export const buildParticipantExpertPayload = (expert, fallbackId = "") => {
  if (!expert) {
    return {
      id: fallbackId,
      name: "Deleted user",
      email: "Deleted user",
      role: "user",
      university: "",
      accountConfirm: false,
    };
  }

  return {
    id: toIdString(expert._id),
    name: expert.name,
    email: expert.email,
    role: expert.role,
    university: expert.university,
    accountConfirm: expert.accountConfirm,
  };
};

export const orderObjectByKeys = (obj, orderedKeys) => {
  const orderedObject = {};
  const usedKeys = new Set();

  for (const key of orderedKeys) {
    orderedObject[key] = hasOwnKey(obj, key)
      ? obj[key]
      : null;
    usedKeys.add(key);
  }

  for (const [key, value] of Object.entries(obj)) {
    if (!usedKeys.has(key)) {
      orderedObject[key] = value;
    }
  }

  return orderedObject;
};

export const formatIssueSnapshotDomain = (domain) => {
  if (!domain) return null;

  return {
    id: toIdString(domain._id),
    name: domain.name,
    type: domain.type,
    ...(domain.type === "numeric" && {
      range: {
        min: domain.numericRange?.min ?? null,
        max: domain.numericRange?.max ?? null,
      },
    }),
    ...(domain.type === "linguistic" && {
      labels: domain.linguisticLabels,
    }),
  };
};

export const buildAdminExpertParticipationPayload = (participation) => {
  if (!participation) {
    return null;
  }

  return {
    invitationStatus: participation.invitationStatus,
    weightsCompleted: participation.weightsCompleted,
    evaluationCompleted: participation.evaluationCompleted,
    joinedAt: participation.joinedAt,
    entryPhase: participation.entryPhase,
    entryStage: participation.entryStage,
  };
};

export const buildAdminExpertIdentityPayload = (expert, fallbackId) =>
  buildParticipantExpertPayload(expert, fallbackId);
