import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

const normalizeNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const parseNumber = (value) => {
  if (isFiniteNumber(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const buildDomainError = ({
  reason,
  value,
  domainSnapshot,
  context = {},
  extras = null,
}) => {
  throw createBadRequestError(
    `Invalid evaluation value for expression domain: ${reason}`,
    {
      field: "evaluations",
      details: {
        issue: context.issueId ?? null,
        expert: context.expertId ?? null,
        alternative: context.alternativeId ?? null,
        criterion: context.criterionId ?? null,
        comparedAlternative: context.comparedAlternativeId ?? null,
        expressionDomainId: toIdString(domainSnapshot?._id),
        expressionDomainName: domainSnapshot?.name ?? null,
        expressionDomainType: domainSnapshot?.type ?? null,
        receivedValue: value ?? null,
        reason,
        ...(extras && typeof extras === "object" ? extras : {}),
      },
    }
  );
};

const getNumericRangeOrThrow = (domainSnapshot, value, context) => {
  const min = parseNumber(domainSnapshot?.numericRange?.min);
  const max = parseNumber(domainSnapshot?.numericRange?.max);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    buildDomainError({
      reason: "invalid numeric domain range",
      value,
      domainSnapshot,
      context,
    });
  }

  return { min, max, span: max - min };
};

const validateWithinRangeOrThrow = ({ numberValue, min, max, value, domainSnapshot, context }) => {
  if (numberValue < min || numberValue > max) {
    buildDomainError({
      reason: `value is outside numeric domain range [${min}, ${max}]`,
      value,
      domainSnapshot,
      context,
    });
  }
};

const normalizeNumericValueOrThrow = ({ value, domainSnapshot, context }) => {
  const numericValue = parseNumber(value);
  if (!Number.isFinite(numericValue)) {
    buildDomainError({
      reason: "numeric value must be finite",
      value,
      domainSnapshot,
      context,
    });
  }

  const { min, max, span } = getNumericRangeOrThrow(domainSnapshot, value, context);
  validateWithinRangeOrThrow({
    numberValue: numericValue,
    min,
    max,
    value,
    domainSnapshot,
    context,
  });

  return (numericValue - min) / span;
};

const normalizeIntervalToCanonicalOrThrow = ({ value, domainSnapshot, context }) => {
  if (!Array.isArray(value) || value.length !== 2) {
    buildDomainError({
      reason: "interval value must be an array [lower, upper]",
      value,
      domainSnapshot,
      context,
    });
  }

  const lower = parseNumber(value[0]);
  const upper = parseNumber(value[1]);

  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    buildDomainError({
      reason: "interval values must be finite numbers",
      value,
      domainSnapshot,
      context,
    });
  }

  if (lower > upper) {
    buildDomainError({
      reason: "interval must satisfy lower <= upper",
      value,
      domainSnapshot,
      context,
    });
  }

  const { min, max, span } = getNumericRangeOrThrow(domainSnapshot, value, context);
  validateWithinRangeOrThrow({ numberValue: lower, min, max, value, domainSnapshot, context });
  validateWithinRangeOrThrow({ numberValue: upper, min, max, value, domainSnapshot, context });

  return [(lower - min) / span, (upper - min) / span];
};

const normalizeFuzzyArrayToCanonicalOrThrow = ({ value, domainSnapshot, context }) => {
  if (!Array.isArray(value) || value.length < 2) {
    buildDomainError({
      reason: "fuzzy value must be an ordered numeric array",
      value,
      domainSnapshot,
      context,
    });
  }

  const tuple = value.map(parseNumber);

  if (tuple.some((item) => !Number.isFinite(item))) {
    buildDomainError({
      reason: "fuzzy values must be finite numbers",
      value,
      domainSnapshot,
      context,
    });
  }

  for (let index = 1; index < tuple.length; index += 1) {
    if (tuple[index] < tuple[index - 1]) {
      buildDomainError({
        reason: "fuzzy values must be non-decreasing",
        value,
        domainSnapshot,
        context,
      });
    }
  }

  const { min, max, span } = getNumericRangeOrThrow(domainSnapshot, value, context);
  tuple.forEach((numberValue) =>
    validateWithinRangeOrThrow({ numberValue, min, max, value, domainSnapshot, context })
  );

  return tuple.map((numberValue) => (numberValue - min) / span);
};

const getLinguisticValueCountOrThrow = ({ domainSnapshot, value, context }) => {
  const valueCount = parseNumber(domainSnapshot?.valueCount);

  if (!Number.isInteger(valueCount) || valueCount < 2) {
    buildDomainError({
      reason: "linguistic domain valueCount is invalid",
      value,
      domainSnapshot,
      context,
    });
  }

  return valueCount;
};

const buildRepresentativeFromCanonicalFuzzy = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const sum = values.reduce((accumulator, item) => accumulator + item, 0);
  return sum / values.length;
};

const buildCanonicalFuzzyFromLinguisticValues = ({
  values,
  expectedLength,
}) => {
  if (!Array.isArray(values) || values.length !== expectedLength) {
    return null;
  }

  const numericValues = values.map(parseNumber);
  if (numericValues.some((item) => !Number.isFinite(item))) {
    return null;
  }

  const allInCanonicalRange = numericValues.every(
    (item) => item >= 0 && item <= 1
  );

  if (!allInCanonicalRange) {
    return null;
  }

  for (let index = 1; index < numericValues.length; index += 1) {
    if (numericValues[index] < numericValues[index - 1]) {
      return null;
    }
  }

  return numericValues;
};

const findLinguisticLabelByRawValue = ({ value, domainSnapshot }) => {
  const labels = Array.isArray(domainSnapshot?.linguisticLabels)
    ? domainSnapshot.linguisticLabels
    : [];

  if (typeof value === "string") {
    return labels.find((label) => label?.label === value) || null;
  }

  return null;
};

const buildCanonicalFromLinguisticLabelOrThrow = ({ labelDefinition, apiInputFormat, value, domainSnapshot, context }) => {
  if (!labelDefinition) {
    buildDomainError({
      reason: "linguistic label not found in domain",
      value,
      domainSnapshot,
      context,
    });
  }

  const expectedValueCount = getLinguisticValueCountOrThrow({
    domainSnapshot,
    value,
    context,
  });
  const fuzzyValues = buildCanonicalFuzzyFromLinguisticValues({
    values: labelDefinition.values,
    expectedLength: expectedValueCount,
  });
  if (!fuzzyValues) {
    buildDomainError({
      reason: `linguistic label values must have length ${expectedValueCount}, be canonical numbers in [0,1], and be non-decreasing`,
      value,
      domainSnapshot,
      context,
      extras: {
        label: labelDefinition?.label ?? null,
        invalidValues: Array.isArray(labelDefinition?.values)
          ? labelDefinition.values
          : null,
        expectedScale: "[0,1]",
      },
    });
  }

  if (apiInputFormat === "directFuzzyMatrix") {
    return fuzzyValues;
  }

  return buildRepresentativeFromCanonicalFuzzy(fuzzyValues);
};

export const normalizeEvaluationValueForInputOrThrow = ({
  value,
  domainSnapshot,
  apiInputFormat,
  context = {},
}) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (!domainSnapshot || !normalizeNonEmptyString(domainSnapshot?.type)) {
    buildDomainError({
      reason: "expression domain snapshot is missing or invalid",
      value,
      domainSnapshot,
      context,
    });
  }

  const domainType = domainSnapshot.type;

  if (domainType === "numeric") {
    if (Array.isArray(value) && value.length === 2) {
      const canonicalInterval = normalizeIntervalToCanonicalOrThrow({
        value,
        domainSnapshot,
        context,
      });

      if (apiInputFormat === "directFuzzyMatrix") {
        return [canonicalInterval[0], (canonicalInterval[0] + canonicalInterval[1]) / 2, canonicalInterval[1]];
      }

      return (canonicalInterval[0] + canonicalInterval[1]) / 2;
    }

    if (Array.isArray(value) && value.length >= 3) {
      const canonicalTuple = normalizeFuzzyArrayToCanonicalOrThrow({
        value,
        domainSnapshot,
        context,
      });

      if (apiInputFormat === "directFuzzyMatrix") {
        return canonicalTuple;
      }

      return buildRepresentativeFromCanonicalFuzzy(canonicalTuple);
    }

    return normalizeNumericValueOrThrow({
      value,
      domainSnapshot,
      context,
    });
  }

  if (domainType === "linguistic") {
    const labelDefinition = findLinguisticLabelByRawValue({ value, domainSnapshot });
    return buildCanonicalFromLinguisticLabelOrThrow({
      labelDefinition,
      apiInputFormat,
      value,
      domainSnapshot,
      context,
    });
  }

  buildDomainError({
    reason: `unsupported domain type '${domainType}'`,
    value,
    domainSnapshot,
    context,
  });
};

const denormalizeNumericCanonicalValueOrThrow = ({ canonicalValue, domainSnapshot, context }) => {
  const numeric = parseNumber(canonicalValue);
  if (!Number.isFinite(numeric)) {
    buildDomainError({
      reason: "canonical value must be numeric",
      value: canonicalValue,
      domainSnapshot,
      context,
    });
  }

  const { min, max, span } = getNumericRangeOrThrow(domainSnapshot, canonicalValue, context);

  if (numeric < 0 || numeric > 1) {
    buildDomainError({
      reason: "canonical numeric value must be within [0, 1]",
      value: canonicalValue,
      domainSnapshot,
      context,
    });
  }

  const rawValue = min + numeric * span;
  const step = parseNumber(domainSnapshot?.numericRange?.step);

  if (Number.isFinite(step) && step > 0) {
    const aligned = min + Math.round((rawValue - min) / step) * step;
    return Number(aligned.toFixed(10));
  }

  return Number(rawValue.toFixed(10));
};

const tupleDistanceOrThrow = ({
  left,
  right,
  domainSnapshot,
  value,
  context,
}) => {
  if (!Array.isArray(left) || !Array.isArray(right)) {
    buildDomainError({
      reason: "fuzzy values must be arrays",
      value,
      domainSnapshot,
      context,
    });
  }

  if (left.length !== right.length) {
    buildDomainError({
      reason: "fuzzy values must have the same length",
      value,
      domainSnapshot,
      context,
      extras: {
        leftLength: left.length,
        rightLength: right.length,
      },
    });
  }

  return Math.sqrt(
    left.reduce((sum, item, index) => sum + (item - right[index]) ** 2, 0)
  );
};

const findNearestLinguisticLabelForCrisp = ({
  canonicalValue,
  domainSnapshot,
  expectedValueCount,
}) => {
  const labels = Array.isArray(domainSnapshot?.linguisticLabels)
    ? domainSnapshot.linguisticLabels
    : [];

  if (!labels.length) {
    return null;
  }

  let bestLabel = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  labels.forEach((labelDefinition) => {
    const fuzzyValues = buildCanonicalFuzzyFromLinguisticValues({
      values: labelDefinition.values,
      expectedLength: expectedValueCount,
    });
    if (!fuzzyValues) {
      return;
    }

    const representative = buildRepresentativeFromCanonicalFuzzy(fuzzyValues);
    if (!Number.isFinite(representative)) {
      return;
    }
    const distance = Math.abs(representative - canonicalValue);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestLabel = labelDefinition;
    }
  });

  return bestLabel;
};

const findNearestLinguisticLabelForFuzzy = ({
  canonicalTuple,
  domainSnapshot,
  expectedValueCount,
  value,
  context,
}) => {
  const labels = Array.isArray(domainSnapshot?.linguisticLabels)
    ? domainSnapshot.linguisticLabels
    : [];

  if (!labels.length) {
    return null;
  }

  let bestLabel = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  labels.forEach((labelDefinition) => {
    const fuzzyValues = buildCanonicalFuzzyFromLinguisticValues({
      values: labelDefinition.values,
      expectedLength: expectedValueCount,
    });
    if (!fuzzyValues) {
      return;
    }

    const distance = tupleDistanceOrThrow({
      left: canonicalTuple,
      right: fuzzyValues,
      domainSnapshot,
      value,
      context,
    });
    if (distance < bestDistance) {
      bestDistance = distance;
      bestLabel = labelDefinition;
    }
  });

  return bestLabel;
};

export const denormalizeCanonicalValueForDomainOrThrow = ({
  canonicalValue,
  domainSnapshot,
  context = {},
}) => {
  if (!domainSnapshot || !normalizeNonEmptyString(domainSnapshot?.type)) {
    return {
      canonicalValue,
      localizedValue: canonicalValue,
      localizedLabel: null,
    };
  }

  if (domainSnapshot.type === "numeric") {
    return {
      canonicalValue,
      localizedValue: denormalizeNumericCanonicalValueOrThrow({
        canonicalValue,
        domainSnapshot,
        context,
      }),
      localizedLabel: null,
    };
  }

  if (domainSnapshot.type === "linguistic") {
    const expectedValueCount = getLinguisticValueCountOrThrow({
      domainSnapshot,
      value: canonicalValue,
      context,
    });

    if (Array.isArray(canonicalValue)) {
      if (canonicalValue.length !== expectedValueCount) {
        buildDomainError({
          reason: `canonical linguistic fuzzy value must have length ${expectedValueCount}`,
          value: canonicalValue,
          domainSnapshot,
          context,
        });
      }

      const labelDefinition = findNearestLinguisticLabelForFuzzy({
        canonicalTuple: canonicalValue,
        domainSnapshot,
        expectedValueCount,
        value: canonicalValue,
        context,
      });

      return {
        canonicalValue,
        localizedValue: labelDefinition?.label ?? null,
        localizedLabel: labelDefinition?.label ?? null,
      };
    }

    const numeric = parseNumber(canonicalValue);
    if (!Number.isFinite(numeric)) {
      buildDomainError({
        reason: "canonical linguistic value must be numeric or fuzzy tuple",
        value: canonicalValue,
        domainSnapshot,
        context,
      });
    }

    const labelDefinition = findNearestLinguisticLabelForCrisp({
      canonicalValue: numeric,
      domainSnapshot,
      expectedValueCount,
    });

    return {
      canonicalValue: numeric,
      localizedValue: labelDefinition?.label ?? null,
      localizedLabel: labelDefinition?.label ?? null,
    };
  }

  return {
    canonicalValue,
    localizedValue: canonicalValue,
    localizedLabel: null,
  };
};
