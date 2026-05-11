export const LINGUISTIC_MEMBERSHIP_FUNCTIONS = {
  triangular: {
    key: "triangular",
    label: "Triangular",
    valueCount: 3,
    yProfile: [0, 1, 0],
  },
  trapezoidal: {
    key: "trapezoidal",
    label: "Trapezoidal",
    valueCount: 4,
    yProfile: [0, 1, 1, 0],
  },
  hexagonal: {
    key: "hexagonal",
    label: "Hexagonal",
    valueCount: 6,
    yProfile: [0, 0.5, 1, 1, 0.5, 0],
  },
};

export const DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION = "triangular";

export const getLinguisticMembershipDefinition = (membershipFunction) => {
  const key = String(membershipFunction || "")
    .trim()
    .toLowerCase();

  return LINGUISTIC_MEMBERSHIP_FUNCTIONS[key] || null;
};

export const getLinguisticMembershipDefinitionOrDefault = (
  membershipFunction
) =>
  getLinguisticMembershipDefinition(membershipFunction) ||
  LINGUISTIC_MEMBERSHIP_FUNCTIONS[DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION];

const roundTo = (value, decimals = 6) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const getOffsetsForValueCount = (valueCount) => {
  if (!Number.isInteger(valueCount) || valueCount < 2) {
    return [];
  }

  const half = (valueCount - 1) / 2;
  return Array.from({ length: valueCount }, (_, index) => index - half);
};

const buildAutomaticLabelValues = ({ center, step, valueCount }) => {
  const offsets = getOffsetsForValueCount(valueCount);

  const values = offsets.map((offset) => roundTo(clamp01(center + offset * step)));
  return values.sort((left, right) => left - right);
};

export const buildAutomaticLinguisticLabels = ({
  labelCount,
  membershipFunction = DEFAULT_LINGUISTIC_MEMBERSHIP_FUNCTION,
  previousLabels = [],
}) => {
  const definition = getLinguisticMembershipDefinitionOrDefault(membershipFunction);
  const safeCount = Number.isInteger(labelCount) ? labelCount : Number(labelCount);

  if (!Number.isInteger(safeCount) || safeCount < 3) {
    return [];
  }

  const step = 1 / (safeCount - 1);

  return Array.from({ length: safeCount }, (_, index) => {
    const previousLabel = previousLabels[index];
    const labelText =
      typeof previousLabel?.label === "string" && previousLabel.label.trim()
        ? previousLabel.label
        : `Label ${index + 1}`;
    const center = index * step;

    return {
      label: labelText,
      values: buildAutomaticLabelValues({
        center,
        step,
        valueCount: definition.valueCount,
      }),
    };
  });
};

export const validateLinguisticLabelValues = (values, valueCount) => {
  if (!Array.isArray(values) || values.length !== valueCount) {
    return false;
  }

  const numericValues = values.map((value) =>
    typeof value === "number" ? value : Number(value)
  );

  if (numericValues.some((value) => !Number.isFinite(value))) {
    return false;
  }

  if (numericValues.some((value) => value < 0 || value > 1)) {
    return false;
  }

  for (let index = 1; index < numericValues.length; index += 1) {
    if (numericValues[index] < numericValues[index - 1]) {
      return false;
    }
  }

  return true;
};
