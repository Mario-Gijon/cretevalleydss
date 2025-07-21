import { Alternative } from "../models/Alternatives.js"
import { Criterion } from "../models/Criteria.js";
import { Participation } from "../models/Participations.js";
import { Evaluation } from "../models/Evaluations.js";
import { User } from "../models/Users.js";
import mongoose from "mongoose";

/**
 * Crea las alternativas asociadas a un problema
 */
export const createAlternatives = async (alternatives, issueId, session = null) => {
  return Promise.all(
    alternatives.map(async (altName) => {
      const alternative = new Alternative({ issue: issueId, name: altName });
      if (session) await alternative.save({ session });
      else await alternative.save();
      return alternative;
    })
  );
};

/**
 * Crea criterios asociados a un problema recursivamente, devolviendo solo los criterios hoja.
 */
export const createCriteria = async (criteriaList, issueId, parentId = null, session = null) => {
  const leafCriteria = [];

  const createCriteriaRecursively = async (criteriaList, parentId) => {
    return Promise.all(
      criteriaList.map(async (crit) => {
        const newCriterion = new Criterion({
          issue: issueId,
          parentCriterion: parentId,
          name: crit.name,
          type: crit.type,
          isLeaf: crit.children.length === 0,
        });
        if (session) await newCriterion.save({ session });
        else await newCriterion.save();

        if (crit.children.length === 0) {
          leafCriteria.push(newCriterion);
        } else {
          await createCriteriaRecursively(crit.children, newCriterion._id);
        }
        return newCriterion;
      })
    );
  };

  await createCriteriaRecursively(criteriaList, parentId);
  return leafCriteria;
};

/**
 * Crea participaciones de expertos para un problema.
 */
export const createParticipations = async (addedExperts, issueId, adminEmail, session = null) => {
  // Obtener usuarios expertos que coincidan con los emails dados
  const expertUsers = await User.find({ email: { $in: addedExperts } }).session(session);
  // Crear mapa para buscar ID por email
  const expertMap = new Map(expertUsers.map((expert) => [expert.email, expert._id]));

  // Crear participaciones para cada email
  await Promise.all(
    addedExperts.map(async (email) => {
      // Si es admin, marcar como aceptado, si no, como pendiente
      const isAdminExpert = email === adminEmail;

      if (expertMap.has(email)) {
        const participation = new Participation({
          issue: issueId,
          expert: expertMap.get(email),
          invitationStatus: isAdminExpert ? "accepted" : "pending",
          evaluationCompleted: false,
        });
        if (session) await participation.save({ session });
        else await participation.save();
      }
    })
  );

  return expertMap;
};

/**
 * Busca el dominio de expresión asociado a un criterio.
 */
export const findExpressionDomain = (criteriaData, criterionName) => {
  if (typeof criteriaData === "string") {
    return criteriaData;
  }

  if (typeof criteriaData !== "object" || criteriaData === null) return null;

  const criteriaArray = Array.isArray(criteriaData) ? criteriaData : Object.values(criteriaData);

  for (const criterion of criteriaArray) {
    if (criterion.name === criterionName && criterion.data) {
      return criterion.data;
    }

    if (criterion.children && Array.isArray(criterion.children)) {
      const result = findExpressionDomain(criterion.children, criterionName);
      if (result) return result;
    }
  }
  return null;
};

/**
 * Crea evaluaciones iniciales para expertos, alternativas y criterios hoja.
 */
export const createEvaluations = async (
  domainExpressions,
  expertMap,
  createdAlternatives,
  leafCriteria,
  issueId,
  pairwise = false,
  currentConsensusPhase = null,
  session = null
) => {
  for (const [email, altData] of Object.entries(domainExpressions)) {
    if (!expertMap.has(email)) continue;
    const expertId = expertMap.get(email);

    for (const [altName, criteriaData] of Object.entries(altData)) {
      const alternative = createdAlternatives.find((alt) => alt.name === altName);
      if (!alternative) continue;

      for (const leafCriterion of leafCriteria) {
        const expressionDomain = findExpressionDomain(criteriaData, leafCriterion.name);
        if (!expressionDomain) continue;

        if (pairwise) {
          // Crear evaluaciones par a par para cada alternativa comparada
          for (const comparedAlternative of createdAlternatives) {
            if (alternative._id.equals(comparedAlternative._id)) continue;

            const evaluation = new Evaluation({
              issue: issueId,
              expert: expertId,
              alternative: alternative._id,
              comparedAlternative: comparedAlternative._id,
              criterion: leafCriterion._id,
              expressionDomain,
              value: null,
              timestamp: null,
              history: [],
              consensusPhase: currentConsensusPhase,
            });
            if (session) await evaluation.save({ session });
            else await evaluation.save();
          }
        } else {
          // Crear evaluación simple (no par a par)
          const evaluation = new Evaluation({
            issue: issueId,
            expert: expertId,
            alternative: alternative._id,
            comparedAlternative: null,
            criterion: leafCriterion._id,
            expressionDomain,
            value: null,
            timestamp: null,
            history: [],
            consensusPhase: currentConsensusPhase,
          });
          if (session) await evaluation.save({ session });
          else await evaluation.save();
        }
      }
    }
  }
};
