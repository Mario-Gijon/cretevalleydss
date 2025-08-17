import { ExitUserIssue } from "../models/ExitUserIssue.js";
import { Issue } from "../models/Issues.js";
import { Participation } from "../models/Participations.js"; // Ajusta la importación según tu estructura

// Construye el árbol jerárquico de criterios a partir de la lista plana
export const buildCriterionTree = (criteriaList, issueId) => {
  const criteriaMap = new Map();

  criteriaList.forEach((crit) => {
    if (crit.issue.toString() === issueId.toString()) {
      criteriaMap.set(crit._id.toString(), {
        name: crit.name,
        type: crit.type,
        isLeaf: crit.isLeaf,
        children: [],
        parentCriterion: crit.parentCriterion ? crit.parentCriterion.toString() : null,
      });
    }
  });

  const rootCriteria = [];

  criteriaList.forEach((criterion) => {
    if (criterion.issue.toString() === issueId.toString()) {
      if (criterion.parentCriterion) {
        const parent = criteriaMap.get(criterion.parentCriterion.toString());
        if (parent) {
          parent.children.push(criteriaMap.get(criterion._id.toString()));
        }
      } else {
        rootCriteria.push(criteriaMap.get(criterion._id.toString()));
      }
    }
  });

  const sortCriteriaAlphabetically = (criteria) => {
    criteria.sort((a, b) => a.name.localeCompare(b.name));
    criteria.forEach(criterion => {
      if (criterion.children.length > 0) {
        sortCriteriaAlphabetically(criterion.children);
      }
    });
  };

  sortCriteriaAlphabetically(rootCriteria);
  return rootCriteria;
};


// Obtener los IDs de los problemas en los que participa un usuario (activos)
export const getUserActiveIssueIds = async (userId, session = null) => {
  const adminIssues = await Issue.find({ admin: userId, active: true }).session(session).lean();
  const adminIssueIds = adminIssues.map((issue) => issue._id.toString());

  const participations = await Participation.find({
    expert: userId,
    invitationStatus: "accepted"
  })
    .populate({
      path: "issue",
      match: { active: true }
    })
    .session(session)
    .lean();

  const expertIssueIds = participations
    .filter((part) => part.issue)
    .map((part) => part.issue._id.toString());

  return [...new Set([...adminIssueIds, ...expertIssueIds])];
};


// Obtener los IDs de los problemas finalizados en los que participa un usuario
export const getUserFinishedIssueIds = async (userId, { excludeHidden = true, session = null } = {}) => {
  const adminIssues = await Issue.find({ admin: userId, active: false }).session(session).lean();
  const adminIssueIds = adminIssues.map((issue) => issue._id.toString());

  const participations = await Participation.find({
    expert: userId,
    invitationStatus: "accepted"
  })
    .populate({
      path: "issue",
      match: { active: false }
    })
    .session(session)
    .lean();

  const expertIssueIds = participations
    .filter((part) => part.issue)
    .map((part) => part.issue._id.toString());

  const allIssueIds = [...new Set([...adminIssueIds, ...expertIssueIds])];

  if (excludeHidden) {
    const hiddenIssueIds = await ExitUserIssue.find({
      user: userId,
      issue: { $in: allIssueIds },
      hidden: true
    }).session(session).distinct("issue");

    const hiddenIdsAsString = hiddenIssueIds.map(id => id.toString());

    return allIssueIds.filter((id) => !hiddenIdsAsString.includes(id));
  }

  return allIssueIds;
};


// Clasifica las participaciones de expertos en categorías
export const categorizeParticipations = (allParticipations, userId) => {
  const participatedExperts = allParticipations.filter((part) => part.evaluationCompleted);
  const pendingExperts = allParticipations.filter((part) => part.invitationStatus === 'pending');
  const notAcceptedExperts = allParticipations.filter((part) => part.invitationStatus === 'declined');
  const acceptedButNotEvaluated = allParticipations.filter((part) =>
    part.invitationStatus === 'accepted' && !part.evaluationCompleted
  );
  const isExpert = allParticipations.some((part) => part.expert._id.toString() === userId);

  return {
    participatedExperts,
    pendingExperts,
    notAcceptedExperts,
    acceptedButNotEvaluated,
    isExpert
  };
};
