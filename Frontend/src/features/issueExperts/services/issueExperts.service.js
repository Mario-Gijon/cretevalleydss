import { editExperts } from "../../../services/issue.service.js";

/**
 * Actualiza los expertos de un issue y sus asignaciones de dominio.
 *
 * @param {*} issueOrId Identificador o entidad del issue.
 * @param {string[]} expertsToAdd Correos de expertos a añadir.
 * @param {string[]} expertsToRemove Correos de expertos a eliminar.
 * @param {Object|null} domainAssignments Asignaciones de dominio opcionales.
 * @returns {Promise<object|false>}
 */
export const updateIssueExperts = async (
  issueOrId,
  expertsToAdd,
  expertsToRemove,
  domainAssignments = null
) => {
  return editExperts(issueOrId, expertsToAdd, expertsToRemove, domainAssignments);
};

export default {
  updateIssueExperts,
};