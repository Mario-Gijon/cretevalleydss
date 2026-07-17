import mongoose from "mongoose";
import { createBadRequestError } from "./errors.js";
import { toIdString } from "./ids.js";

export const isValidObjectIdLike = (value) => {
  const id = toIdString(value);
  return Boolean(id) && mongoose.Types.ObjectId.isValid(id);
};

export const toObjectIdOrNull = (value) => {
  const id = toIdString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
};

export const ensureObjectId = (value, fieldName = "id") => {
  const objectId = toObjectIdOrNull(value);

  if (!objectId) {
    throw createBadRequestError(`Invalid ${fieldName}.`, {
      field: fieldName,
    });
  }

  return objectId;
};

export const areSameObjectIds = (a, b) => {
  const left = toIdString(a);
  const right = toIdString(b);

  return Boolean(left && right && left === right);
};

export const applyOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

export const endSessionSafely = async (session) => {
  if (!session) return;

  try {
    await session.endSession();
  } catch (error) {
    console.error("Error ending mongoose session:", error);
  }
};

export const abortTransactionSafely = async (session) => {
  if (!session) return;

  try {
    if (!session.inTransaction?.()) return;

    await session.abortTransaction();
  } catch (error) {
    console.error("Error aborting mongoose transaction:", error);
  }
};

/**
 * Runs work using the same explicit start/commit/abort lifecycle used by the
 * authentication mutations. Cleanup failures are logged by the existing safe
 * helpers and never replace the operation or commit error. The optional
 * callbacks preserve endpoints that historically emitted transport after
 * commit, but before their controller finally block ended the session.
 */
export const runManualTransaction = async (
  operation,
  {
    startSession = () => mongoose.startSession(),
    onSuccessBeforeCleanup = (result) => result,
    onErrorBeforeCleanup = null,
  } = {}
) => {
  const session = await startSession();

  try {
    session.startTransaction();
    const result = await operation(session);
    await session.commitTransaction();
    return await onSuccessBeforeCleanup(result);
  } catch (error) {
    await abortTransactionSafely(session);

    if (onErrorBeforeCleanup) {
      return await onErrorBeforeCleanup(error);
    }

    throw error;
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Runs work through Mongoose's withTransaction contract and always ends the
 * session. Retry and rollback behavior remains owned by Mongoose. A successful
 * continuation may run after commit and before cleanup when transport ordering
 * is part of an existing endpoint contract.
 */
export const runWithTransaction = async (
  operation,
  {
    startSession = () => mongoose.startSession(),
    onSuccessBeforeCleanup = (result) => result,
  } = {}
) => {
  const session = await startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      result = await operation(session);
    });

    return await onSuccessBeforeCleanup(result);
  } finally {
    await endSessionSafely(session);
  }
};
