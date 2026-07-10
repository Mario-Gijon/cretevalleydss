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
    typeKey: updatedDomain.typeKey ?? domain.typeKey,
    definition: updatedDomain.definition ?? domain.definition,
    isGlobal: domain.isGlobal,
  });

  domain.name = normalizedDomain.name;
  domain.typeKey = normalizedDomain.typeKey;
  domain.definition = normalizedDomain.definition;

  await domain.save(session ? { session } : undefined);

  return domain;
};
