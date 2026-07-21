import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { buildCanonicalGlobalExpressionDomains } from "./globalExpressionDomains.js";

export const resetGlobalExpressionDomains = async ({ session = null } = {}) => {
  const canonicalDomains = buildCanonicalGlobalExpressionDomains();
  const deleteOptions = session ? { session } : undefined;
  const insertOptions = session ? { session } : undefined;

  const deletedResult = await ExpressionDomain.deleteMany(
    { owner: null },
    deleteOptions
  );
  const insertedDomains = await ExpressionDomain.insertMany(
    canonicalDomains,
    insertOptions
  );

  return {
    deletedCount: deletedResult.deletedCount,
    insertedCount: insertedDomains.length,
    insertedNames: insertedDomains.map(({ name }) => name),
  };
};
