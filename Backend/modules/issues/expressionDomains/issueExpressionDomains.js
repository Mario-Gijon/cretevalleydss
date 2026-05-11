         
import { ExpressionDomain } from "../../../models/ExpressionDomain.js";
import { getLinguisticMembershipFunctionOrThrow } from "./linguisticMembership.functions.js";

        
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import { normalizeString } from "../../../utils/common/strings.js";

/**
 * Aplica una sesión de mongoose a una query si existe.
 *
 * @template T
 * @param {T} query Query de mongoose.
 * @param {Object|null} [session=null] Sesión opcional.
 * @returns {T}
 */
const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

/**
 * Normaliza y valida los datos de un dominio de expresión a crear.
 *
 * @param {Object} payload Cuerpo recibido.
 * @returns {Object}
 */
export const normalizeNewExpressionDomainPayload = (payload) => {
  let {
    name,
    type,
    numericRange,
    membershipFunction,
    valuesMode,
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
    throw createBadRequestError("Name is required", {
      field: "name",
    });
  }

  if (!["numeric", "linguistic"].includes(type)) {
    throw createBadRequestError("Invalid type", {
      field: "type",
    });
  }

  if (type === "numeric") {
    if (!numericRange || numericRange.min == null || numericRange.max == null) {
      throw createBadRequestError(
        "numericRange.min and numericRange.max are required for numeric domains",
        {
          field: "numericRange",
        }
      );
    }

    const min = Number(numericRange.min);
    const max = Number(numericRange.max);
    const step =
      numericRange.step == null || numericRange.step === ""
        ? null
        : Number(numericRange.step);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw createBadRequestError("min/max must be numbers", {
        field: "numericRange",
      });
    }

    if (min >= max) {
      throw createBadRequestError("min must be < max", {
        field: "numericRange",
      });
    }

    if (step != null && (!Number.isFinite(step) || step <= 0)) {
      throw createBadRequestError("step must be null or a positive number", {
        field: "numericRange",
      });
    }

    return {
      name,
      type,
      numericRange: { min, max, step },
      membershipFunction: null,
      valueCount: null,
      valuesMode: null,
      linguisticLabels: [],
    };
  }

  const membershipDefinition = getLinguisticMembershipFunctionOrThrow({
    membershipFunction,
  });
  const derivedValueCount = membershipDefinition.valueCount;
  const normalizedValuesMode =
    valuesMode == null || valuesMode === ""
      ? "automatic"
      : normalizeString(valuesMode);

  if (!["automatic", "custom"].includes(normalizedValuesMode)) {
    throw createBadRequestError("valuesMode must be 'automatic' or 'custom'", {
      field: "valuesMode",
    });
  }

  if (!Array.isArray(linguisticLabels) || linguisticLabels.length === 0) {
    throw createBadRequestError(
      "linguisticLabels is required for linguistic domains",
      {
        field: "linguisticLabels",
      }
    );
  }

  const seenLabels = new Set();

  const normalizedLabels = linguisticLabels.map((labelItem) => {
    const label = normalizeString(labelItem?.label);
    const values = labelItem?.values;

    if (!label) {
      throw createBadRequestError("Label is required", {
        field: "linguisticLabels",
      });
    }

    if (seenLabels.has(label)) {
      throw createBadRequestError(`Duplicated label '${label}'`, {
        field: "linguisticLabels",
      });
    }
    seenLabels.add(label);

    if (!Array.isArray(values) || values.length !== derivedValueCount) {
      throw createBadRequestError(
        `values must be an array with length ${derivedValueCount}`,
        {
          field: "linguisticLabels",
        }
      );
    }

    const numericValues = values.map(Number);

    if (!numericValues.every(Number.isFinite)) {
      throw createBadRequestError("values must be numbers", {
        field: "linguisticLabels",
      });
    }

    if (!numericValues.every((item) => item >= 0 && item <= 1)) {
      throw createBadRequestError("values must be in range [0, 1]", {
        field: "linguisticLabels",
      });
    }

    for (let index = 1; index < numericValues.length; index += 1) {
      if (numericValues[index] < numericValues[index - 1]) {
        throw createBadRequestError(
          "values must be ordered (non-decreasing)",
          {
            field: "linguisticLabels",
          }
        );
      }
    }

    return {
      label,
      values: numericValues,
    };
  });

  return {
    name,
    type,
    numericRange: null,
    membershipFunction: membershipDefinition.key,
    valueCount: derivedValueCount,
    valuesMode: normalizedValuesMode,
    linguisticLabels: normalizedLabels,
  };
};

/**
 * Obtiene un dominio editable del usuario actual o lanza error.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.domainId Id del dominio.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object|null} [params.session=null] Sesión opcional.
 * @returns {Promise<Object>}
 */
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

/**
 * Obtiene los dominios globales y del usuario actual.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.userId Id del usuario actual.
 * @returns {Promise<Object>}
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
 * @param {Object} params.payload Cuerpo recibido.
 * @returns {Promise<Object>}
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
      ? {
          membershipFunction: normalizedDomain.membershipFunction,
          valueCount: normalizedDomain.valueCount,
          valuesMode: normalizedDomain.valuesMode,
          linguisticLabels: normalizedDomain.linguisticLabels,
        }
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
 * @returns {Promise<Object>}
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
 * @param {Object} params.updatedDomain Campos a actualizar.
 * @param {Object|null} [params.session=null] Sesión opcional.
 * @returns {Promise<Object>}
 */
export const updateUserExpressionDomain = async ({
  domainId,
  userId,
  updatedDomain,
  session = null,
}) => {
  if (!domainId || !isValidObjectIdLike(domainId)) {
    throw createBadRequestError("Valid domain id is required", {
      field: "domainId",
    });
  }

  if (!updatedDomain || typeof updatedDomain !== "object") {
    throw createBadRequestError("updatedDomain is required", {
      field: "updatedDomain",
    });
  }

  const domain = await getEditableUserExpressionDomainOrThrow({
    domainId,
    userId,
    session,
  });

  const normalizedDomain = normalizeNewExpressionDomainPayload({
    name: updatedDomain.name ?? domain.name,
    type: updatedDomain.type ?? domain.type,
    numericRange: updatedDomain.numericRange ?? domain.numericRange,
    membershipFunction:
      updatedDomain.membershipFunction ?? domain.membershipFunction,
    valuesMode: updatedDomain.valuesMode ?? domain.valuesMode,
    linguisticLabels: updatedDomain.linguisticLabels ?? domain.linguisticLabels,
    isGlobal: domain.isGlobal,
  });

  domain.name = normalizedDomain.name;
  domain.type = normalizedDomain.type;
  domain.numericRange =
    normalizedDomain.type === "numeric" ? normalizedDomain.numericRange : null;
  domain.membershipFunction =
    normalizedDomain.type === "linguistic"
      ? normalizedDomain.membershipFunction
      : null;
  domain.valueCount =
    normalizedDomain.type === "linguistic" ? normalizedDomain.valueCount : null;
  domain.valuesMode =
    normalizedDomain.type === "linguistic" ? normalizedDomain.valuesMode : null;
  domain.linguisticLabels = normalizedDomain.linguisticLabels;

  await domain.save(session ? { session } : undefined);

  return domain;
};
