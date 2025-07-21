import { ExitUserIssue } from "../models/ExitUserIssue.js";
import { Issue } from "../models/Issues.js";
import { Participation } from "../models/Participations.js"; // Ajusta la importación según tu estructura

export const buildCriterionTree = (criteriaList, issueId) => {
  const criteriaMap = new Map();

  // Crear un mapa de criterios filtrados por issueId
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

  // Crear la jerarquía de criterios, asignando a cada uno su padre
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

  // Función recursiva para ordenar los criterios y sus hijos por el nombre
  const sortCriteriaAlphabetically = (criteria) => {
    // Ordenar los criterios en orden alfabético
    criteria.sort((a, b) => a.name.localeCompare(b.name));

    // Ordenar recursivamente los hijos de cada criterio
    criteria.forEach(criterion => {
      if (criterion.children.length > 0) {
        sortCriteriaAlphabetically(criterion.children);
      }
    });
  };

  // Ordenar los criterios raíz y sus hijos
  sortCriteriaAlphabetically(rootCriteria);

  return rootCriteria;
};


// Obtener los IDs de los problemas en los que participa un usuario
export const getUserActiveIssueIds = async (userId) => {
  // Obtener los problemas en los que el usuario es administrador
  const adminIssues = await Issue.find({ admin: userId, active: true }).lean();
  const adminIssueIds = adminIssues.map((issue) => issue._id.toString());

  // Obtener las participaciones como experto, solo en issues activos
  const participations = await Participation.find({ expert: userId, invitationStatus: "accepted" })
    .populate({
      path: "issue",
      match: { active: true } // Filtrar solo los issues activos
    })
    .lean();

  // Filtrar las participaciones con issue válido (porque el populate puede devolver null si no hace match)
  const expertIssueIds = participations
    .filter((part) => part.issue) // Evita los que no pasaron el match
    .map((part) => part.issue._id.toString());

  return [...new Set([...adminIssueIds, ...expertIssueIds])];
};

// Obtener los IDs de los problemas en los que participa un usuario
export const getUserFinishedIssueIds = async (userId, { excludeHidden = true } = {}) => {
  const adminIssues = await Issue.find({ admin: userId, active: false }).lean();
  const adminIssueIds = adminIssues.map((issue) => issue._id.toString());

  const participations = await Participation.find({
    expert: userId,
    invitationStatus: "accepted"
  })
    .populate({
      path: "issue",
      match: { active: false },
    })
    .lean();

  const expertIssueIds = participations
    .filter((part) => part.issue)
    .map((part) => part.issue._id.toString());

  const allIssueIds = [...new Set([...adminIssueIds, ...expertIssueIds])];

  if (excludeHidden) {

    const hiddenIssueIds = await ExitUserIssue.find({
      user: userId,
      issue: { $in: allIssueIds },
      hidden: true,
    }).distinct("issue");
    // Convertir a strings para la comparación
    const hiddenIdsAsString = hiddenIssueIds.map(id => id.toString());

    const visibleIssueIds = allIssueIds.filter(
      (id) => !hiddenIdsAsString.includes(id)
    );
    return visibleIssueIds;
  }

  return allIssueIds;
};

export const categorizeParticipations = (allParticipations, userId) => {
  const participatedExperts = allParticipations.filter((part) => part.evaluationCompleted); // Ya evaluaron
  const pendingExperts = allParticipations.filter((part) => part.invitationStatus === 'pending'); // Pendientes
  const notAcceptedExperts = allParticipations.filter((part) => part.invitationStatus === 'declined'); // Rechazados
  const acceptedButNotEvaluated = allParticipations.filter((part) => part.invitationStatus === 'accepted' && !part.evaluationCompleted); // Aceptaron pero no evaluaron
  const isExpert = allParticipations.some((part) => part.expert._id.toString() === userId);

  return {
    participatedExperts,
    pendingExperts,
    notAcceptedExperts,
    acceptedButNotEvaluated,
    isExpert
  };
};

