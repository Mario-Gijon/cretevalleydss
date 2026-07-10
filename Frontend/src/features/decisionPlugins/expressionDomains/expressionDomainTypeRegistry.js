const TYPE_MODULES = import.meta.glob("./types/*/index.js", { eager: true });
const EXPRESSION_DOMAIN_TYPE_ORDER = Object.freeze([
  "numericContinuous",
  "numericDiscrete",
  "linguisticOrdinal",
  "linguisticFuzzy",
]);

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isReactComponentCandidate = (component) =>
  typeof component === "function" ||
  (
    component !== null &&
    typeof component === "object" &&
    Object.hasOwn(component, "$$typeof")
  );

const isValidPairwiseComparisonCapability = (value) =>
  isPlainObject(value) &&
  typeof value.assertSupported === "function" &&
  typeof value.getInverseValue === "function";

const isValidExpressionDomainTypeEntry = (value) =>
  isPlainObject(value) &&
  isNonEmptyString(value.key) &&
  isNonEmptyString(value.label) &&
  isNonEmptyString(value.description) &&
  isNonEmptyString(value.family) &&
  isReactComponentCandidate(value.CreationForm) &&
  isReactComponentCandidate(value.EvaluationInput) &&
  (value.validateEvaluation === undefined ||
    typeof value.validateEvaluation === "function") &&
  (value.pairwiseComparison === undefined ||
    isValidPairwiseComparisonCapability(value.pairwiseComparison));

const extractFolderName = (modulePath) => {
  const match = modulePath.match(/\.\/types\/([^/]+)\/index\.js$/);

  if (!match) {
    throw new Error(
      `[expressionDomains] Invalid expression domain type module path: ${modulePath}.`
    );
  }

  return match[1];
};

const extractTypeEntryFromModule = ({ moduleExports, modulePath }) => {
  const entries = Object.entries(moduleExports).filter(([, value]) =>
    isValidExpressionDomainTypeEntry(value)
  );

  if (entries.length === 0) {
    throw new Error(
      `[expressionDomains] ${modulePath} must export exactly one valid expression domain type entry with key, label, description, family, CreationForm, EvaluationInput, optional validateEvaluation, and optional pairwiseComparison.`
    );
  }

  if (entries.length > 1) {
    throw new Error(
      `[expressionDomains] ${modulePath} exports multiple valid expression domain type entries.`
    );
  }

  return entries[0][1];
};

const buildExpressionDomainTypeRegistry = () => {
  const registry = {};
  const modulePaths = Object.keys(TYPE_MODULES);

  for (const modulePath of modulePaths) {
    const entry = extractTypeEntryFromModule({
      moduleExports: TYPE_MODULES[modulePath],
      modulePath,
    });
    const folderName = extractFolderName(modulePath);

    if (entry.key !== folderName) {
      throw new Error(
        `[expressionDomains] ${modulePath} entry key "${entry.key}" must match folder name "${folderName}".`
      );
    }

    if (Object.hasOwn(registry, entry.key)) {
      throw new Error(
        `[expressionDomains] Duplicate expression domain type key detected: "${entry.key}".`
      );
    }

    registry[entry.key] = entry;
  }

  return Object.freeze(registry);
};

const sortExpressionDomainTypeEntries = (entries) =>
  [...entries].sort((left, right) => {
    const leftIndex = EXPRESSION_DOMAIN_TYPE_ORDER.indexOf(left.key);
    const rightIndex = EXPRESSION_DOMAIN_TYPE_ORDER.indexOf(right.key);
    const safeLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const safeRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    if (safeLeftIndex !== safeRightIndex) {
      return safeLeftIndex - safeRightIndex;
    }

    return left.key.localeCompare(right.key);
  });

export const EXPRESSION_DOMAIN_TYPE_REGISTRY =
  buildExpressionDomainTypeRegistry();

const ORDERED_EXPRESSION_DOMAIN_TYPE_ENTRIES = Object.freeze(
  sortExpressionDomainTypeEntries(
    Object.values(EXPRESSION_DOMAIN_TYPE_REGISTRY)
  )
);

export const getExpressionDomainTypeEntry = (typeKey) =>
  EXPRESSION_DOMAIN_TYPE_REGISTRY[typeKey] ?? null;

export const getExpressionDomainTypeEntryOrThrow = (typeKey) => {
  const entry = getExpressionDomainTypeEntry(typeKey);

  if (!entry) {
    throw new Error(
      `[expressionDomains] Unsupported expression domain type key "${typeKey}".`
    );
  }

  return entry;
};

export const listExpressionDomainTypeEntries = () =>
  ORDERED_EXPRESSION_DOMAIN_TYPE_ENTRIES;
