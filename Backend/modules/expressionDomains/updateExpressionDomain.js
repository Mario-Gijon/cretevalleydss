import { createBadRequestError } from "../../utils/common/errors.js";
import { isPlainObject } from "../../utils/common/objects.js";
import { getEditableUserExpressionDomainOrThrow } from "./getEditableExpressionDomain.js";
import { normalizeNewExpressionDomainPayload } from "./normalizeExpressionDomainPayload.js";

export const updateUserExpressionDomain = async ({
  domainId,
  userId,
  updatedDomain,
  session = null,
}) => {
  if (!isPlainObject(updatedDomain)) {
    throw createBadRequestError("updatedDomain is required", {
      field: "updatedDomain",
    });
  }

  const domain = await getEditableUserExpressionDomainOrThrow({
    domainId,
    userId,
    session,
  });

  const normalizedDomain = normalizeNewExpressionDomainPayload({
    name: updatedDomain.name ?? domain.name,
    type: updatedDomain.type ?? domain.type,
    numericRange: updatedDomain.numericRange ?? domain.numericRange,
    membershipFunction:
      updatedDomain.membershipFunction ?? domain.membershipFunction,
    valuesMode: updatedDomain.valuesMode ?? domain.valuesMode,
    linguisticLabels: updatedDomain.linguisticLabels ?? domain.linguisticLabels,
    isGlobal: domain.isGlobal,
  });

  domain.name = normalizedDomain.name;
  domain.type = normalizedDomain.type;
  domain.numericRange =
    normalizedDomain.type === "numeric" ? normalizedDomain.numericRange : null;
  domain.membershipFunction =
    normalizedDomain.type === "linguistic"
      ? normalizedDomain.membershipFunction
      : null;
  domain.valueCount =
    normalizedDomain.type === "linguistic" ? normalizedDomain.valueCount : null;
  domain.valuesMode =
    normalizedDomain.type === "linguistic" ? normalizedDomain.valuesMode : null;
  domain.linguisticLabels = normalizedDomain.linguisticLabels;

  await domain.save(session ? { session } : undefined);

  return domain;
};
