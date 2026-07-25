import { isPlainObject } from "../../../../../../utils/common/objects";

export const resolveCriteria = ({ decisionContext }) => {
  if (!isPlainObject(decisionContext)) {
    throw new Error("BWM decision context must be an object.");
  }

  if (!Array.isArray(decisionContext.leafCriteria)) {
    throw new Error("BWM leaf criteria must be an array.");
  }

  const seenIds = new Set();

  return decisionContext.leafCriteria.map((criterion, index) => {
    const id = typeof criterion?.id === "string" ? criterion.id.trim() : "";
    const name =
      typeof criterion?.name === "string" ? criterion.name.trim() : "";

    if (!id || !name) {
      throw new Error(`BWM criterion at index ${index} is invalid.`);
    }

    if (seenIds.has(id)) {
      throw new Error(`BWM criterion id "${id}" is duplicated.`);
    }

    seenIds.add(id);

    return { id, name, index };
  });
};
