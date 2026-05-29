import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { sameId } from "../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../utils/common/mongoose.js";

const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

export const getEditableUserExpressionDomainOrThrow = async ({
  domainId,
  userId,
  session = null,
}) => {
  if (!domainId || !isValidObjectIdLike(domainId)) {
    throw createBadRequestError("Valid domain id is required", {
      field: "domainId",
    });
  }

  const domain = await withOptionalSession(
    ExpressionDomain.findById(domainId),
    session
  );

  if (!domain) {
    throw createNotFoundError("Domain not found", {
      field: "domainId",
    });
  }

  if (domain.isGlobal || domain.user === null) {
    throw createForbiddenError(
      "Global domains are predefined and cannot be modified."
    );
  }

  if (!sameId(domain.user, userId)) {
    throw createForbiddenError("Not authorized");
  }

  return domain;
};
