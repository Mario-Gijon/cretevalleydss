import { isPlainObject } from "../../../utils/common/objects";

const OMITTED_CONSTRAINT_VALUE = Symbol("omittedConstraintValue");

const stripNullConstraintPlaceholdersInternal = (value) => {
  if (value === null) {
    return OMITTED_CONSTRAINT_VALUE;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const nextObject = Object.entries(value).reduce((accumulator, [key, childValue]) => {
    const normalizedChild = stripNullConstraintPlaceholdersInternal(childValue);

    if (normalizedChild !== OMITTED_CONSTRAINT_VALUE) {
      accumulator[key] = normalizedChild;
    }

    return accumulator;
  }, {});

  return Object.keys(nextObject).length > 0
    ? nextObject
    : OMITTED_CONSTRAINT_VALUE;
};

export const stripNullConstraintPlaceholders = (value) => {
  const normalizedValue = stripNullConstraintPlaceholdersInternal(value);

  if (normalizedValue === OMITTED_CONSTRAINT_VALUE) {
    return {};
  }

  return normalizedValue;
};
