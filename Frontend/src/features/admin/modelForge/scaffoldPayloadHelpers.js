import { stripNullConstraintPlaceholders } from "./constraintTemplates.js";
import { isPlainObject } from "../../../utils/common/objects";

export const PARAMETER_STRUCTURE_KEY_PATTERN = /^[a-z][A-Za-z0-9]*$/;

export const PROTECTED_ADVANCED_FIELDS = new Set([
  "key",
  "label",
  "parameterStructureKey",
  "required",
  "default",
  "restrictions",
  "type",
]);

export const DEFAULT_MODE_OPTIONS = [
  { value: "null", label: "Null" },
  { value: "emptyObject", label: "Empty object {}" },
  { value: "emptyArray", label: "Empty array []" },
  { value: "literal", label: "Literal value" },
  { value: "customJson", label: "Custom JSON" },
];

export const RESTRICTIONS_MODE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "minMax", label: "Min / Max" },
  { value: "options", label: "Options" },
  { value: "customJson", label: "Custom JSON" },
];

export const modelKeyPattern = /^[a-z][a-z0-9_]*$/;
export const lowerCamelCasePattern = /^[a-z][A-Za-z0-9]*$/;

export const parseLiteralValue = (rawValue) => {
  const text = String(rawValue ?? "");
  const trimmed = text.trim();

  if (!trimmed) return "";

  const lowered = trimmed.toLowerCase();
  if (lowered === "true") return true;
  if (lowered === "false") return false;

  const parsedNumber = Number(trimmed);
  if (Number.isFinite(parsedNumber)) return parsedNumber;

  return text;
};

export const parseJsonOrThrow = (rawValue, label) => {
  try {
    return JSON.parse(String(rawValue ?? "").trim());
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
};

export const parseOptionalFiniteNumberOrThrow = (rawValue, label) => {
  const text = String(rawValue ?? "").trim();
  if (!text) return undefined;

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a finite number`);
  }

  return parsed;
};

export const parseOptionsList = (rawValue) =>
  String(rawValue ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => parseLiteralValue(item));

export const buildParameterIdentifier = (parameter, index) =>
  String(parameter?.key || "").trim() || `Parameter ${index + 1}`;

export const buildParameterRowPayloadOrThrow = (parameter, index) => {
  const identifier = buildParameterIdentifier(parameter, index);
  const key = String(parameter?.key || "").trim();
  const label = String(parameter?.label || "").trim();
  const parameterStructureKey = String(parameter?.parameterStructureKey || "").trim();

  if (!key) throw new Error(`Parameter ${index + 1} is missing key`);
  if (!label) throw new Error(`Parameter ${index + 1} is missing label`);
  if (!parameterStructureKey) {
    throw new Error(`Parameter ${index + 1} is missing parameterStructureKey`);
  }
  if (!PARAMETER_STRUCTURE_KEY_PATTERN.test(parameterStructureKey)) {
    throw new Error(`${identifier} parameterStructureKey must use lower camelCase`);
  }

  let defaultValue = null;
  const defaultMode = parameter?.defaultMode || "null";

  if (defaultMode === "emptyObject") {
    defaultValue = {};
  } else if (defaultMode === "emptyArray") {
    defaultValue = [];
  } else if (defaultMode === "literal") {
    defaultValue = parseLiteralValue(parameter?.defaultLiteralText);
  } else if (defaultMode === "customJson") {
    defaultValue = parseJsonOrThrow(
      parameter?.defaultJsonText,
      `${identifier} default`
    );
  }

  let restrictions;
  const restrictionsMode = parameter?.restrictionsMode || "none";

  if (restrictionsMode === "minMax") {
    const min = parseOptionalFiniteNumberOrThrow(
      parameter?.restrictionsMinText,
      `${identifier} minimum`
    );
    const max = parseOptionalFiniteNumberOrThrow(
      parameter?.restrictionsMaxText,
      `${identifier} maximum`
    );

    if (min !== undefined || max !== undefined) {
      restrictions = {};
      if (min !== undefined) restrictions.min = min;
      if (max !== undefined) restrictions.max = max;
    }
  } else if (restrictionsMode === "options") {
    const allowed = parseOptionsList(parameter?.restrictionsOptionsText);
    if (allowed.length > 0) restrictions = { allowed };
  } else if (restrictionsMode === "customJson") {
    const parsed = parseJsonOrThrow(
      parameter?.restrictionsJsonText,
      `${identifier} restrictions`
    );

    if (parsed !== null && !isPlainObject(parsed)) {
      throw new Error(`${identifier} restrictions must be a JSON object or null`);
    }

    if (isPlainObject(parsed) && Object.keys(parsed).length > 0) {
      restrictions = parsed;
    }
  }

  let advanced = {};
  const advancedText = String(parameter?.advancedJsonText || "").trim();

  if (advancedText) {
    const parsedAdvanced = parseJsonOrThrow(
      advancedText,
      `${identifier} advanced JSON`
    );

    if (!isPlainObject(parsedAdvanced)) {
      throw new Error(`${identifier} advanced JSON must be a JSON object`);
    }

    for (const protectedField of PROTECTED_ADVANCED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(parsedAdvanced, protectedField)) {
        throw new Error(
          `${identifier} advanced JSON cannot override '${protectedField}'`
        );
      }
    }

    advanced = parsedAdvanced;
  }

  const payload = {
    key,
    label,
    parameterStructureKey,
    required: parameter?.required === true,
    default: defaultValue,
  };

  if (restrictions !== undefined) {
    payload.restrictions = restrictions;
  }

  return {
    ...payload,
    ...advanced,
  };
};

export const getParameterRowValidation = (parameter, index) => {
  const errors = {};
  const parameterStructureKey = String(parameter?.parameterStructureKey || "").trim();

  if (
    parameterStructureKey &&
    !PARAMETER_STRUCTURE_KEY_PATTERN.test(parameterStructureKey)
  ) {
    errors.parameterStructureKey = "Use lower camelCase.";
  }

  try {
    buildParameterRowPayloadOrThrow(parameter, index);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid parameter";
    if (message.includes("default")) errors.default = message;
    if (message.includes("restrictions")) errors.restrictions = message;
    if (message.includes("advanced JSON")) errors.advanced = message;
    if (message.includes("parameterStructureKey")) errors.parameterStructureKey = message;
    if (message.includes("missing key")) errors.key = message;
    if (message.includes("missing label")) errors.label = message;
  }

  return errors;
};

export const buildEmptyParameterRow = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  key: "",
  label: "",
  parameterStructureKey: "",
  required: false,
  defaultMode: "null",
  defaultLiteralText: "",
  defaultJsonText: "",
  restrictionsMode: "none",
  restrictionsMinText: "",
  restrictionsMaxText: "",
  restrictionsOptionsText: "",
  restrictionsJsonText: "",
  advancedJsonText: "",
  advancedExpanded: false,
});

export const buildSupportedExpressionDomainEntry = (
  typeKey,
  constraintsJsonText = "{}"
) => ({
  typeKey,
  constraintsJsonText,
});

export const buildSupportedExpressionDomainsPayloadOrThrow = (
  supportedExpressionDomains
) => {
  if (!Array.isArray(supportedExpressionDomains)) {
    throw new Error("supportedExpressionDomains must be a list");
  }

  return supportedExpressionDomains.map((entry) => {
    const typeKey = String(entry?.typeKey || "").trim();

    if (!typeKey) {
      throw new Error("Each supported expression domain must include typeKey");
    }

    const rawConstraints = String(entry?.constraintsJsonText || "").trim() || "{}";
    const parsedConstraints = parseJsonOrThrow(
      rawConstraints,
      `${typeKey} constraints`
    );

    if (!isPlainObject(parsedConstraints)) {
      throw new Error(`${typeKey} constraints must be a JSON object`);
    }

    const normalizedConstraints = stripNullConstraintPlaceholders(parsedConstraints);

    return {
      typeKey,
      constraints:
        isPlainObject(normalizedConstraints) &&
        Object.keys(normalizedConstraints).length === 0
          ? {}
          : normalizedConstraints,
    };
  });
};

export const getSupportedExpressionDomainValidationError = (entry) => {
  try {
    buildSupportedExpressionDomainsPayloadOrThrow([entry]);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid constraints";
  }
};

export const buildInitialFormState = () => ({
  apiModelKey: "",
  displayName: "",
  smallDescription: "",
  extendedDescription: "",
  moreInfoUrl: "",
  includeExamples: true,
  modelKind: "issue",
  evaluationStructureKey: "",
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  isMultiCriteria: true,
  usesCriteriaWeights: true,
  usesExpertWeights: false,
  usesFuzzyCriteriaWeights: false,
  usesCriterionTypes: true,
  supportsCreatorCriteriaWeighting: false,
  supportsExpertCriteriaWeighting: false,
  supportedExpressionDomains: [
    buildSupportedExpressionDomainEntry("numericContinuous"),
    buildSupportedExpressionDomainEntry("numericDiscrete"),
  ],
  parameters: [],
});

export const buildExampleFormState = () => ({
  apiModelKey: "sample_scaffold_model",
  displayName: "Sample Scaffold Model",
  smallDescription: "Sample model generated with Model Forge.",
  extendedDescription:
    "Generated sample scaffold used to validate the Model Forge preview and apply flow.",
  moreInfoUrl: "",
  includeExamples: true,
  modelKind: "issue",
  evaluationStructureKey: "sampleEvaluationStructure",
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  isMultiCriteria: true,
  usesCriteriaWeights: true,
  usesExpertWeights: false,
  usesFuzzyCriteriaWeights: false,
  usesCriterionTypes: true,
  supportsCreatorCriteriaWeighting: false,
  supportsExpertCriteriaWeighting: false,
  supportedExpressionDomains: [
    buildSupportedExpressionDomainEntry("numericContinuous"),
    buildSupportedExpressionDomainEntry("numericDiscrete"),
  ],
  parameters: [
    {
      id: "sample-param",
      key: "sample_param",
      label: "Sample parameter",
      parameterStructureKey: "sampleParameterGlobal",
      required: true,
      defaultMode: "literal",
      defaultLiteralText: "0.5",
      defaultJsonText: "",
      restrictionsMode: "minMax",
      restrictionsMinText: "0",
      restrictionsMaxText: "1",
      restrictionsOptionsText: "",
      restrictionsJsonText: "",
      advancedJsonText: "",
      advancedExpanded: false,
    },
  ],
});

export const formatJsonPreview = (value) => {
  if (value === null || value === undefined) return "null";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export const formatConstraintTemplate = (value) =>
  JSON.stringify(value ?? {}, null, 2);

export const formatConstraintTemplateInline = (value) =>
  JSON.stringify(value ?? {});

export const createConstraintTemplateFieldId = () =>
  `constraint-template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const buildConstraintTemplateFieldRow = (key = "") => ({
  id: createConstraintTemplateFieldId(),
  key,
  children: [],
});

export const updateConstraintTemplateFieldTree = (fields, fieldId, updater) =>
  (Array.isArray(fields) ? fields : []).map((field) => {
    if (field.id === fieldId) {
      return updater(field);
    }

    if (Array.isArray(field.children) && field.children.length > 0) {
      return {
        ...field,
        children: updateConstraintTemplateFieldTree(field.children, fieldId, updater),
      };
    }

    return field;
  });

export const removeConstraintTemplateFieldRecursively = (fields, fieldId) =>
  (Array.isArray(fields) ? fields : [])
    .filter((field) => field.id !== fieldId)
    .map((field) => ({
      ...field,
      children: removeConstraintTemplateFieldRecursively(field.children, fieldId),
    }));

export const validateConstraintTemplateFieldsOrThrow = (
  fields,
  path = "constraintTemplate"
) => {
  const siblingKeys = new Set();

  for (const field of Array.isArray(fields) ? fields : []) {
    const key = String(field?.key || "").trim();
    if (!key) {
      throw new Error(`${path} contains a field with an empty key`);
    }
    if (!lowerCamelCasePattern.test(key)) {
      throw new Error(`${path}.${key} must use lower camelCase`);
    }
    if (siblingKeys.has(key)) {
      throw new Error(`${path} contains duplicate field key "${key}"`);
    }
    siblingKeys.add(key);

    validateConstraintTemplateFieldsOrThrow(field.children, `${path}.${key}`);
  }
};

export const buildConstraintTemplateObjectOrThrow = (fields) => {
  validateConstraintTemplateFieldsOrThrow(fields);

  const visit = (items) => {
    const result = {};

    for (const field of Array.isArray(items) ? items : []) {
      const key = String(field?.key || "").trim();
      const children = Array.isArray(field?.children) ? field.children : [];
      result[key] = children.length > 0 ? visit(children) : null;
    }

    return result;
  };

  return visit(fields);
};

export const formatGeneratedConstraintTemplate = (fields) => {
  try {
    return JSON.stringify(buildConstraintTemplateObjectOrThrow(fields), null, 2);
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid constraint template";
  }
};
