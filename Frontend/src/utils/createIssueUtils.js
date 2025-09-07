import { getAllUsers, getModelsInfo } from "../controllers/issueController";
import dayjs from "dayjs";

export const steps = ['Model', 'Alternatives', 'Criteria', 'Experts', 'Expression domain', 'Summary'];

export const dataTypeOptions = [
  /* { label: "Linguistic", value: 1 }, */
  { label: "Numeric", options: [/* { label: "Integer", value: 2 },  */{ label: "Float", value: 3 }] },
  /* { label: "Interval", options: [{ label: "Integer", value: 4 }, { label: "Float", value: 5 }] } */
];

// Mapeo de los valores numéricos a descripciones legibles
/* const dataTypeLabels = {
  1: "Linguistic", // Representa un tipo de dato lingüístico
  2: "Numeric Integer",    // Representa un número entero
  3: "Numeric Float",      // Representa un número con decimales
  4: "Interval Integer",    // Intervalo con enteros
  5: "Interval Float"       // Intervalo con números decimales
}; */

/* export const generateDomainExpressions = (data) => {
  const { dataTypes, alternatives, criteria, addedExperts } = data;
  const domainExpressions = {};

  // Función recursiva para manejar criterios con múltiples niveles de hijos
  const processCriterion = (criterion, expertIndex, altIndex, critPath) => {
    const key = `${expertIndex}-${altIndex}-${critPath}`;
    const dataType = dataTypes[key] ? dataTypeLabels[dataTypes[key]] : null;

    const result = {
      name: criterion.name,
      data: criterion.children.length === 0 ? dataType : null, // Solo asignar si es un nodo hoja
      children: criterion.children.length > 0 ? [] : false,
    };

    // Si tiene hijos, procesarlos recursivamente
    if (criterion.children.length > 0) {
      criterion.children.forEach((child, childIndex) => {
        result.children.push(processCriterion(child, expertIndex, altIndex, `${critPath}-${childIndex}`));
      });
    }

    return result;
  };

  // Recorremos todos los expertos y alternativas
  addedExperts.forEach((expert, expertIndex) => {
    domainExpressions[expert] = {};

    alternatives.forEach((alternative, altIndex) => {
      domainExpressions[expert][alternative] = {};

      // Procesar cada criterio con la función recursiva
      criteria.forEach((criterion, critIndex) => {
        domainExpressions[expert][alternative][criterion.name] = processCriterion(criterion, expertIndex, altIndex, `${critIndex}`);
      });
    });
  });

  return domainExpressions;
};
*/

export const generateDomainExpressions = ({ alternatives, criteria, addedExperts }) => {
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
        domainExpressions[expert][alternative][criterion.name] = processCriterion(criterion);
      });
    });
  });

  return domainExpressions;
};


export const fetchExpertsAndModels = async (setInitialExperts, setModels) => {
  const initExpertsData = await getAllUsers();
  setInitialExperts(initExpertsData)
  const initModelsData = await getModelsInfo();
  setModels(initModelsData);
}

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

export const validateIssueDescription = (issueDescription, setIssueDescriptionError) => {
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

// Función para eliminar tildes de una cadena
export const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const getRemainingTime = (closureDate) => {
  if (!closureDate) return "Selecciona una fecha";

  const now = dayjs();
  const years = closureDate.diff(now, "year");
  const months = closureDate.diff(now.add(years, "year"), "month");
  const days = closureDate.diff(now.add(years, "year").add(months, "month"), "day");

  // Si no hay días restantes, calculamos las horas.
  let hours = closureDate.diff(now.add(years, "year").add(months, "month").add(days, "day"), "hour");

  let message = "Close in ";
  if (years > 0) message += `${years} year${years > 1 ? "s" : ""}, `;
  if (months > 0) message += `${months} month${months > 1 ? "s" : ""}, `;
  if (days > 0) message += `${days} day${days !== 1 ? "s" : ""}, `;
  if (hours > 0) message += `${hours} hour${hours !== 1 ? "s" : ""}`;

  // Si ya es el mismo día, mostramos las horas restantes.
  if (days === 0 && hours === 0) {
    message = `Close in less than an hour`;
  }

  return message;
};

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
      criterion.children.forEach(child => traverseCriteria(expert, alternative, child));
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
    acc[item.expert][item.alternative].push({ criterion: item.criterion, dataType: item.dataType });
    return acc;
  }, {});

  return groupedData;
};

export const hasUndefinedDataTypes = (groupedData) => {
  return Object.values(groupedData).some((alternatives) =>
    Object.values(alternatives).some((criteria) =>
      criteria.some(({ dataType }) => !dataType || dataType.trim() === "")
    )
  );
};

export const filterModels = (models, withConsensus, searchQuery) => {
  return models.filter((model) => {
    const matchesConsensus = withConsensus ? model.isConsensus : !model.isConsensus;
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesConsensus && matchesSearch;
  });
};

export const isAlternativeNameDuplicate = (name, alternatives) => {
  return alternatives.includes(name);
};

export const addAlternative = (inputValue, alternatives, setAlternatives, setInputValue, setInputError) => {
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
  setInputValue(""); // Limpiar el input
  setInputError(""); // Limpiar errores
};

export const removeAlternative = (item, setAlternatives) => {
  setAlternatives((prev) => prev.filter((i) => i !== item));
};

export const saveEditAlternative = (editValue, editingAlternative, alternatives, setAlternatives, setEditingAlternative, setEditValue, setEditError) => {
  const trimmedValue = editValue.trim();

  if (!trimmedValue) {
    setEditError("Alternative cannot be empty");
    return;
  }

  if (trimmedValue.length > 35) {
    setEditError("Max 35 characters");
    return;
  }

  if (isAlternativeNameDuplicate(trimmedValue, alternatives) && trimmedValue !== editingAlternative) {
    setEditError("Alternative already exists");
    return;
  }

  setAlternatives((prev) =>
    prev.map((alt) => (alt === editingAlternative ? trimmedValue : alt))
  );

  setEditingAlternative(null); // Salir del modo edición
  setEditValue(""); // Limpiar campo
  setEditError(null); // Limpiar error
};

// utils.js
// utils.js

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

export const validateCriterion = (name, criteria, excludeCriterion = null) => {
  const trimmedValue = name.trim();
  if (!trimmedValue) return "Cannot be empty";
  if (trimmedValue.length > 35) return "Max 35 characters";
  if (isCriteriaNameDuplicate(trimmedValue, criteria, excludeCriterion)) return "Criterion already exists";
  return null; // No hay errores
};

export const updateCriterion = (items, editingCriterion, newName, newType) => {
  return items.map((item) => {
    if (item.name === editingCriterion.name) {
      return { ...item, name: newName, type: newType };
    }
    if (item.children?.length) {
      return { ...item, children: updateCriterion(item.children, editingCriterion, newName, newType) };
    }
    return item;
  });
};

export const removeCriteriaItemRecursively = (items, itemToRemove) => {
  return items
    .map((i) => {
      if (i.name === itemToRemove.name) return null;
      if (i.children?.length) {
        return { ...i, children: removeCriteriaItemRecursively(i.children, itemToRemove) };
      }
      return i;
    })
    .filter(Boolean);
};

export const updateCriterionRecursively = (criteria, expertIndex, altIndex, value, newData) => {
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

export const getLeafCriteria = (criteria) => {
  const leafCriteria = [];

  const traverse = (criterion, path) => {
    if (criterion.children && criterion.children.length > 0) {
      criterion.children.forEach((child, childIndex) => {
        traverse(child, `${path}-${childIndex}`);
      });
    } else {
      leafCriteria.push({ ...criterion, path });
    }
  };

  criteria.forEach((criterion, critIndex) => {
    traverse(criterion, critIndex.toString());
  });

  return leafCriteria;
};

export const validateModelParams = (selectedModel, paramValues, criteria) => {
  // Obtiene el valor efectivo a validar (paramValues -> default -> pesos iguales)
  const resolveValue = (param) => {
    const { name, type, restrictions, default: def } = param;
    let v = paramValues?.[name];

    const isEmpty =
      v === undefined ||
      v === null ||
      (typeof v === "string" && v.trim() === "");

    if (isEmpty) {
      if (def !== undefined) return def;

      // Si son pesos por criterio y no hay valor ni default, generar iguales
      if (type === "array" && restrictions?.length === "matchCriteria") {
        const len = Array.isArray(criteria) ? criteria.length : 0;
        if (len <= 0) return null;
        const eq = 1 / len;
        return Array(len).fill(eq);
      }
    }
    return v;
  };

  for (const param of selectedModel.parameters) {
    const { type, restrictions } = param;
    const value = resolveValue(param);

    if (value === null || value === undefined) return false;

    // --- NUMBER ---
    if (type === "number") {
      const num = Number(value);
      if (!Number.isFinite(num)) return false;

      // allowed tiene prioridad
      if (Array.isArray(restrictions?.allowed)) {
        const allowedNums = restrictions.allowed.map(Number);
        if (!allowedNums.includes(num)) return false;
      }

      if (restrictions?.min !== undefined && restrictions.min !== null) {
        if (num < restrictions.min) return false;
      }
      if (restrictions?.max !== undefined && restrictions.max !== null) {
        if (num > restrictions.max) return false;
      }
      continue;
    }

    // --- ARRAY ---
    if (type === "array") {
      if (!Array.isArray(value)) return false;

      const expectedLength =
        restrictions?.length === "matchCriteria"
          ? criteria.length
          : restrictions?.length || value.length;

      if (value.length !== expectedLength) return false;

      const nums = value.map((v) => Number(v));
      if (nums.some((n) => !Number.isFinite(n))) return false;

      const hasMin = restrictions?.min !== undefined && restrictions?.min !== null;
      const hasMax = restrictions?.max !== undefined && restrictions?.max !== null;

      if (hasMin && nums.some((n) => n < restrictions.min)) return false;
      if (hasMax && nums.some((n) => n > restrictions.max)) return false;

      // Intervalo [a,b]: izquierda < derecha
      const isMatchCriteria = restrictions?.length === "matchCriteria";
      const hasSumRule = typeof restrictions?.sum === "number";
      if (!isMatchCriteria && !hasSumRule && expectedLength === 2) {
        if (nums[0] > nums[1]) return false;
      }

      // Suma exacta (p. ej. TOPSIS = 1). Sin tolerancia.
      if (hasSumRule) {
        const sum = nums.reduce((acc, n) => acc + n, 0);
        if (sum !== restrictions.sum) return false;
      }
      continue;
    }

    // Tipo desconocido
    return false;
  }

  return true;
};
