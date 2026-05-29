import { getEditableUserExpressionDomainOrThrow } from "./getEditableExpressionDomain.js";

export const removeUserExpressionDomain = async ({ domainId, userId }) => {
  const domain = await getEditableUserExpressionDomainOrThrow({
    domainId,
    userId,
  });

  const domainName = domain.name;

  await domain.deleteOne();

  return { domainName };
};
