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

export const endSessionSafely = async (session) => {
  if (!session) return;

  try {
    await session.endSession();
  } catch (error) {
    console.error("Error ending mongoose session:", error);
  }
};

export const abortTransactionSafely = async (session) => {
  if (!session?.inTransaction?.()) return;

  try {
    await session.abortTransaction();
  } catch (error) {
    console.error("Error aborting mongoose transaction:", error);
  }
};