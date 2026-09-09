const PARAMETER_FIELD_MODULES = import.meta.glob("./fields/*/index.js", {
  eager: true,
});

const isPlainObject = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const isReactComponentCandidate = (component) =>
  typeof component === "function" ||
  (
    component !== null &&
    typeof component === "object" &&
    Object.hasOwn(component, "$$typeof")
  );

const cloneValue = (value) => {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)])
    );
  }
  return value;
};

const isValidParameterFieldEntry = (value) =>
  value !== null &&
  typeof value === "object" &&
  isNonEmptyString(value.key) &&
  isReactComponentCandidate(value.FieldComponent) &&
  isReactComponentCandidate(value.ReadOnlyComponent);

const validateImplementationStatus = ({ entry, modulePath }) => {
  if (!Object.hasOwn(entry, "implementationStatus")) return;

  if (
    entry.implementationStatus !== "ready" &&
    entry.implementationStatus !== "scaffold"
  ) {
    throw new Error(
      `[modelParameters] ${modulePath} implementationStatus must be "ready" or "scaffold" when provided.`
    );
  }
};

const validateNormalizeValue = ({ entry, modulePath }) => {
  if (!Object.hasOwn(entry, "normalizeValue")) return;

  if (typeof entry.normalizeValue !== "function") {
    throw new Error(
      `[modelParameters] ${modulePath} normalizeValue must be a function when provided.`
    );
  }
};

const validateSemanticCapabilities = ({ entry, modulePath }) => {
  if (!Object.hasOwn(entry, "semanticCapabilities")) return;

  if (
    !Array.isArray(entry.semanticCapabilities) ||
    entry.semanticCapabilities.some((capability) => !isNonEmptyString(capability)) ||
    new Set(entry.semanticCapabilities).size !== entry.semanticCapabilities.length
  ) {
    throw new Error(
      `[modelParameters] ${modulePath} semanticCapabilities must be an array of unique non-empty strings when provided.`
    );
  }
};

const validateSemanticCapabilityOwnership = (registry) => {
  const keysByCapability = new Map();

  Object.values(registry).forEach((entry) => {
    (entry.semanticCapabilities || []).forEach((capability) => {
      const existingKey = keysByCapability.get(capability);

      if (existingKey) {
        throw new Error(
          `[modelParameters] Semantic capability "${capability}" is claimed by both "${existingKey}" and "${entry.key}".`
        );
      }

      keysByCapability.set(capability, entry.key);
    });
  });
};

const extractFolderName = (modulePath) => {
  const match = modulePath.match(/\.\/fields\/([^/]+)\/index\.js$/);

  if (!match) {
    throw new Error(`[modelParameters] Invalid parameter field module path: ${modulePath}.`);
  }

  return match[1];
};

const extractParameterFieldEntryFromModule = ({ moduleExports, modulePath }) => {
  const entries = Object.entries(moduleExports).filter(([, value]) =>
    isValidParameterFieldEntry(value)
  );

  if (entries.length === 0) {
    throw new Error(
      `[modelParameters] ${modulePath} must export exactly one valid parameter field entry with key, FieldComponent and ReadOnlyComponent.`
    );
  }

  if (entries.length > 1) {
    throw new Error(
      `[modelParameters] ${modulePath} exports multiple valid parameter field entries.`
    );
  }

  return entries[0][1];
};

export const buildParameterFieldRegistry = (
  parameterFieldModules = PARAMETER_FIELD_MODULES
) => {
  const registry = {};
  const modulePaths = Object.keys(parameterFieldModules).sort((left, right) =>
    left.localeCompare(right)
  );

  for (const modulePath of modulePaths) {
    const entry = extractParameterFieldEntryFromModule({
      moduleExports: parameterFieldModules[modulePath],
      modulePath,
    });
    const folderName = extractFolderName(modulePath);

    validateImplementationStatus({ entry, modulePath });
    validateNormalizeValue({ entry, modulePath });
    validateSemanticCapabilities({ entry, modulePath });

    if (entry.key !== folderName) {
      throw new Error(
        `[modelParameters] ${modulePath} entry key "${entry.key}" must match folder name "${folderName}".`
      );
    }

    if (entry.implementationStatus === "scaffold") {
      continue;
    }

    if (Object.hasOwn(registry, entry.key)) {
      throw new Error(
        `[modelParameters] Duplicate parameter field key detected: "${entry.key}".`
      );
    }

    registry[entry.key] = entry;
  }

  validateSemanticCapabilityOwnership(registry);

  return Object.freeze(registry);
};

export const PARAMETER_FIELD_REGISTRY = buildParameterFieldRegistry();

export const resolveParameterFieldEntryFromRegistry = (registry, parameter) => {
  const parameterKey =
    typeof parameter?.key === "string" && parameter.key.trim()
      ? parameter.key
      : "<unknown>";
  const structureKey =
    typeof parameter?.parameterStructureKey === "string"
      ? parameter.parameterStructureKey.trim()
      : "";

  if (!structureKey) {
    throw new Error(
      `[modelParameters] Missing parameterStructureKey for parameter "${parameterKey}".`
    );
  }

  const entry = registry[structureKey];

  if (!entry) {
    throw new Error(
      `[modelParameters] Unsupported parameterStructureKey "${structureKey}" for parameter "${parameterKey}".`
    );
  }

  return entry;
};

export const resolveParameterFieldEntry = (parameter) =>
  resolveParameterFieldEntryFromRegistry(PARAMETER_FIELD_REGISTRY, parameter);

export const resolveParameterFieldEntryBySemanticCapabilityFromRegistry = (
  registry,
  capability
) => {
  const normalizedCapability =
    typeof capability === "string" ? capability.trim() : "";

  if (!normalizedCapability) return null;

  return (
    Object.values(registry).find((entry) =>
      entry.semanticCapabilities?.includes(normalizedCapability)
    ) || null
  );
};

export const resolveParameterStructureKeyBySemanticCapability = (capability) =>
  resolveParameterFieldEntryBySemanticCapabilityFromRegistry(
    PARAMETER_FIELD_REGISTRY,
    capability
  )?.key || null;

export const normalizeParameterValueFromRegistry = (registry, parameter, value) => {
  const structureKey =
    typeof parameter?.parameterStructureKey === "string"
      ? parameter.parameterStructureKey.trim()
      : "";
  const normalizeValue = registry[structureKey]?.normalizeValue;
  const clonedValue = cloneValue(value);

  return typeof normalizeValue === "function"
    ? cloneValue(normalizeValue(parameter, clonedValue))
    : clonedValue;
};

export const normalizeParameterValue = (parameter, value) =>
  normalizeParameterValueFromRegistry(PARAMETER_FIELD_REGISTRY, parameter, value);
