const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeKey = (value) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const resolveLeafCriteriaRows = (leafCriteria) => {
  if (!Array.isArray(leafCriteria)) {
    return [];
  }

  return leafCriteria
    .map((criterion, index) => {
      const key =
        normalizeKey(criterion?.id) ||
        normalizeKey(criterion?._id);
      const name = normalizeKey(criterion?.name) || `Criterion ${index + 1}`;

      if (!key) {
        return null;
      }

      return { key, name };
    })
    .filter(Boolean);
};

const normalizeEnumAllowed = (allowed) => {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return { allowed: null, kind: null };
  }

  const allNumbers = allowed.every(
    (item) => typeof item === "number" && Number.isFinite(item)
  );
  if (allNumbers) {
    return { allowed, kind: "number" };
  }

  const allStrings = allowed.every((item) => typeof item === "string");
  if (allStrings) {
    return {
      allowed: allowed.map((item) => item.trim()),
      kind: "string",
    };
  }

  return { allowed, kind: "mixed" };
};

const validateCriterionEntry = ({ value, restrictions }) => {
  const valueType = normalizeKey(restrictions?.valueType) || "number";

  if (valueType === "number") {
    const normalized = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(normalized)) {
      return { isValid: false, message: "Value must be a valid number." };
    }

    if (typeof restrictions?.min === "number" && normalized < restrictions.min) {
      return {
        isValid: false,
        message: `Value must be greater than or equal to ${restrictions.min}.`,
      };
    }

    if (typeof restrictions?.max === "number" && normalized > restrictions.max) {
      return {
        isValid: false,
        message: `Value must be less than or equal to ${restrictions.max}.`,
      };
    }

    return { isValid: true, value: normalized };
  }

  if (valueType === "enum") {
    const normalizedAllowed = normalizeEnumAllowed(restrictions?.allowed);

    if (!normalizedAllowed.allowed) {
      return {
        isValid: false,
        message: "Enum criterionMap requires restrictions.allowed.",
      };
    }

    let normalized = value;

    if (normalizedAllowed.kind === "number") {
      normalized = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(normalized)) {
        return { isValid: false, message: "Value must be a valid number." };
      }
    } else if (normalizedAllowed.kind === "string") {
      if (typeof value !== "string") {
        return { isValid: false, message: "Value must be a string." };
      }
      normalized = value.trim();
    }

    const isAllowed = normalizedAllowed.allowed.some((allowedItem) =>
      Object.is(allowedItem, normalized)
    );

    if (!isAllowed) {
      return {
        isValid: false,
        message: "Value must be one of the allowed options.",
      };
    }

    return { isValid: true, value: normalized };
  }

  return {
    isValid: false,
    message: `Unsupported criterionMap valueType '${valueType}'.`,
  };
};

export const validateCriterionMapParameterValue = ({
  parameter,
  value,
  leafCriteria,
}) => {
  const restrictions = isPlainObject(parameter?.restrictions)
    ? parameter.restrictions
    : {};
  const rows = resolveLeafCriteriaRows(leafCriteria);

  if (!isPlainObject(value)) {
    return { isValid: false, message: "Criterion map must be an object." };
  }

  const allowedKeys = new Set(rows.map((row) => row.key));
  const unknownKey = Object.keys(value).find((key) => !allowedKeys.has(key));

  if (unknownKey) {
    return {
      isValid: false,
      message: `Unknown criterion key '${unknownKey}'.`,
    };
  }

  const requiredForEachCriterion = restrictions.requiredForEachCriterion === true;

  if (requiredForEachCriterion) {
    const missing = rows.find(
      (row) => !Object.prototype.hasOwnProperty.call(value, row.key)
    );

    if (missing) {
      return {
        isValid: false,
        message: `Missing value for criterion '${missing.name}'.`,
      };
    }
  }

  for (const row of rows) {
    if (!Object.prototype.hasOwnProperty.call(value, row.key)) {
      continue;
    }

    const itemValidation = validateCriterionEntry({
      value: value[row.key],
      restrictions,
    });

    if (!itemValidation.isValid) {
      return {
        isValid: false,
        message: `${row.name}: ${itemValidation.message}`,
      };
    }
  }

  return { isValid: true };
};

export { resolveLeafCriteriaRows };
