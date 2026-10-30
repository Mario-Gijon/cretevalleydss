import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { buildCanonicalSaatyExpressionDomain } from "./types/numericSaaty/globalDomain.js";

const createFilter = (domain) => ({ owner: null, name: domain.name });

export const syncGlobalSaatyExpressionDomain = async ({
  session = null,
  model = ExpressionDomain,
} = {}) => {
  const domain = buildCanonicalSaatyExpressionDomain();
  const filter = createFilter(domain);
  const update = {
    $set: {
      typeKey: domain.typeKey,
      definition: domain.definition,
    },
    $setOnInsert: {
      name: domain.name,
      owner: null,
    },
  };
  const options = { upsert: true, ...(session ? { session } : {}) };
  const writeResult = await model.updateOne(filter, update, options);
  let query = model.findOne(filter);
  if (session) query = query.session(session);
  const persisted = await query.lean().exec();

  return {
    domain: persisted,
    created: Boolean(writeResult.upsertedCount),
    modified: Boolean(writeResult.modifiedCount),
  };
};
