import { isPlainObject } from "../../../utils/common/objects";
import { getExpressionDomainTypeMetadataOrThrow } from "../../expressionDomains/expressionDomainTypeMetadataCatalog.js";

export const PARAMETER_STRUCTURE_KEY_PATTERN = /^[a-z][A-Za-z0-9]*$/;
export const PARAMETER_STRUCTURE_MODES = Object.freeze({
  EXISTING: "existing",
  NEW: "new",
});

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

const parseSelectGlobalValueOrThrow = ({ rawValue, valueType, label }) => {
  const text = String(rawValue ?? "").trim();
  if (!text) throw new Error(`${label} must not be empty`);
  if (valueType === "string") return text;
  if (valueType === "boolean") {
    if (text.toLowerCase() === "true") return true;
    if (text.toLowerCase() === "false") return false;
    throw new Error(`${label} must be true or false`);
  }

  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
  if (valueType === "integer" && !Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }
  return value;
};

export const buildParameterIdentifier = (parameter, index) =>
  String(parameter?.key || "").trim() || `Parameter ${index + 1}`;

export const buildParameterRowPayloadOrThrow = (parameter, index) => {
  const identifier = buildParameterIdentifier(parameter, index);
  const key = String(parameter?.key || "").trim();
  const label = String(parameter?.label || "").trim();
  const parameterStructureKey = String(parameter?.parameterStructureKey || "").trim();
  const isNumberGlobal = parameterStructureKey === "numberGlobal";
  const isSelectGlobal = parameterStructureKey === "selectGlobal";

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

    const protectedAdvancedFields = isNumberGlobal || isSelectGlobal
      ? new Set([
        ...PROTECTED_ADVANCED_FIELDS,
        "valueType",
        "isInteger",
        "numericType",
        "minimum",
        "maximum",
        "options",
      ])
      : PROTECTED_ADVANCED_FIELDS;

    for (const protectedField of protectedAdvancedFields) {
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
  };

  if (isNumberGlobal) {
    const valueType = String(parameter?.valueType || "").trim();
    if (valueType !== "number" && valueType !== "integer") {
      throw new Error(
        `${identifier} valueType must be number or integer for numberGlobal`
      );
    }

    const canonicalRestrictions = {
      min: restrictions?.min ?? null,
      max: restrictions?.max ?? null,
      allowed: restrictions?.allowed ?? null,
    };
    const restrictionKeys = isPlainObject(restrictions)
      ? Object.keys(restrictions)
      : [];
    if (
      restrictionKeys.some(
        (field) => !["min", "max", "allowed"].includes(field)
      )
    ) {
      throw new Error(
        `${identifier} numberGlobal restrictions may only contain min, max, and allowed`
      );
    }
    if (
      canonicalRestrictions.allowed !== null &&
      !Array.isArray(canonicalRestrictions.allowed)
    ) {
      throw new Error(
        `${identifier} numberGlobal allowed restriction must be an array or null`
      );
    }

    const numericValues = [
      canonicalRestrictions.min,
      canonicalRestrictions.max,
      ...(Array.isArray(canonicalRestrictions.allowed)
        ? canonicalRestrictions.allowed
        : []),
    ].filter((value) => value !== null);
    if (
      numericValues.some(
        (value) => typeof value !== "number" || !Number.isFinite(value)
      )
    ) {
      throw new Error(
        `${identifier} numberGlobal restrictions must contain finite numbers`
      );
    }
    if (
      valueType === "integer" &&
      numericValues.some((value) => !Number.isInteger(value))
    ) {
      throw new Error(
        `${identifier} integer restrictions must contain only integers`
      );
    }
    if (
      canonicalRestrictions.min !== null &&
      canonicalRestrictions.max !== null &&
      canonicalRestrictions.min > canonicalRestrictions.max
    ) {
      throw new Error(`${identifier} minimum must not exceed maximum`);
    }
    if (
      Array.isArray(canonicalRestrictions.allowed) &&
      new Set(canonicalRestrictions.allowed).size !==
        canonicalRestrictions.allowed.length
    ) {
      throw new Error(
        `${identifier} numberGlobal allowed restriction contains duplicates`
      );
    }
    if (
      Array.isArray(canonicalRestrictions.allowed) &&
      canonicalRestrictions.allowed.some(
        (value) =>
          (canonicalRestrictions.min !== null &&
            value < canonicalRestrictions.min) ||
          (canonicalRestrictions.max !== null &&
            value > canonicalRestrictions.max)
      )
    ) {
      throw new Error(
        `${identifier} numberGlobal allowed values must satisfy the range`
      );
    }

    const hasDefault =
      defaultMode !== "null" &&
      !(
        defaultMode === "literal" &&
        String(parameter?.defaultLiteralText ?? "").trim() === ""
      );

    if (hasDefault) {
      if (typeof defaultValue !== "number" || !Number.isFinite(defaultValue)) {
        throw new Error(`${identifier} default must be a finite number`);
      }
      if (valueType === "integer" && !Number.isInteger(defaultValue)) {
        throw new Error(`${identifier} integer default must be an integer`);
      }
      if (
        (canonicalRestrictions.min !== null &&
          defaultValue < canonicalRestrictions.min) ||
        (canonicalRestrictions.max !== null &&
          defaultValue > canonicalRestrictions.max) ||
        (Array.isArray(canonicalRestrictions.allowed) &&
          canonicalRestrictions.allowed.length > 0 &&
          !canonicalRestrictions.allowed.includes(defaultValue))
      ) {
        throw new Error(`${identifier} default must satisfy restrictions`);
      }
      payload.default = defaultValue;
    }

    payload.valueType = valueType;
    payload.restrictions = canonicalRestrictions;
  } else if (isSelectGlobal) {
    const valueType = String(parameter?.valueType || "").trim();
    if (!["string", "number", "integer", "boolean"].includes(valueType)) {
      throw new Error(`${identifier} selectGlobal valueType is invalid`);
    }
    const rawAllowed = String(parameter?.restrictionsOptionsText ?? "")
      .split(/\n|,/)
      .map((item) => item.trim());
    if (rawAllowed.length === 0 || rawAllowed.some((item) => !item)) {
      throw new Error(`${identifier} selectGlobal allowed values must not be empty`);
    }
    const allowed = rawAllowed.map((rawValue) =>
      parseSelectGlobalValueOrThrow({
        rawValue,
        valueType,
        label: `${identifier} allowed value`,
      })
    );
    const hasDefault =
      defaultMode !== "null" &&
      !(defaultMode === "literal" && String(parameter?.defaultLiteralText ?? "").trim() === "");
    if (hasDefault) {
      if (defaultMode !== "literal") {
        throw new Error(`${identifier} selectGlobal default must be a literal value`);
      }
      const parsedDefault = parseSelectGlobalValueOrThrow({
        rawValue: parameter?.defaultLiteralText,
        valueType,
        label: `${identifier} default`,
      });
      if (!allowed.includes(parsedDefault)) {
        throw new Error(`${identifier} default must be one of the allowed values`);
      }
      payload.default = parsedDefault;
    }
    payload.valueType = valueType;
    payload.restrictions = { allowed };
  } else {
    payload.default = defaultValue;
  }

  if (!isNumberGlobal && !isSelectGlobal && restrictions !== undefined) {
    payload.restrictions = restrictions;
  }

  return {
    ...payload,
    ...advanced,
  };
};

export const getParameterStructureSelectionError = (
  parameter,
  parameterStructures
) => {
  const mode = parameter?.parameterStructureMode;
  const key = String(parameter?.parameterStructureKey || "").trim();
  const catalog = Array.isArray(parameterStructures) ? parameterStructures : [];
  const structure = catalog.find((item) => item?.key === key) || null;

  if (
    mode !== PARAMETER_STRUCTURE_MODES.EXISTING &&
    mode !== PARAMETER_STRUCTURE_MODES.NEW
  ) {
    return "Choose whether to use an existing structure or create a new one.";
  }
  if (!key) return "Choose or enter a parameter structure key.";
  if (!PARAMETER_STRUCTURE_KEY_PATTERN.test(key)) {
    return "Use lower camelCase.";
  }
  if (mode === PARAMETER_STRUCTURE_MODES.EXISTING) {
    if (!structure) return `Parameter structure '${key}' does not exist in the catalog.`;
    if (structure.available !== true) {
      return `Parameter structure '${key}' is not runtime-ready and cannot be reused.`;
    }
    return "";
  }
  if (structure) {
    return `Parameter structure '${key}' already exists. Reuse it if it is ready or resolve its registry state before creating a new structure.`;
  }
  return "";
};

export const validateParameterStructureSelectionOrThrow = (
  parameter,
  parameterStructures
) => {
  const error = getParameterStructureSelectionError(parameter, parameterStructures);
  if (error) throw new Error(error);
};

export const buildNewParameterStructureRequestsOrThrow = (
  parameters,
  parameterStructures
) => {
  const requestsByKey = new Map();

  (Array.isArray(parameters) ? parameters : []).forEach((parameter) => {
    validateParameterStructureSelectionOrThrow(parameter, parameterStructures);
    if (parameter.parameterStructureMode === PARAMETER_STRUCTURE_MODES.NEW) {
      const parameterStructureKey = String(parameter.parameterStructureKey).trim();
      requestsByKey.set(parameterStructureKey, { parameterStructureKey });
    }
  });

  return [...requestsByKey.values()];
};

export const getParameterRowValidation = (parameter, index, parameterStructures) => {
  const errors = {};
  const parameterStructureKey = String(parameter?.parameterStructureKey || "").trim();

  if (
    parameterStructureKey &&
    !PARAMETER_STRUCTURE_KEY_PATTERN.test(parameterStructureKey)
  ) {
    errors.parameterStructureKey = "Use lower camelCase.";
  }

  const selectionError = getParameterStructureSelectionError(
    parameter,
    parameterStructures
  );
  if (selectionError) errors.parameterStructureKey = selectionError;

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
  parameterStructureMode: PARAMETER_STRUCTURE_MODES.EXISTING,
  valueType: "number",
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

export const buildSupportedExpressionDomainEntry = (typeKey) => ({
  typeKey,
  compatibilityConstraints: {},
});

const parseOptionalIntegerListOrThrow = (rawValue, field) => {
  const text = String(rawValue ?? "").trim();

  if (!text) return undefined;

  const values = [];
  const seenValues = new Set();

  text.split(",").forEach((rawToken) => {
    const token = rawToken.trim();
    const value = Number(token);

    if (!token || !Number.isInteger(value)) {
      throw new Error(`${field.label} must be a comma-separated list of integers`);
    }

    if (field.minimum !== undefined && value < field.minimum) {
      throw new Error(`${field.label} values must be at least ${field.minimum}`);
    }

    if (field.mustBeOdd && value % 2 === 0) {
      throw new Error(`${field.label} values must be odd`);
    }

    if (!seenValues.has(value)) {
      seenValues.add(value);
      values.push(value);
    }
  });

  return values;
};

const parseOptionalMultiEnumOrThrow = (rawValue, field) => {
  if (rawValue === undefined || rawValue === null) return undefined;

  if (!Array.isArray(rawValue)) {
    throw new Error(`${field.label} must be a list`);
  }

  const allowedValues = new Set((field.options ?? []).map((option) => option.value));
  const values = [];
  const seenValues = new Set();

  rawValue.forEach((rawValueItem) => {
    const value = String(rawValueItem ?? "").trim();

    if (!allowedValues.has(value)) {
      throw new Error(`${field.label} contains an unsupported value`);
    }

    if (!seenValues.has(value)) {
      seenValues.add(value);
      values.push(value);
    }
  });

  return values.length > 0 ? values : undefined;
};

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

    const metadata = getExpressionDomainTypeMetadataOrThrow(typeKey);
    const rawConstraints = isPlainObject(entry?.compatibilityConstraints)
      ? entry.compatibilityConstraints
      : {};
    const normalizedConstraints = {};
    const fieldsByKey = new Map(
      (metadata.compatibilityConstraintFields ?? []).map((field) => [
        field.key,
        field,
      ])
    );

    (metadata.compatibilityConstraintFields ?? []).forEach((field) => {
      const rawValue = rawConstraints[field.key];
      let value;

      if (field.kind === "finiteNumber") {
        value = parseOptionalFiniteNumberOrThrow(rawValue, field.label);

        if (
          value !== undefined &&
          field.exclusiveMinimum !== undefined &&
          value <= field.exclusiveMinimum
        ) {
          throw new Error(
            `${field.label} must be greater than ${field.exclusiveMinimum}`
          );
        }
      } else if (field.kind === "integerList") {
        value = parseOptionalIntegerListOrThrow(rawValue, field);
      } else if (field.kind === "multiEnum") {
        value = parseOptionalMultiEnumOrThrow(rawValue, field);
      } else {
        throw new Error(`Unsupported compatibility field ${field.key}`);
      }

      if (value !== undefined) {
        normalizedConstraints[field.key] = value;
      }
    });

    Array.from(fieldsByKey.values()).forEach((field) => {
      if (!field.lessThan) return;

      const value = normalizedConstraints[field.key];
      const upperValue = normalizedConstraints[field.lessThan];

      if (value !== undefined && upperValue !== undefined && value >= upperValue) {
        throw new Error(
          `${field.label} must be strictly less than ${
            fieldsByKey.get(field.lessThan)?.label ?? field.lessThan
          }`
        );
      }
    });

    return {
      typeKey,
      constraints: normalizedConstraints,
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
      parameterStructureMode: PARAMETER_STRUCTURE_MODES.NEW,
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
