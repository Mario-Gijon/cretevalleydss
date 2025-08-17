import { Alternative } from "../models/Alternatives.js"
import { Criterion } from "../models/Criteria.js";
import { Participation } from "../models/Participations.js";
import { Evaluation } from "../models/Evaluations.js";
import { User } from "../models/Users.js";
import mongoose from "mongoose";


/**
 * Crea las alternativas asociadas a un problema.
 * @param {string[]} alternatives - Nombres de las alternativas.
 * @param {ObjectId} issueId - ID del problema al que pertenecen.
 * @param {mongoose.ClientSession} session - Sesión para transacción.
 * @returns {Promise<Alternative[]>} - Alternativas creadas.
 */
export const createAlternatives = async (alternatives, issueId, session = null) => {
  // Creamos y guardamos cada alternativa usando la sesión si se proporciona
  return Promise.all(
    alternatives.map(async (altName) => {
      // Instanciamos la alternativa asociada al problema
      const alternative = new Alternative({ issue: issueId, name: altName });
      
      // Guardamos la alternativa en la base de datos usando sesión
      await alternative.save({ session });

      // Devolvemos la alternativa creada
      return alternative;
    })
  );
};



/**
 * Crea criterios asociados a un problema de forma recursiva.
 * Devuelve únicamente los criterios hoja.
 * @param {Array} criteriaList - Árbol de criterios.
 * @param {ObjectId} issueId - ID del problema.
 * @param {ObjectId|null} parentId - ID del criterio padre (si hay).
 * @param {mongoose.ClientSession} session - Sesión de transacción.
 * @returns {Promise<Criterion[]>} - Lista de criterios hoja.
 */
export const createCriteria = async (criteriaList, issueId, parentId = null, session = null) => {
  // Lista de criterios hoja a devolver
  const leafCriteria = [];

  // Función recursiva para crear criterios
  const createCriteriaRecursively = async (criteriaList, parentId) => {
    return Promise.all(
      criteriaList.map(async (crit) => {
        // Creamos nuevo criterio
        const newCriterion = new Criterion({
          issue: issueId,
          parentCriterion: parentId,
          name: crit.name,
          type: crit.type,
          isLeaf: crit.children.length === 0,
        });

        // Guardamos con sesión
        await newCriterion.save({ session });

        // Si es hoja, lo añadimos a la lista final
        if (crit.children.length === 0) {
          leafCriteria.push(newCriterion);
        } else {
          // Si no, seguimos recursivamente con sus hijos
          await createCriteriaRecursively(crit.children, newCriterion._id);
        }

        return newCriterion;
      })
    );
  };

  // Comenzamos la creación desde el nodo raíz
  await createCriteriaRecursively(criteriaList, parentId);

  // Devolvemos solo los criterios hoja
  return leafCriteria;
};



/**
 * Crea participaciones de expertos para un problema.
 * Marca al administrador como aceptado, el resto como pendientes.
 * @param {string[]} addedExperts - Emails de expertos.
 * @param {ObjectId} issueId - ID del problema.
 * @param {string} adminEmail - Email del administrador creador.
 * @param {mongoose.ClientSession} session - Sesión para transacción.
 * @returns {Promise<Map>} - Mapa email -> ID del usuario.
 */
export const createParticipations = async (addedExperts, issueId, adminEmail, session = null) => {
  // Obtenemos usuarios expertos que coincidan con los emails
  const expertUsers = await User.find({ email: { $in: addedExperts } }).session(session);

  // Creamos un mapa de email -> ID de usuario
  const expertMap = new Map(expertUsers.map((expert) => [expert.email, expert._id]));

  // Creamos una participación para cada experto
  await Promise.all(
    addedExperts.map(async (email) => {
      // Verificamos si es el admin
      const isAdminExpert = email === adminEmail;

      if (expertMap.has(email)) {
        // Creamos participación
        const participation = new Participation({
          issue: issueId,
          expert: expertMap.get(email),
          invitationStatus: isAdminExpert ? "accepted" : "pending",
          evaluationCompleted: false,
        });

        // Guardamos con sesión
        await participation.save({ session });
      }
    })
  );

  // Devolvemos el mapa email -> ID
  return expertMap;
};



/**
 * Busca el dominio de expresión de un criterio en la estructura de datos proporcionada.
 * @param {Object|string} criteriaData - Objeto o string que contiene dominios.
 * @param {string} criterionName - Nombre del criterio a buscar.
 * @returns {any|null} - Dominio de expresión o null si no se encuentra.
 */
export const findExpressionDomain = (criteriaData, criterionName) => {
  // Si criteriaData es un string, se considera directamente el dominio
  if (typeof criteriaData === "string") {
    return criteriaData;
  }

  // Si no es objeto o es nulo, devolvemos null
  if (typeof criteriaData !== "object" || criteriaData === null) return null;

  // Convertimos en array para recorrerlo (si es objeto plano)
  const criteriaArray = Array.isArray(criteriaData) ? criteriaData : Object.values(criteriaData);

  for (const criterion of criteriaArray) {
    // Si coincide el nombre y tiene data, devolvemos ese dominio
    if (criterion.name === criterionName && criterion.data) {
      return criterion.data;
    }

    // Si tiene hijos, hacemos búsqueda recursiva
    if (criterion.children && Array.isArray(criterion.children)) {
      const result = findExpressionDomain(criterion.children, criterionName);
      if (result) return result;
    }
  }

  // No se encontró el dominio
  return null;
};


/**
 * Crea evaluaciones iniciales para expertos, alternativas y criterios hoja.
 * @param {Object} domainExpressions - Datos con dominios por experto y criterio.
 * @param {Map} expertMap - Mapa email -> ID del experto.
 * @param {Alternative[]} createdAlternatives - Alternativas creadas.
 * @param {Criterion[]} leafCriteria - Lista de criterios hoja.
 * @param {ObjectId} issueId - ID del problema.
 * @param {boolean} pairwise - Si las evaluaciones son pareadas.
 * @param {number|null} currentConsensusPhase - Fase de consenso actual.
 * @param {mongoose.ClientSession|null} session - Sesión de transacción.
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
  // Recorremos cada experto
  for (const [email, altData] of Object.entries(domainExpressions)) {
    // Ignoramos si el experto no existe
    if (!expertMap.has(email)) continue;

    const expertId = expertMap.get(email);

    // Recorremos cada alternativa evaluada por el experto
    for (const [altName, criteriaData] of Object.entries(altData)) {
      const alternative = createdAlternatives.find((alt) => alt.name === altName);
      if (!alternative) continue;

      // Recorremos todos los criterios hoja
      for (const leafCriterion of leafCriteria) {
        // Buscamos el dominio de expresión para ese criterio
        const expressionDomain = findExpressionDomain(criteriaData, leafCriterion.name);
        if (!expressionDomain) continue;

        // Si el modelo requiere comparaciones pareadas
        if (pairwise) {
          for (const comparedAlternative of createdAlternatives) {
            // No se compara consigo misma
            if (alternative._id.equals(comparedAlternative._id)) continue;

            // Creamos evaluación pareada
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

            // Guardamos con sesión
            await evaluation.save({ session });
          }
        } else {
          // Evaluación directa (no pareada)
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

          // Guardamos con sesión
          await evaluation.save({ session });
        }
      }
    }
  }
};

