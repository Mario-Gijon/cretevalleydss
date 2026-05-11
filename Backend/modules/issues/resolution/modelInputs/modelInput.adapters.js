import { createInternalError } from "../../../../utils/common/errors.js";

const buildDirectPayload = ({ matrices, modelParameters, criterionTypes }) => ({
  matrices,
  modelParameters,
  criterionTypes,
});

const buildPairwisePayload = ({
  matrices,
  consensusThreshold,
  modelParameters,
}) => ({
  matrices,
  consensusThreshold,
  modelParameters,
});

const INPUT_PAYLOAD_BUILDERS_BY_API_INPUT_FORMAT = {
  directCrispMatrix: buildDirectPayload,
  directFuzzyMatrix: buildDirectPayload,
  pairwisePreferenceMatrix: buildPairwisePayload,
};

/**
 * Construye el payload de entrada para ApiModels según apiInputFormat.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|null|undefined} params.apiInputFormat Tipo de input esperado por ApiModels.
 * @param {Object} params.matrices Matrices de evaluaciones.
 * @param {Object} params.modelParameters Parámetros efectivos del modelo.
 * @param {string[]} [params.criterionTypes] Tipos de criterio para modelos directos.
 * @param {number|null} [params.consensusThreshold] Umbral de consenso para modelos pairwise.
 * @returns {Object}
 */
export const buildModelInputPayload = ({
  apiInputFormat,
  matrices,
  modelParameters,
  criterionTypes,
  consensusThreshold,
}) => {
  const normalizedApiInputFormat = String(apiInputFormat || "").trim();

  if (!normalizedApiInputFormat) {
    throw createInternalError("Model apiInputFormat is required");
  }

  const buildByApiInputFormat =
    INPUT_PAYLOAD_BUILDERS_BY_API_INPUT_FORMAT[normalizedApiInputFormat];
  if (buildByApiInputFormat) {
    return buildByApiInputFormat({
      matrices,
      modelParameters,
      criterionTypes,
      consensusThreshold,
    });
  }

  throw createInternalError(
    `Unsupported apiInputFormat: ${String(apiInputFormat)}`
  );
};
