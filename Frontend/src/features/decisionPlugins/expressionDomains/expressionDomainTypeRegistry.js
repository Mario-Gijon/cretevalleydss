const TYPE_MODULES = import.meta.glob("./types/*/index.js", { eager: true });

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const isReactComponentCandidate = (component) =>
  typeof component === "function" ||
  (
    component !== null &&
    typeof component === "object" &&
    Object.hasOwn(component, "$$typeof")
  );

const isValidExpressionDomainTypeEntry = (value) =>
  value !== null &&
  typeof value === "object" &&
  isNonEmptyString(value.key) &&
  isNonEmptyString(value.label) &&
  isNonEmptyString(value.description) &&
  isNonEmptyString(value.family) &&
  isReactComponentCandidate(value.CreationForm) &&
  isReactComponentCandidate(value.EvaluationInput);

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
      `[expressionDomains] ${modulePath} must export exactly one valid expression domain type entry with key, label, description, family, CreationForm and EvaluationInput.`
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
  const modulePaths = Object.keys(TYPE_MODULES).sort((left, right) =>
    left.localeCompare(right)
  );

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

export const EXPRESSION_DOMAIN_TYPE_REGISTRY =
  buildExpressionDomainTypeRegistry();

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
  Object.values(EXPRESSION_DOMAIN_TYPE_REGISTRY);

