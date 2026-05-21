import { useEffect, useMemo } from "react";
import BestWorstCriteriaPayloadEditor, {
  normalizeBestWorstCriteriaDraftPayload,
} from "./BestWorstCriteriaPayloadEditor";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isDeepEqual = (left, right) => {
  if (left === right) return true;

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    return left.every((item, index) => isDeepEqual(item, right[index]));
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => isDeepEqual(left[key], right[key]));
  }

  return false;
};

export const BestWorstCriteriaCreationComponent = ({ creationContext }) => {
  const criterionNames = useMemo(
    () =>
      (Array.isArray(creationContext?.criterionNames)
        ? creationContext.criterionNames
        : []
      ).filter(Boolean),
    [creationContext?.criterionNames]
  );

  const payload = creationContext?.payload;
  const setPayload = creationContext?.setPayload;

  const normalizedPayload = useMemo(
    () =>
      normalizeBestWorstCriteriaDraftPayload({
        criterionNames,
        payload,
      }),
    [criterionNames, payload]
  );

  useEffect(() => {
    if (typeof setPayload !== "function") {
      return;
    }

    if (isDeepEqual(payload || {}, normalizedPayload)) {
      return;
    }

    setPayload(normalizedPayload);
  }, [payload, normalizedPayload, setPayload]);

  return (
    <BestWorstCriteriaPayloadEditor
      criterionNames={criterionNames}
      payload={normalizedPayload}
      setPayload={setPayload}
    />
  );
};

export default BestWorstCriteriaCreationComponent;
