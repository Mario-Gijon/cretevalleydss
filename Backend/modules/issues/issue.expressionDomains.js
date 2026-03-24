// Models
import { ExpressionDomain } from "../../models/ExpressionDomain.js";

// Utils
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { sameId, toIdString } from "../../utils/common/ids.js";
import { normalizeString } from "../../utils/common/strings.js";

/**
 * Aplica una sesión de mongoose a una query si existe.
 *
 * @template T
 * @param {T} query Query de mongoose.
 * @param {import("mongoose").ClientSession|null} [session=null] Sesión opcional.
 * @returns {T}
 */
const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

/**
 * Normaliza y valida los datos de un dominio de expresión a crear.
 *
 * @param {Record<string, any>} payload Cuerpo recibido.
 * @returns {{
 *   name: string,
 *   type: string,
 *   numericRange?: { min: number, max: number },
 *   linguisticLabels?: Array<{ label: string, values: number[] }>,
 * }}
 */
export const normalizeNewExpressionDomainPayload = (payload) => {
  let {
    name,
    type,
    numericRange,
    linguisticLabels,
    isGlobal,
  } = payload || {};

  name = normalizeString(name);
  type = normalizeString(type);

  if (Boolean(isGlobal)) {
    throw createForbiddenError(
      "Global domains are not creatable. They are predefined and non-modifiable."
    );
  }

  if (!name) {
    throw createBadRequestError("Name is required");
  }

  if (!["numeric", "linguistic"].includes(type)) {
    throw createBadRequestError("Invalid type");
  }

  if (type === "numeric") {
    if (!numericRange || numericRange.min == null || numericRange.max == null) {
      throw createBadRequestError(
        "numericRange.min and numericRange.max are required for numeric domains"
      );
    }

    const min = Number(numericRange.min);
    const max = Number(numericRange.max);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw createBadRequestError("min/max must be numbers");
    }

    if (min >= max) {
      throw createBadRequestError("min must be < max");
    }

    return {
      name,
      type,
      numericRange: { min, max },
      linguisticLabels: [],
    };
  }

  if (!Array.isArray(linguisticLabels) || linguisticLabels.length === 0) {
    throw createBadRequestError(
      "linguisticLabels is required for linguistic domains"
    );
  }

  const seenLabels = new Set();

  const normalizedLabels = linguisticLabels.map((labelItem) => {
    const label = normalizeString(labelItem?.label);
    const values = labelItem?.values;

    if (!label) {
      throw createBadRequestError("Label is required");
    }

    if (seenLabels.has(label)) {
      throw createBadRequestError(`Duplicated label '${label}'`);
    }
    seenLabels.add(label);

    if (!Array.isArray(values) || values.length < 2) {
      throw createBadRequestError(
        "values must be an array with at least 2 numbers"
      );
    }

    const numericValues = values.map(Number);

    if (!numericValues.every(Number.isFinite)) {
      throw createBadRequestError("values must be numbers");
    }

    for (let index = 1; index < numericValues.length; index += 1) {
      if (numericValues[index] < numericValues[index - 1]) {
        throw createBadRequestError(
          "values must be ordered (non-decreasing)"
        );
      }
    }

    return {
      ...labelItem,
      label,
      values: numericValues,
    };
  });

  return {
    name,
    type,
    linguisticLabels: normalizedLabels,
  };
};

/**
 * Obtiene un dominio editable del usuario actual o lanza error.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.domainId Id del dominio.
 * @param {string} params.userId Id del usuario actual.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión opcional.
 * @returns {Promise<Record<string, any>>}
 */
export const getEditableUserExpressionDomainOrThrow = async ({
  domainId,
  userId,
  session = null,
}) => {
  const domain = await withOptionalSession(
    ExpressionDomain.findById(domainId),
    session
  );

  if (!domain) {
    throw createNotFoundError("Domain not found");
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

/**
 * Obtiene los dominios globales y del usuario actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.userId Id del usuario actual.
 * @returns {Promise<{
 *   globals: Array<Record<string, any>>,
 *   userDomains: Array<Record<string, any>>,
 * }>}
 */
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

/**
 * Crea un dominio de expresión del usuario actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.userId Id del usuario actual.
 * @param {Record<string, any>} params.payload Cuerpo recibido.
 * @returns {Promise<Record<string, any>>}
 */
export const createUserExpressionDomain = async ({ userId, payload }) => {
  const normalizedDomain = normalizeNewExpressionDomainPayload(payload);

  const newDomain = new ExpressionDomain({
    name: normalizedDomain.name,
    type: normalizedDomain.type,
    isGlobal: false,
    user: toIdString(userId),
    ...(normalizedDomain.type === "numeric"
      ? { numericRange: normalizedDomain.numericRange }
      : {}),
    ...(normalizedDomain.type === "linguistic"
      ? { linguisticLabels: normalizedDomain.linguisticLabels }
      : {}),
  });

  await newDomain.save();

  return newDomain;
};

/**
 * Elimina un dominio de expresión del usuario actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.domainId Id del dominio.
 * @param {string} params.userId Id del usuario actual.
 * @returns {Promise<{ domainName: string }>}
 */
export const removeUserExpressionDomain = async ({ domainId, userId }) => {
  const domain = await getEditableUserExpressionDomainOrThrow({
    domainId,
    userId,
  });

  const domainName = domain.name;

  await domain.deleteOne();

  return { domainName };
};

/**
 * Actualiza un dominio de expresión del usuario actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.domainId Id del dominio.
 * @param {string} params.userId Id del usuario actual.
 * @param {Record<string, any>} params.updatedDomain Campos a actualizar.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión opcional.
 * @returns {Promise<Record<string, any>>}
 */
export const updateUserExpressionDomain = async ({
  domainId,
  userId,
  updatedDomain,
  session = null,
}) => {
  if (!domainId || !updatedDomain) {
    throw createBadRequestError("Missing required fields");
  }

  const domain = await getEditableUserExpressionDomainOrThrow({
    domainId,
    userId,
    session,
  });

  if (updatedDomain.name) {
    domain.name = normalizeString(updatedDomain.name);
  }

  if (updatedDomain.type) {
    domain.type = normalizeString(updatedDomain.type);
  }

  if (updatedDomain.numericRange) {
    domain.numericRange = updatedDomain.numericRange;
  }

  if (updatedDomain.linguisticLabels) {
    domain.linguisticLabels = updatedDomain.linguisticLabels;
  }

  await domain.save(session ? { session } : undefined);

  return domain;
};