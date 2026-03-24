import mongoose from "mongoose";
import { createBadRequestError } from "./errors.js";
import { toIdString } from "./ids.js";

/**
 * Comprueba si un valor puede representar un ObjectId válido.
 *
 * @param {any} value Valor a comprobar.
 * @returns {boolean}
 */
export const isValidObjectIdLike = (value) => {
  const id = toIdString(value);
  return Boolean(id) && mongoose.Types.ObjectId.isValid(id);
};

/**
 * Convierte un valor a ObjectId o devuelve null si no es válido.
 *
 * @param {any} value Valor a convertir.
 * @returns {import("mongoose").Types.ObjectId | null}
 */
export const toObjectIdOrNull = (value) => {
  const id = toIdString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
};

/**
 * Convierte un valor a ObjectId y lanza error si no es válido.
 *
 * @param {any} value Valor a convertir.
 * @param {string} [fieldName="id"] Nombre del campo para el mensaje de error.
 * @returns {import("mongoose").Types.ObjectId}
 */
export const ensureObjectId = (value, fieldName = "id") => {
  const objectId = toObjectIdOrNull(value);

  if (!objectId) {
    throw createBadRequestError(`Invalid ${fieldName}.`);
  }

  return objectId;
};

/**
 * Comprueba si dos valores representan el mismo ObjectId.
 *
 * @param {any} a Primer id.
 * @param {any} b Segundo id.
 * @returns {boolean}
 */
export const areSameObjectIds = (a, b) => {
  const left = toIdString(a);
  const right = toIdString(b);

  return Boolean(left && right && left === right);
};

/**
 * Finaliza una sesión de mongoose de forma segura.
 *
 * @param {mongoose.ClientSession | null | undefined} session Sesión activa.
 * @returns {Promise<void>}
 */
export const endSessionSafely = async (session) => {
  if (!session) return;

  try {
    await session.endSession();
  } catch (error) {
    console.error("Error ending mongoose session:", error);
  }
};

/**
 * Aborta una transacción de mongoose de forma segura.
 *
 * @param {mongoose.ClientSession | null | undefined} session Sesión activa.
 * @returns {Promise<void>}
 */
export const abortTransactionSafely = async (session) => {
  if (!session?.inTransaction?.()) return;

  try {
    await session.abortTransaction();
  } catch (error) {
    console.error("Error aborting mongoose transaction:", error);
  }
};