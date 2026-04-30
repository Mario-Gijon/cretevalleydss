import { createInternalError } from "../../../utils/common/errors.js";

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

const INPUT_PAYLOAD_BUILDERS_BY_KIND = {
  directCrispMatrix: buildDirectPayload,
  directFuzzyMatrix: buildDirectPayload,
  pairwisePreferenceMatrix: buildPairwisePayload,
};

/**
 * Construye el payload de entrada para ApiModels según inputKind.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|null|undefined} params.inputKind Tipo de input esperado por ApiModels.
 * @param {"direct"|"pairwise"|null} [params.resolverMode=null] Modo del resolver actual.
 * @param {Object} params.matrices Matrices de evaluaciones.
 * @param {Object} params.modelParameters Parámetros efectivos del modelo.
 * @param {string[]} [params.criterionTypes] Tipos de criterio para modelos directos.
 * @param {number|null} [params.consensusThreshold] Umbral de consenso para modelos pairwise.
 * @returns {Object}
 */
export const buildModelInputPayload = ({
  inputKind,
  resolverMode = null,
  matrices,
  modelParameters,
  criterionTypes,
  consensusThreshold,
}) => {
  const normalizedInputKind = String(inputKind || "").trim();

  const buildByInputKind = INPUT_PAYLOAD_BUILDERS_BY_KIND[normalizedInputKind];
  if (buildByInputKind) {
    return buildByInputKind({
      matrices,
      modelParameters,
      criterionTypes,
      consensusThreshold,
    });
  }

  if (resolverMode === "direct") {
    return buildDirectPayload({
      matrices,
      modelParameters,
      criterionTypes,
    });
  }

  if (resolverMode === "pairwise") {
    return buildPairwisePayload({
      matrices,
      consensusThreshold,
      modelParameters,
    });
  }

  throw createInternalError(
    `Unsupported model input kind: ${String(inputKind)}`
  );
};
