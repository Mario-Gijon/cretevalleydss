const EXPERT_WEIGHT_INPUT_DECIMALS = 3;

export const formatExpertWeightInputValue = (value) => {
  if (value === "") {
    return "";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  return numericValue
    .toFixed(EXPERT_WEIGHT_INPUT_DECIMALS)
    .replace(/\.?0+$/, "");
};

export const normalizeExpertWeightInput = (value) => {
  const normalizedValue = value.replace(",", ".").trim();

  if (normalizedValue === "") {
    return "";
  }

  if (!/^\d*\.?\d*$/.test(normalizedValue)) {
    return null;
  }

  const hasDecimalPoint = normalizedValue.includes(".");
  const [rawInteger = "", rawDecimal = ""] = normalizedValue.split(".");
  const integerPart = rawInteger === "" ? "0" : rawInteger;

  if (Number(integerPart) > 1) {
    return null;
  }

  if (rawDecimal.length > EXPERT_WEIGHT_INPUT_DECIMALS) {
    return null;
  }

  const decimalPart = rawDecimal;

  if (Number(integerPart) === 1 && /[1-9]/.test(decimalPart)) {
    return null;
  }

  if (hasDecimalPoint) {
    return `${integerPart}.${decimalPart}`;
  }

  return integerPart;
};

export const toExpertWeightStateValue = (value) => {
  if (value === "" || value.endsWith(".")) {
    return "";
  }

  return Number(value);
};

export const commitExpertWeightInputValue = (value) => {
  if (value === "") {
    return "";
  }

  const trimmedValue = value.endsWith(".") ? value.slice(0, -1) : value;

  if (trimmedValue === "") {
    return "";
  }

  return formatExpertWeightInputValue(trimmedValue);
};

export const buildExpertWeightInputValues = (
  emails,
  weights,
  editingEmail,
  previousInputs
) =>
  emails.reduce((accumulator, email) => {
    if (email === editingEmail && previousInputs[email] !== undefined) {
      accumulator[email] = previousInputs[email];
      return accumulator;
    }

    accumulator[email] = formatExpertWeightInputValue(weights[email]);
    return accumulator;
  }, {});

export const haveExpertWeightInputsChanged = (left, right) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return true;
  }

  return leftKeys.some((key) => left[key] !== right[key]);
};
