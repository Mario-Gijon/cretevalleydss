import { getAllUsers, getModelsInfo } from "../services/issue.service";
import dayjs from "dayjs";

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
 * Opciones disponibles para el tipo de dato.
 *
 * @type {object[]}
 */
export const dataTypeOptions = [
  {
    label: "Numeric",
    options: [{ label: "Float", value: 3 }],
  },
];

/**
 * Genera la estructura inicial de dominios de expresión.
 *
 * @param {object} params Datos de entrada.
 * @param {string[]} params.alternatives Alternativas del issue.
 * @param {object[]} params.criteria Criterios del issue.
 * @param {string[]} params.addedExperts Expertos añadidos.
 * @returns {object}
 */
export const generateDomainExpressions = ({
  alternatives,
  criteria,
  addedExperts,
}) => {
  const domainExpressions = {};

  const processCriterion = (criterion) => {
    const isLeaf = criterion.children.length === 0;

    const result = {
      name: criterion.name,
      data: isLeaf ? "Numeric Float" : null,
      children: isLeaf ? false : criterion.children.map(processCriterion),
    };

    return result;
  };

  addedExperts.forEach((expert) => {
    domainExpressions[expert] = {};

    alternatives.forEach((alternative) => {
      domainExpressions[expert][alternative] = {};

      criteria.forEach((criterion) => {
        domainExpressions[expert][alternative][criterion.name] =
          processCriterion(criterion);
      });
    });
  });

  return domainExpressions;
};

/**
 * Construye triángulos difusos básicos para un número dado de etiquetas.
 *
 * @param {number} nLabels Número de etiquetas.
 * @returns {object[]}
 */
export const buildFuzzyTriangles = (nLabels) => {
  const step = 1 / (nLabels - 1);

  return Array.from({ length: nLabels }, (_, i) => {
    const m = i * step;
    const l = Math.max(0, m - step);
    const u = Math.min(1, m + step);

    return {
      label: `Etiqueta ${i + 1}`,
      values: [l, m, u],
    };
  });
};

/**
 * Carga expertos y modelos disponibles para la creación del issue.
 *
 * @param {Function} setInitialExperts Setter de expertos iniciales.
 * @param {Function} setModels Setter de modelos.
 * @returns {Promise<void>}
 */
export const fetchExpertsAndModels = async (setInitialExperts, setModels) => {
  const initExpertsData = await getAllUsers();
  setInitialExperts(initExpertsData?.data || []);

  const initModelsData = await getModelsInfo();
  setModels(initModelsData?.data || []);
};

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
 * Elimina tildes de una cadena.
 *
 * @param {string} str Cadena de entrada.
 * @returns {string}
 */
export const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
 * Agrupa la información de dominios por experto, alternativa y criterio hoja.
 *
 * @param {object[]} criteria Criterios del issue.
 * @param {object} domainExpressions Estructura de dominios.
 * @returns {object}
 */
export const processGroupedData = (criteria, domainExpressions) => {
  const leafCriteria = [];

  const traverse = (node) => {
    if (!node.children || node.children.length === 0) {
      leafCriteria.push(node.name);
    } else {
      node.children.forEach(traverse);
    }
  };

  criteria.forEach(traverse);

  const leafCriteriaData = [];

  const traverseCriteria = (expert, alternative, criterion) => {
    if (leafCriteria.includes(criterion.name)) {
      leafCriteriaData.push({
        expert,
        alternative,
        criterion: criterion.name,
        dataType: criterion.data || null,
      });
    } else if (criterion.children && Array.isArray(criterion.children)) {
      criterion.children.forEach((child) =>
        traverseCriteria(expert, alternative, child)
      );
    }
  };

  Object.entries(domainExpressions).forEach(([expert, expertData]) => {
    Object.entries(expertData).forEach(([alternative, alternativeData]) => {
      Object.entries(alternativeData).forEach(([, criterion]) => {
        traverseCriteria(expert, alternative, criterion);
      });
    });
  });

  const groupedData = leafCriteriaData.reduce((acc, item) => {
    if (!acc[item.expert]) acc[item.expert] = {};
    if (!acc[item.expert][item.alternative]) acc[item.expert][item.alternative] = [];
    acc[item.expert][item.alternative].push({
      criterion: item.criterion,
      dataType: item.dataType,
    });
    return acc;
  }, {});

  return groupedData;
};

/**
 * Comprueba si existe algún criterio sin tipo de dato asignado.
 *
 * @param {object} groupedData Datos agrupados por experto y alternativa.
 * @returns {boolean}
 */
export const hasUndefinedDataTypes = (groupedData) => {
  return Object.values(groupedData).some((alternatives) =>
    Object.values(alternatives).some((criteria) =>
      criteria.some(({ dataType }) => !dataType || dataType.trim() === "")
    )
  );
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
export const isAlternativeNameDuplicate = (name, alternatives) => {
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
 * Comprueba si el nombre de un criterio ya existe en el árbol.
 *
 * @param {string} name Nombre del criterio.
 * @param {object[]} criteria Árbol de criterios.
 * @param {object|null} excludeCriterion Criterio a excluir en la comprobación.
 * @returns {boolean}
 */
const isCriteriaNameDuplicate = (name, criteria, excludeCriterion = null) => {
  const checkDuplicates = (items) => {
    return items.some((item) => {
      if (item.name === name && item !== excludeCriterion) return true;
      if (item.children?.length) return checkDuplicates(item.children);
      return false;
    });
  };

  return checkDuplicates(criteria);
};

/**
 * Valida el nombre de un criterio.
 *
 * @param {string} name Nombre del criterio.
 * @param {object[]} criteria Árbol de criterios.
 * @param {object|null} excludeCriterion Criterio a excluir en la comprobación.
 * @returns {string|null}
 */
export const validateCriterion = (
  name,
  criteria,
  excludeCriterion = null
) => {
  const trimmedValue = name.trim();

  if (!trimmedValue) return "Cannot be empty";
  if (trimmedValue.length > 35) return "Max 35 characters";
  if (isCriteriaNameDuplicate(trimmedValue, criteria, excludeCriterion)) {
    return "Criterion already exists";
  }

  return null;
};

/**
 * Actualiza recursivamente un criterio dentro del árbol.
 *
 * @param {object[]} items Árbol de criterios.
 * @param {object} editingCriterion Criterio a actualizar.
 * @param {string} newName Nuevo nombre.
 * @param {*} newType Nuevo tipo.
 * @returns {object[]}
 */
export const updateCriterion = (items, editingCriterion, newName, newType) => {
  return items.map((item) => {
    if (item.name === editingCriterion.name) {
      return { ...item, name: newName, type: newType };
    }

    if (item.children?.length) {
      return {
        ...item,
        children: updateCriterion(
          item.children,
          editingCriterion,
          newName,
          newType
        ),
      };
    }

    return item;
  });
};

/**
 * Elimina un criterio del árbol de forma recursiva.
 *
 * @param {object[]} items Árbol de criterios.
 * @param {object} itemToRemove Criterio a eliminar.
 * @returns {object[]}
 */
export const removeCriteriaItemRecursively = (items, itemToRemove) => {
  return items
    .map((i) => {
      if (i.name === itemToRemove.name) return null;

      if (i.children?.length) {
        return {
          ...i,
          children: removeCriteriaItemRecursively(i.children, itemToRemove),
        };
      }

      return i;
    })
    .filter(Boolean);
};

/**
 * Actualiza recursivamente los valores de criterios hoja para una combinación
 * de experto y alternativa.
 *
 * @param {object[]} criteria Árbol de criterios.
 * @param {number|string} expertIndex Índice del experto.
 * @param {number|string} altIndex Índice de la alternativa.
 * @param {*} value Valor a asignar.
 * @param {object} newData Estructura de salida.
 * @returns {object}
 */
export const updateCriterionRecursively = (
  criteria,
  expertIndex,
  altIndex,
  value,
  newData
) => {
  const update = (criterion, path) => {
    if (criterion.children && criterion.children.length > 0) {
      criterion.children.forEach((child, childIndex) => {
        update(child, `${path}-${childIndex}`);
      });
    } else {
      newData[`${expertIndex}-${altIndex}-${path}`] = value;
    }
  };

  criteria.forEach((criterion, critIndex) => {
    update(criterion, critIndex.toString());
  });

  return newData;
};

/**
 * Obtiene todos los criterios hoja de un árbol.
 *
 * @param {object[]} criteria Árbol de criterios.
 * @returns {object[]}
 */
export const getLeafCriteria = (criteria) => {
  const leaves = [];

  const traverse = (nodes) => {
    nodes.forEach((node) => {
      if (!node.children || node.children.length === 0) {
        leaves.push(node);
      } else {
        traverse(node.children);
      }
    });
  };

  traverse(criteria || []);
  return leaves;
};

/**
 * Valida los parámetros de un modelo según sus restricciones.
 *
 * @param {object} selectedModel Modelo seleccionado.
 * @param {object} paramValues Valores introducidos.
 * @param {object[]} criteria Criterios disponibles.
 * @returns {boolean}
 */
export const validateModelParams = (selectedModel, paramValues, criteria) => {
  const resolveValue = (param) => {
    const { name, type, restrictions, default: def } = param;
    let v = paramValues?.[name];

    const isEmpty =
      v === undefined ||
      v === null ||
      (typeof v === "string" && v.trim() === "");

    if (isEmpty) {
      if (def !== undefined) return def;

      if (type === "array" && restrictions?.length === "matchCriteria") {
        const len = Array.isArray(criteria) ? criteria.length : 0;
        if (len <= 0) return null;
        const eq = 1 / len;
        return Array(len).fill(eq);
      }

      if (type === "fuzzyArray" && restrictions?.length === "matchCriteria") {
        const len = Array.isArray(criteria) ? criteria.length : 0;
        if (len <= 0) return null;
        return Array.from({ length: len }, () => [0, 0.5, 1]);
      }
    }

    return v;
  };

  for (const param of selectedModel.parameters) {
    const { type, restrictions } = param;
    const value = resolveValue(param);

    if (value === null || value === undefined) return false;

    if (type === "number") {
      const num = Number(value);
      if (!Number.isFinite(num)) return false;

      if (Array.isArray(restrictions?.allowed)) {
        const allowedNums = restrictions.allowed.map(Number);
        if (!allowedNums.includes(num)) return false;
      }

      if (restrictions?.min !== undefined && num < restrictions.min) return false;
      if (restrictions?.max !== undefined && num > restrictions.max) return false;

      continue;
    }

    if (type === "array") {
      if (!Array.isArray(value)) return false;

      const expectedLength =
        restrictions?.length === "matchCriteria"
          ? criteria.length
          : restrictions?.length || value.length;

      if (value.length !== expectedLength) return false;

      const nums = value.map((v) => Number(v));
      if (nums.some((n) => !Number.isFinite(n))) return false;

      if (
        restrictions?.min !== undefined &&
        nums.some((n) => n < restrictions.min)
      ) {
        return false;
      }

      if (
        restrictions?.max !== undefined &&
        nums.some((n) => n > restrictions.max)
      ) {
        return false;
      }

      if (
        expectedLength === 2 &&
        restrictions?.length !== "matchCriteria" &&
        !restrictions?.sum
      ) {
        if (nums[0] > nums[1]) return false;
      }

      if (typeof restrictions?.sum === "number") {
        const sum = nums.reduce((acc, n) => acc + n, 0);
        if (sum !== restrictions.sum) return false;
      }

      continue;
    }

    if (type === "fuzzyArray") {
      if (!Array.isArray(value)) return false;

      const expectedLength =
        restrictions?.length === "matchCriteria"
          ? criteria.length
          : restrictions?.length || value.length;

      if (value.length !== expectedLength) return false;

      for (const triple of value) {
        if (!Array.isArray(triple) || triple.length !== 3) return false;

        const [l, m, u] = triple.map(Number);
        if (![l, m, u].every((n) => Number.isFinite(n))) return false;
        if (!(l <= m && m <= u)) return false;

        if (
          restrictions?.min !== undefined &&
          [l, m, u].some((n) => n < restrictions.min)
        ) {
          return false;
        }

        if (
          restrictions?.max !== undefined &&
          [l, m, u].some((n) => n > restrictions.max)
        ) {
          return false;
        }
      }

      continue;
    }

    return false;
  }

  return true;
};

/**
 * Valida que todas las asignaciones de dominio tengan un dominio seleccionado.
 *
 * @param {object} domainAssignments Asignaciones de dominios.
 * @returns {boolean}
 */
export const validateDomainAssigments = (domainAssignments) => {
  if (!domainAssignments?.experts) return false;

  for (const [, expertData] of Object.entries(domainAssignments.experts)) {
    for (const [, altData] of Object.entries(expertData.alternatives || {})) {
      for (const [, domainId] of Object.entries(altData.criteria || {})) {
        if (!domainId || domainId === "undefined") {
          return false;
        }
      }
    }
  }

  return true;
};

/**
 * Construye los valores por defecto de los parámetros de un modelo.
 *
 * @param {object} allData Datos necesarios para construir los valores.
 * @returns {object}
 */
export const setDefaults = (allData) => {
  const newValues = {};

  allData.selectedModel.parameters.forEach((param) => {
    const { name, type, restrictions, default: defaultValue } = param;

    if (type === "number") {
      newValues[name] = defaultValue ?? "";
    }

    if (type === "array") {
      const length =
        restrictions?.length === "matchCriteria"
          ? allData.criteria.length
          : restrictions?.length || 2;

      let values;

      if (restrictions?.length === "matchCriteria") {
        const equalWeight = 1 / length;
        values = Array(length).fill(equalWeight);
      } else if (
        restrictions?.min !== null &&
        restrictions?.max !== null
      ) {
        values = defaultValue ?? [restrictions.min, restrictions.max];
      } else {
        values = defaultValue ?? Array(length).fill("");
      }

      newValues[name] = values;
    }

    if (type === "fuzzyArray") {
      const length =
        restrictions?.length === "matchCriteria"
          ? allData.criteria.length
          : restrictions?.length || 1;

      const delta = 0.05;
      let values;

      if (restrictions?.length === "matchCriteria") {
        const equalWeight = 1 / length;
        values = Array(length)
          .fill(null)
          .map(() => [
            Math.max(0, +(equalWeight - delta).toFixed(2)),
            +equalWeight.toFixed(2),
            Math.min(1, +(equalWeight + delta).toFixed(2)),
          ]);
      } else {
        values = defaultValue ?? Array(length).fill([0, 0, 0]);
      }

      newValues[name] = values;
    }
  });

  return newValues;
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
  const newValues = { ...prev };

  selectedModel?.parameters.forEach((param) => {
    const { name, type, restrictions } = param;

    if (type === "array" && restrictions?.length === "matchCriteria") {
      const length = criteria.length;
      const equalWeight = 1 / length;

      if (!Array.isArray(newValues[name]) || newValues[name].length !== length) {
        newValues[name] = Array(length).fill(equalWeight);
      }
    }

    if (type === "fuzzyArray" && restrictions?.length === "matchCriteria") {
      const length = criteria.length;
      const equalWeight = 1 / length;
      const delta = 0.05;

      if (
        !Array.isArray(newValues[name]) ||
        newValues[name].length !== length ||
        newValues[name].some((t) => !Array.isArray(t) || t.length !== 3)
      ) {
        newValues[name] = Array(length)
          .fill(null)
          .map(() => [
            Math.max(0, +(equalWeight - delta).toFixed(2)),
            +equalWeight.toFixed(2),
            Math.min(1, +(equalWeight + delta).toFixed(2)),
          ]);
      }
    }
  });

  return newValues;
};

/**
 * Agrupa asignaciones de dominios por experto y alternativa.
 *
 * @param {object} domainAssignments Asignaciones de dominios.
 * @returns {object}
 */
export const groupDomainData = (domainAssignments) => {
  if (!domainAssignments?.experts) return {};

  const data = {};

  Object.entries(domainAssignments.experts).forEach(([expert, expertData]) => {
    data[expert] = {};

    Object.entries(expertData.alternatives).forEach(([alt, altData]) => {
      data[expert][alt] = Object.entries(altData.criteria).map(
        ([criterion, dataType]) => ({
          criterion,
          dataType,
        })
      );
    });
  });

  return data;
};

/**
 * Construye la estructura inicial de asignaciones de dominios.
 *
 * @param {string[]} experts Expertos seleccionados.
 * @param {string[]} alternatives Alternativas del issue.
 * @param {object[]} criteria Criterios del issue.
 * @param {object} currentAssignments Asignaciones actuales.
 * @param {object} selectedModel Modelo seleccionado.
 * @param {object[]} globalDomains Dominios globales.
 * @param {object[]} expressionDomains Dominios del usuario.
 * @returns {object}
 */
export const buildInitialAssignments = (
  experts,
  alternatives,
  criteria,
  currentAssignments = { experts: {} },
  selectedModel,
  globalDomains,
  expressionDomains
) => {
  const supportsNumeric = !!selectedModel?.supportedDomains?.numeric?.enabled;
  const supportsLinguistic = !!selectedModel?.supportedDomains?.linguistic?.enabled;

  const numericDomains = supportsNumeric
    ? globalDomains.filter((d) => d.type === "numeric")
    : [];

  const linguisticDomains = supportsLinguistic
    ? [...globalDomains, ...expressionDomains].filter(
        (d) => d.type === "linguistic"
      )
    : [];

  const validDomainIds = [
    ...numericDomains.map((d) => d._id),
    ...linguisticDomains.map((d) => d._id),
  ];

  const defaultDomainId =
    numericDomains.find(
      (d) => d.numericRange?.min === 0 && d.numericRange?.max === 1
    )?._id ||
    linguisticDomains[0]?._id ||
    "undefined";

  const updated = structuredClone(currentAssignments || { experts: {} });

  if (!updated.experts) updated.experts = {};

  Object.keys(updated.experts).forEach((exp) => {
    if (!experts.includes(exp)) delete updated.experts[exp];
  });

  experts.forEach((exp) => {
    if (!updated.experts[exp]) updated.experts[exp] = { alternatives: {} };
  });

  experts.forEach((exp) => {
    const expertData = updated.experts[exp];

    Object.keys(expertData.alternatives || {}).forEach((alt) => {
      if (!alternatives.includes(alt)) delete expertData.alternatives[alt];
    });

    alternatives.forEach((alt) => {
      if (!expertData.alternatives[alt]) {
        expertData.alternatives[alt] = { criteria: {} };
      }

      const criteriaData = expertData.alternatives[alt].criteria;

      Object.keys(criteriaData || {}).forEach((critName) => {
        if (!criteria.some((c) => c.name === critName)) {
          delete criteriaData[critName];
        }
      });

      criteria.forEach((crit) => {
        const critName = crit.name;
        const currentDomain = criteriaData[critName];

        if (!currentDomain || !validDomainIds.includes(currentDomain)) {
          criteriaData[critName] = defaultDomainId;
        }
      });
    });
  });

  return updated;
};

/**
 * Devuelve el valor común de una colección o "mixed" si hay varios.
 *
 * @param {Array<*>} values Valores a comparar.
 * @returns {*}
 */
export const getMixedOrValue = (values) => {
  const unique = [...new Set(values.filter((v) => v !== undefined && v !== null))];

  if (unique.length === 1) return unique[0];
  if (unique.length > 1) return "mixed";

  return null;
};