import { AppError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isPlainObject } from "../../../utils/common/objects.js";

export const AHP_DIAGNOSTIC_API_MODEL_KEY = "ahp_criteria_weights";
export const AHP_DIAGNOSTIC_STRUCTURE_KEY = "criteriaPairwiseAHP";

const diagnosticNotSupported = (message, field = null) =>
  new AppError(message, {
    statusCode: 422,
    code: "AHP_DIAGNOSTIC_NOT_SUPPORTED",
    field,
  });

export const assertAHPDiagnosticModelOrThrow = ({
  model,
  structureKey,
  mode,
}) => {
  if (!model || model.modelKind !== "criteriaWeighting") {
    throw diagnosticNotSupported(
      "AHP diagnostics require a configured criteria-weighting model.",
      "criteriaWeightingModel"
    );
  }

  if (
    model.implementationStatus !== "ready" ||
    model.publicUsable === false ||
    model.manifestSync?.isStale === true
  ) {
    throw diagnosticNotSupported(
      "The configured criteria-weighting model is not currently available for diagnostics.",
      "criteriaWeightingModel"
    );
  }

  if (
    model.apiModelKey !== AHP_DIAGNOSTIC_API_MODEL_KEY ||
    structureKey !== AHP_DIAGNOSTIC_STRUCTURE_KEY
  ) {
    throw diagnosticNotSupported(
      "AHP diagnostics require the ahp_criteria_weights model and criteriaPairwiseAHP structure.",
      "criteriaWeightingModel"
    );
  }

  const modeSupported =
    mode === "creator"
      ? model.supportsCreatorCriteriaWeighting === true
      : mode === "expert"
        ? model.supportsExpertCriteriaWeighting === true
        : false;
  if (!modeSupported) {
    throw diagnosticNotSupported(
      `The configured model does not support ${mode} criteria weighting diagnostics.`,
      "criteriaWeightingModel"
    );
  }
};

export const assertAHPDiagnosticResultOrThrow = (diagnostic) => {
  const requiredFields = [
    "consistencyRatio",
    "consistencyIndex",
    "lambdaMax",
    "consistencyStatus",
    "consistencyThreshold",
    "triads",
    "candidateComparisons",
    "recommendations",
    "criteria",
  ];
  const finiteOrNull = (value) =>
    value === null || (typeof value === "number" && Number.isFinite(value));
  const valid =
    isPlainObject(diagnostic) &&
    requiredFields.every((field) => Object.hasOwn(diagnostic, field)) &&
    finiteOrNull(diagnostic.consistencyRatio) &&
    finiteOrNull(diagnostic.consistencyIndex) &&
    typeof diagnostic.lambdaMax === "number" &&
    Number.isFinite(diagnostic.lambdaMax) &&
    typeof diagnostic.consistencyStatus === "string" &&
    diagnostic.consistencyStatus.length > 0 &&
    typeof diagnostic.consistencyThreshold === "number" &&
    Number.isFinite(diagnostic.consistencyThreshold) &&
    Array.isArray(diagnostic.triads) &&
    Array.isArray(diagnostic.candidateComparisons) &&
    Array.isArray(diagnostic.recommendations) &&
    Array.isArray(diagnostic.criteria) &&
    diagnostic.criteria.every(
      (criterion) =>
        isPlainObject(criterion) &&
        typeof criterion.id === "string" &&
        criterion.id.length > 0 &&
        typeof criterion.name === "string" &&
        criterion.name.length > 0
    );

  if (!valid) {
    throw new AppError(
      "DecisionModelsService returned an incomplete AHP diagnostic result.",
      {
        statusCode: 502,
        code: "DECISION_MODELS_SERVICE_INVALID_RESPONSE",
      }
    );
  }

  return diagnostic;
};

export const assertDiagnosticCriteriaMatchOrThrow = ({
  diagnostic,
  criteria,
}) => {
  const expected = criteria.map((criterion) => ({
    id: toIdString(criterion?.id ?? criterion?._id),
    name: String(criterion?.name ?? "").trim(),
  }));
  const actual = diagnostic?.criteria;

  if (
    !Array.isArray(actual) ||
    actual.length !== expected.length ||
    actual.some(
      (criterion, index) =>
        criterion?.id !== expected[index].id ||
        criterion?.name !== expected[index].name
    )
  ) {
    throw new AppError(
      "DecisionModelsService returned criteria that do not match the validated diagnostic request.",
      {
        statusCode: 502,
        code: "DECISION_MODELS_SERVICE_INVALID_RESPONSE",
      }
    );
  }

  return diagnostic;
};
