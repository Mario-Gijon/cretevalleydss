/**
 * Normaliza texto para búsquedas simples sin acentos
 * ni diferencias de mayúsculas.
 *
 * @param {*} value Valor a normalizar.
 * @returns {string}
 */
export const normalizeIssueExpertSearchValue = (value) => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
};

/**
 * Filtra expertos por nombre, correo o universidad.
 *
 * @param {Array} experts Lista de expertos disponibles.
 * @param {string} query Texto de búsqueda.
 * @returns {Array}
 */
export const searchIssueExperts = ({ experts = [], query = "" }) => {
  const normalizedQuery = normalizeIssueExpertSearchValue(query);

  if (!normalizedQuery) {
    return experts;
  }

  return experts.filter((expert) => {
    const name = normalizeIssueExpertSearchValue(expert?.name);
    const email = normalizeIssueExpertSearchValue(expert?.email);
    const university = normalizeIssueExpertSearchValue(expert?.university);

    return (
      name.includes(normalizedQuery) ||
      email.includes(normalizedQuery) ||
      university.includes(normalizedQuery)
    );
  });
};

export default searchIssueExperts;
