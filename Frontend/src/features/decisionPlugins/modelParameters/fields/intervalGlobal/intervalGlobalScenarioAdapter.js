const ensurePair = (value, filler = "") => {
  const pair = Array.isArray(value) ? value.slice(0, 2) : [];
  return [...pair, ...Array(2 - pair.length).fill(filler)];
};

const parsePair = (value) => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const lower = Number(value[0]);
  const upper = Number(value[1]);
  return Number.isFinite(lower) && Number.isFinite(upper) ? [lower, upper] : null;
};

const satisfiesRestrictions = ({ pair, restrictions }) => {
  if (!pair) return false;
  const [lower, upper] = pair;
  const min = restrictions?.min;
  const max = restrictions?.max;

  if (min != null && (lower < Number(min) || upper < Number(min))) return false;
  if (max != null && (lower > Number(max) || upper > Number(max))) return false;

  if (restrictions?.ordered === "strictIncreasing") return lower < upper;
  if (restrictions?.ordered === "nonDecreasing") return lower <= upper;
  return true;
};

const fallbackValue = (parameter) => {
  if (Array.isArray(parameter?.default)) return parameter.default;
  return [parameter?.restrictions?.min ?? "", parameter?.restrictions?.max ?? ""];
};

const validationError = ({ parameter, pair }) => {
  const restrictions = parameter?.restrictions || {};
  const key = parameter?.key;

  if (!pair) {
    return `Parameter '${key}' must be an array of 2 finite numbers.`;
  }
  if (satisfiesRestrictions({ pair, restrictions })) return null;
  if (restrictions.ordered === "strictIncreasing") {
    return `Parameter '${key}' must satisfy left < right.`;
  }
  if (restrictions.ordered === "nonDecreasing") {
    return `Parameter '${key}' must satisfy left ≤ right.`;
  }
  if (restrictions.min != null) return `Parameter '${key}' must be ≥ ${restrictions.min}.`;
  if (restrictions.max != null) return `Parameter '${key}' must be ≤ ${restrictions.max}.`;
  return `Parameter '${key}' is invalid.`;
};

export const intervalGlobalScenarioAdapter = Object.freeze({
  buildDefault: ({ parameter }) => ensurePair(fallbackValue(parameter)),

  clean: ({ parameter, value }) => {
    const pair = parsePair(ensurePair(value ?? fallbackValue(parameter)));
    return satisfiesRestrictions({ pair, restrictions: parameter?.restrictions || {} })
      ? { ok: true, value: pair }
      : { ok: false };
  },

  validate: ({ parameter, value }) => {
    const pair = parsePair(ensurePair(value ?? fallbackValue(parameter)));
    const message = validationError({ parameter, pair });
    return message ? { ok: false, msg: message } : { ok: true };
  },
});
