import { isPlainObject } from "../../../utils/common/objects.js";

const SUPPORTED_TIE_POLICIES = new Set(["optimistic", "pessimistic"]);

export const normalizeAHPSortGroupConfiguration = (value) => {
  if (!isPlainObject(value)) {
    return { error: "must be an object containing tiePolicy" };
  }

  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "tiePolicy") {
    return { error: "must contain tiePolicy only" };
  }

  if (!SUPPORTED_TIE_POLICIES.has(value.tiePolicy)) {
    return { error: "tiePolicy must be 'optimistic' or 'pessimistic'" };
  }

  return { value: { tiePolicy: value.tiePolicy } };
};
