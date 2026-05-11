import dayjs from "dayjs";
import {
  buildCreateIssueParameterDefaults,
  updateCreateIssueParameterValues,
} from "../../modelParameters";

/**
 * Pasos del flujo de creación de issues.
 *
 * @type {string[]}
 */
export const steps = [
  "Model",
  "Alternatives",
  "Criteria",
  "Experts",
  "Expression domain",
  "Summary",
];

/**
 * Valida el nombre del issue.
 *
 * @param {string} issueName Nombre del issue.
 * @param {Function} setIssueNameError Setter del error.
 * @returns {boolean}
 */
export const validateIssueName = (issueName, setIssueNameError) => {
  if (issueName.length > 35) {
    setIssueNameError("Max 35 characters");
    return false;
  }

  if (!issueName) {
    setIssueNameError("Cannot be empty");
    return false;
  }

  if (issueName.length < 3) {
    setIssueNameError("Must contain min 3 characters");
    return false;
  }

  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(issueName)) {
    setIssueNameError("Must contain at least one letter");
    return false;
  }

  setIssueNameError(false);
  return true;
};

/**
 * Valida la descripción del issue.
 *
 * @param {string} issueDescription Descripción del issue.
 * @param {Function} setIssueDescriptionError Setter del error.
 * @returns {boolean}
 */
export const validateIssueDescription = (
  issueDescription,
  setIssueDescriptionError
) => {
  if (issueDescription.length > 80) {
    setIssueDescriptionError("Max 80 characters");
    return false;
  }

  if (!issueDescription) {
    setIssueDescriptionError("Cannot be empty");
    return false;
  }

  if ((issueDescription.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length < 5) {
    setIssueDescriptionError("Must contain at least 5 letters");
    return false;
  }

  setIssueDescriptionError(false);
  return true;
};

/**
 * Calcula el tiempo restante hasta la fecha de cierre.
 *
 * @param {object|null} closureDate Fecha de cierre en formato dayjs.
 * @returns {string}
 */
export const getRemainingTime = (closureDate) => {
  if (!closureDate) return "Without closure date";

  const now = dayjs();
  const years = closureDate.diff(now, "year");
  const months = closureDate.diff(now.add(years, "year"), "month");
  const days = closureDate.diff(
    now.add(years, "year").add(months, "month"),
    "day"
  );

  let hours = closureDate.diff(
    now.add(years, "year").add(months, "month").add(days, "day"),
    "hour"
  );

  let message = "Close in ";
  if (years > 0) message += `${years} year${years > 1 ? "s" : ""}, `;
  if (months > 0) message += `${months} month${months > 1 ? "s" : ""}, `;
  if (days > 0) message += `${days} day${days !== 1 ? "s" : ""}, `;
  if (hours > 0) message += `${hours} hour${hours !== 1 ? "s" : ""}`;

  if (days === 0 && hours === 0) {
    message = "Close in less than an hour";
  }

  return message;
};

/**
 * Filtra modelos por soporte de consenso y texto de búsqueda.
 *
 * @param {object[]} models Modelos disponibles.
 * @param {boolean} withConsensus Indica si se buscan modelos con consenso.
 * @param {string} searchQuery Texto de búsqueda.
 * @returns {object[]}
 */
export const filterModels = (models, withConsensus, searchQuery) => {
  return models.filter((model) => {
    const matchesConsensus = withConsensus
      ? model.isConsensus
      : !model.isConsensus;
    const matchesSearch = model.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesConsensus && matchesSearch;
  });
};

/**
 * Comprueba si el nombre de una alternativa ya existe.
 *
 * @param {string} name Nombre de la alternativa.
 * @param {string[]} alternatives Alternativas existentes.
 * @returns {boolean}
 */
const isAlternativeNameDuplicate = (name, alternatives) => {
  return alternatives.includes(name);
};

/**
 * Añade una alternativa al listado si es válida.
 *
 * @param {string} inputValue Valor del input.
 * @param {string[]} alternatives Alternativas actuales.
 * @param {Function} setAlternatives Setter de alternativas.
 * @param {Function} setInputValue Setter del valor del input.
 * @param {Function} setInputError Setter del error.
 * @returns {void}
 */
export const addAlternative = (
  inputValue,
  alternatives,
  setAlternatives,
  setInputValue,
  setInputError
) => {
  const trimmedValue = inputValue.trim();

  if (!trimmedValue) return;

  if (trimmedValue.length > 35) {
    setInputError("Max 35 characters");
    return;
  }

  if (isAlternativeNameDuplicate(trimmedValue, alternatives)) {
    setInputError("Alternative already exists");
    return;
  }

  setAlternatives((prev) => [...prev, trimmedValue]);
  setInputValue("");
  setInputError("");
};

/**
 * Elimina una alternativa del listado.
 *
 * @param {string} item Alternativa a eliminar.
 * @param {Function} setAlternatives Setter de alternativas.
 * @returns {void}
 */
export const removeAlternative = (item, setAlternatives) => {
  setAlternatives((prev) => prev.filter((i) => i !== item));
};

/**
 * Guarda la edición de una alternativa existente.
 *
 * @param {string} editValue Nuevo valor.
 * @param {string} editingAlternative Alternativa en edición.
 * @param {string[]} alternatives Alternativas actuales.
 * @param {Function} setAlternatives Setter de alternativas.
 * @param {Function} setEditingAlternative Setter de edición actual.
 * @param {Function} setEditValue Setter del valor editado.
 * @param {Function} setEditError Setter del error.
 * @returns {void}
 */
export const saveEditAlternative = (
  editValue,
  editingAlternative,
  alternatives,
  setAlternatives,
  setEditingAlternative,
  setEditValue,
  setEditError
) => {
  const trimmedValue = editValue.trim();

  if (!trimmedValue) {
    setEditError("Alternative cannot be empty");
    return;
  }

  if (trimmedValue.length > 35) {
    setEditError("Max 35 characters");
    return;
  }

  if (
    isAlternativeNameDuplicate(trimmedValue, alternatives) &&
    trimmedValue !== editingAlternative
  ) {
    setEditError("Alternative already exists");
    return;
  }

  setAlternatives((prev) =>
    prev.map((alt) => (alt === editingAlternative ? trimmedValue : alt))
  );

  setEditingAlternative(null);
  setEditValue("");
  setEditError(null);
};

/**
 * Construye los valores por defecto de los parámetros de un modelo.
 *
 * @param {object} allData Datos necesarios para construir los valores.
 * @returns {object}
 */
export const setDefaults = (allData) => {
  return buildCreateIssueParameterDefaults({
    selectedModel: allData?.selectedModel,
    leafCriteria: allData?.criteria || [],
  });
};

/**
 * Ajusta los valores de parámetros cuando cambian el modelo o los criterios.
 *
 * @param {object} prev Valores anteriores.
 * @param {object} selectedModel Modelo seleccionado.
 * @param {object[]} criteria Criterios actuales.
 * @returns {object}
 */
export const updateParamValues = (prev, selectedModel, criteria) => {
  return updateCreateIssueParameterValues({
    previous: prev,
    selectedModel,
    leafCriteria: criteria,
  });
};

/**
 * Lee el estado persistido del flujo createIssue desde localStorage.
 *
 * @param {string} storageKey Clave de almacenamiento.
 * @returns {Object}
 */
export const readStoredCreateIssueData = (storageKey) => {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
};
