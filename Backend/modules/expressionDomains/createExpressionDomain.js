import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { toIdString } from "../../utils/common/ids.js";
import { normalizeNewExpressionDomainPayload } from "./normalizeExpressionDomainPayload.js";

export const createUserExpressionDomain = async ({ userId, payload }) => {
  const normalizedDomain = normalizeNewExpressionDomainPayload(payload);

  const newDomain = new ExpressionDomain({
    name: normalizedDomain.name,
    type: normalizedDomain.type,
    isGlobal: false,
    user: toIdString(userId),
    ...(normalizedDomain.type === "numeric"
      ? { numericRange: normalizedDomain.numericRange }
      : {}),
    ...(normalizedDomain.type === "linguistic"
      ? {
          membershipFunction: normalizedDomain.membershipFunction,
          valueCount: normalizedDomain.valueCount,
          valuesMode: normalizedDomain.valuesMode,
          linguisticLabels: normalizedDomain.linguisticLabels,
        }
      : {}),
  });

  await newDomain.save();

  return newDomain;
};
