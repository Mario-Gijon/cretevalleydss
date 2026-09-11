const asList = (value) => (Array.isArray(value) ? value : []);

const asText = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Devuelve un nombre de presentación seguro para un modelo del catálogo.
 *
 * @param {object} model Modelo recibido desde el catálogo.
 * @returns {string}
 */
export const getModelDisplayName = (model = {}) =>
  asText(model?.displayName) || asText(model?.name) || "Unnamed model";

/**
 * Devuelve la descripción breve disponible para un modelo.
 *
 * @param {object} model Modelo recibido desde el catálogo.
 * @returns {string}
 */
export const getModelDescription = (model = {}) =>
  asText(model?.smallDescription) || asText(model?.extendedDescription);

/**
 * Filtra un catálogo mediante contenido dirigido a usuarios.
 *
 * @param {Array<object>} models Modelos de una familia del catálogo.
 * @param {string} query Texto de búsqueda.
 * @returns {Array<object>}
 */
export const filterCatalogModels = (models, query) => {
  const normalizedQuery = asText(query).toLocaleLowerCase();

  if (!normalizedQuery) {
    return asList(models);
  }

  return asList(models).filter((model) =>
    [getModelDisplayName(model), getModelDescription(model)]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery)
  );
};

/**
 * Determina si un modelo tiene contenido educativo que mostrar.
 *
 * @param {object} model Modelo recibido desde el catálogo.
 * @returns {boolean}
 */
export const hasModelEducation = (model = {}) => {
  const section = model?.modelSection;

  if (!section || typeof section !== "object") {
    return false;
  }

  return Boolean(
    asText(section.whatItDoes) ||
      asText(section.whenToUse) ||
      asList(section.advantages).some(asText) ||
      asList(section.limitations).some(asText)
  );
};

/**
 * Devuelve una URL externa segura cuando el catálogo proporciona una.
 *
 * @param {*} value Valor de moreInfoUrl.
 * @returns {string|null}
 */
export const getMoreInfoUrl = (value) => {
  const urlValue = asText(value);

  if (!urlValue) {
    return null;
  }

  try {
    const url = new URL(urlValue);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

/**
 * Filtra elementos de una lista educativa incompleta de forma segura.
 *
 * @param {*} value Lista del catálogo.
 * @returns {Array<string>}
 */
export const getEducationalList = (value) => asList(value).map(asText).filter(Boolean);
