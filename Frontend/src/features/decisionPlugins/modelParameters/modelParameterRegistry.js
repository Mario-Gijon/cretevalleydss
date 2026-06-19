const PARAMETER_FIELD_MODULES = import.meta.glob("./fields/*/index.js", {
  eager: true,
});

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const isValidParameterFieldEntry = (value) =>
  value !== null &&
  typeof value === "object" &&
  isNonEmptyString(value.key) &&
  typeof value.FieldComponent === "function" &&
  typeof value.ReadOnlyComponent === "function";

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
      `[modelParameters] ${modulePath} must export exactly one valid parameter field entry.`
    );
  }

  if (entries.length > 1) {
    throw new Error(
      `[modelParameters] ${modulePath} exports multiple valid parameter field entries.`
    );
  }

  return entries[0][1];
};

const buildParameterFieldRegistry = () => {
  const registry = {};
  const modulePaths = Object.keys(PARAMETER_FIELD_MODULES).sort((left, right) =>
    left.localeCompare(right)
  );

  for (const modulePath of modulePaths) {
    const entry = extractParameterFieldEntryFromModule({
      moduleExports: PARAMETER_FIELD_MODULES[modulePath],
      modulePath,
    });
    const folderName = extractFolderName(modulePath);

    if (entry.key !== folderName) {
      throw new Error(
        `[modelParameters] ${modulePath} entry key "${entry.key}" must match folder name "${folderName}".`
      );
    }

    if (Object.hasOwn(registry, entry.key)) {
      throw new Error(
        `[modelParameters] Duplicate parameter field key detected: "${entry.key}".`
      );
    }

    registry[entry.key] = entry;
  }

  return Object.freeze(registry);
};

export const PARAMETER_FIELD_REGISTRY = buildParameterFieldRegistry();

export const resolveParameterFieldEntry = (parameter) => {
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

  const entry = PARAMETER_FIELD_REGISTRY[structureKey];

  if (!entry) {
    throw new Error(
      `[modelParameters] Unsupported parameterStructureKey "${structureKey}" for parameter "${parameterKey}".`
    );
  }

  return entry;
};

export const resolveParameterField = (parameter) =>
  resolveParameterFieldEntry(parameter).FieldComponent;
