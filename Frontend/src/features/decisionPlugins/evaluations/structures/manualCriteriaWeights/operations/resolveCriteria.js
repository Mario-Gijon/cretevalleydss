import { isPlainObject } from "../../../../../../utils/common/objects";

export const resolveCriteria = ({ decisionContext }) => {
  if (!isPlainObject(decisionContext)) {
    throw new Error("Manual-weight decision context must be an object.");
  }

  if (!Array.isArray(decisionContext.leafCriteria)) {
    throw new Error("Manual-weight leaf criteria must be an array.");
  }

  const seenIds = new Set();

  return decisionContext.leafCriteria.map((criterion, index) => {
    if (!isPlainObject(criterion)) {
      throw new Error(`Manual-weight criterion at index ${index} is invalid.`);
    }

    const id = typeof criterion.id === "string" ? criterion.id.trim() : "";
    const name =
      typeof criterion.name === "string" ? criterion.name.trim() : "";

    if (!id) {
      throw new Error(`Manual-weight criterion id at index ${index} is invalid.`);
    }

    if (!name) {
      throw new Error(`Manual-weight criterion name at index ${index} is invalid.`);
    }

    if (seenIds.has(id)) {
      throw new Error(`Manual-weight criterion id "${id}" is duplicated.`);
    }

    seenIds.add(id);
    return { id, name, index };
  });
};
