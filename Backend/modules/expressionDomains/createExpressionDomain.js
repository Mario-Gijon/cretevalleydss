import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { toIdString } from "../../utils/common/ids.js";
import { normalizeNewExpressionDomainPayload } from "./normalizeExpressionDomainPayload.js";

export const createUserExpressionDomain = async ({ userId, payload }) => {
  const normalizedDomain = normalizeNewExpressionDomainPayload(payload);

  const newDomain = new ExpressionDomain({
    name: normalizedDomain.name,
    typeKey: normalizedDomain.typeKey,
    family: normalizedDomain.family,
    definition: normalizedDomain.definition,
    isGlobal: false,
    user: toIdString(userId),
  });

  await newDomain.save();

  return newDomain;
};
