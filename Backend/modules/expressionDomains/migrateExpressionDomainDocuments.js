import mongoose from "mongoose";

const isObjectId = (value) => value instanceof mongoose.Types.ObjectId;

const hasOwn = (document, key) =>
  Object.prototype.hasOwnProperty.call(document ?? {}, key);

const isNull = (value) => value === null;

const resolveLegacyOwnerOrThrow = (document) => {
  if (hasOwn(document, "owner")) {
    if (document.owner === null || isObjectId(document.owner)) {
      return document.owner;
    }

    throw new Error("owner must be null or an ObjectId");
  }

  if (document?.isGlobal === true && isNull(document?.user)) {
    return null;
  }

  if (document?.isGlobal === false && isObjectId(document?.user)) {
    return document.user;
  }

  throw new Error("inconsistent legacy ownership fields");
};

export const getExpressionDomainMigrationProblem = (document) => {
  try {
    resolveLegacyOwnerOrThrow(document);
    return null;
  } catch (error) {
    return {
      id: String(document?._id ?? ""),
      reason: error.message,
    };
  }
};

export const buildMigratedExpressionDomainFields = (document, now = new Date()) => {
  const createdAt = document?.createdAt ?? now;

  return {
    owner: resolveLegacyOwnerOrThrow(document),
    createdAt,
    updatedAt: document?.updatedAt ?? createdAt,
  };
};

export const getIssueExpressionDomainMigrationProblem = (document) => {
  if (isObjectId(document?.sourceDomain)) {
    return null;
  }

  return {
    id: String(document?._id ?? ""),
    issueId: String(document?.issue ?? ""),
    name: document?.name ?? null,
    reason: "sourceDomain must be a non-null ObjectId",
  };
};

export const buildMigratedIssueExpressionDomainFields = (
  document,
  now = new Date()
) => {
  const createdAt = document?.createdAt ?? now;

  return {
    createdAt,
    updatedAt: document?.updatedAt ?? createdAt,
  };
};

export const LEGACY_EXPRESSION_DOMAIN_FIELDS = ["user", "isGlobal", "locked"];

const indexMatches = (index, expected) =>
  JSON.stringify(index.key) === JSON.stringify(expected.key) &&
  index.unique === true &&
  JSON.stringify(index.partialFilterExpression ?? {}) ===
    JSON.stringify(expected.partialFilterExpression);

const ensureIndex = async ({ collection, expected }) => {
  const existing = (await collection.indexes()).find(
    (index) => index.name === expected.name
  );

  if (existing && !indexMatches(existing, expected)) {
    await collection.dropIndex(existing.name);
  }

  if (!existing || !indexMatches(existing, expected)) {
    await collection.createIndex(expected.key, {
      name: expected.name,
      unique: true,
      partialFilterExpression: expected.partialFilterExpression,
    });
  }
};

export const migrateExpressionDomainIndexes = async ({ collection }) => {
  const indexes = await collection.indexes();
  const obsoleteIndexNames = new Set(["user_1_name_1", "isGlobal_1_name_1"]);

  for (const index of indexes) {
    if (index.name !== "_id_" && obsoleteIndexNames.has(index.name)) {
      await collection.dropIndex(index.name);
    }
  }

  await ensureIndex({
    collection,
    expected: {
      key: { owner: 1, name: 1 },
      name: "expression_domain_owner_name_unique",
      partialFilterExpression: { owner: { $type: "objectId" } },
    },
  });
  await ensureIndex({
    collection,
    expected: {
      key: { name: 1 },
      name: "expression_domain_global_name_unique",
      partialFilterExpression: { owner: null },
    },
  });
};
