import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { toIdString } from "../../utils/common/ids.js";

export const getExpressionDomainsPayload = async ({ userId }) => {
  const normalizedUserId = toIdString(userId);

  const [globals, userDomains] = await Promise.all([
    ExpressionDomain.find({ isGlobal: true, user: null })
      .sort({ name: 1 })
      .lean(),
    ExpressionDomain.find({ isGlobal: false, user: normalizedUserId })
      .sort({ name: 1 })
      .lean(),
  ]);

  return {
    globals,
    userDomains,
  };
};
