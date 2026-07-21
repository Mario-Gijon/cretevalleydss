import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { toIdString } from "../../utils/common/ids.js";
import { serializeExpressionDomain } from "./serializeExpressionDomain.js";

export const getExpressionDomainsPayload = async ({ userId }) => {
  const normalizedUserId = toIdString(userId);

  const [globals, userDomains] = await Promise.all([
    ExpressionDomain.find({ owner: null })
      .sort({ name: 1 })
      .lean(),
    ExpressionDomain.find({ owner: normalizedUserId })
      .sort({ name: 1 })
      .lean(),
  ]);

  return {
    globals: globals.map(serializeExpressionDomain),
    userDomains: userDomains.map(serializeExpressionDomain),
  };
};
