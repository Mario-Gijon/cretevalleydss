const STRUCTURE_MODULES = import.meta.glob("./structures/*/index.js", { eager: true });

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const isReactComponentCandidate = (component) =>
  typeof component === "function" ||
  (
    component !== null &&
    typeof component === "object" &&
    Object.hasOwn(component, "$$typeof")
  );

const isValidEvaluationStructure = (value) =>
  value !== null &&
  typeof value === "object" &&
  isNonEmptyString(value.key) &&
  isNonEmptyString(value.stage) &&
  isReactComponentCandidate(value.View);

const validateImplementationStatus = ({ structure, modulePath }) => {
  if (!Object.hasOwn(structure, "implementationStatus")) return;

  if (
    structure.implementationStatus !== "ready" &&
    structure.implementationStatus !== "scaffold"
  ) {
    throw new Error(
      `${modulePath} implementationStatus must be "ready" or "scaffold" when provided`
    );
  }
};

const validateOptionalCapabilities = ({ structure, modulePath }) => {
  if (
    Object.hasOwn(structure, "buildInitialEvaluation") &&
    typeof structure.buildInitialEvaluation !== "function"
  ) {
    throw new Error(
      `${modulePath} buildInitialEvaluation must be a function when provided`
    );
  }
};

const validateOptionalMetadata = ({ structure, modulePath }) => {
  if (
    Object.hasOwn(structure, "displayLabel") &&
    !isNonEmptyString(structure.displayLabel)
  ) {
    throw new Error(`${modulePath} displayLabel must be a non-empty string when provided`);
  }

  if (
    Object.hasOwn(structure, "defaultForStage") &&
    typeof structure.defaultForStage !== "boolean"
  ) {
    throw new Error(`${modulePath} defaultForStage must be a boolean when provided`);
  }
};

const extractFolderName = (modulePath) => {
  const match = modulePath.match(/\.\/structures\/([^/]+)\/index\.js$/);
  if (!match) {
    throw new Error(`Invalid evaluation structure module path: ${modulePath}`);
  }

  return match[1];
};

const extractEvaluationStructureFromModule = ({ moduleExports, modulePath }) => {
  const structures = Object.entries(moduleExports)
    .filter(([, value]) => isValidEvaluationStructure(value));

  if (structures.length === 0) {
    throw new Error(
      `${modulePath} must export exactly one valid evaluation structure object with key, stage and React View`
    );
  }

  if (structures.length > 1) {
    throw new Error(
      `${modulePath} exports multiple valid evaluation structure objects`
    );
  }

  return structures[0][1];
};

export const buildEvaluationStructureRegistry = (
  structureModules = STRUCTURE_MODULES
) => {
  const registry = {};
  const defaultsByStage = new Set();
  const modulePaths = Object.keys(structureModules).sort((left, right) =>
    left.localeCompare(right)
  );

  for (const modulePath of modulePaths) {
    const structure = extractEvaluationStructureFromModule({
      moduleExports: structureModules[modulePath],
      modulePath,
    });
    const folderName = extractFolderName(modulePath);

    validateOptionalCapabilities({ structure, modulePath });
    validateImplementationStatus({ structure, modulePath });
    validateOptionalMetadata({ structure, modulePath });

    if (structure.key !== folderName) {
      throw new Error(
        `${modulePath} structure key '${structure.key}' must match folder name '${folderName}'`
      );
    }

    if (structure.implementationStatus === "scaffold") {
      continue;
    }

    if (structure.defaultForStage === true) {
      if (defaultsByStage.has(structure.stage)) {
        throw new Error(
          `${modulePath} declares a duplicate default evaluation structure for stage '${structure.stage}'`
        );
      }

      defaultsByStage.add(structure.stage);
    }

    if (Object.hasOwn(registry, structure.key)) {
      throw new Error(
        `Duplicate evaluation structure key detected: ${structure.key}`
      );
    }

    registry[structure.key] = structure;
  }

  return Object.freeze(registry);
};

export const EVALUATION_STRUCTURE_REGISTRY = buildEvaluationStructureRegistry();

export const getEvaluationStructureEntryFromRegistry = (registry, structureKey) =>
  registry[structureKey] ?? null;

export const getEvaluationStructureEntry = (structureKey) =>
  getEvaluationStructureEntryFromRegistry(
    EVALUATION_STRUCTURE_REGISTRY,
    structureKey
  );

export const getEvaluationStructureEntryForStage = ({ structureKey, stage }) => {
  const entry = getEvaluationStructureEntry(structureKey);

  if (!entry) return null;
  if (entry.stage !== stage) return null;

  return entry;
};

export const getDefaultEvaluationStructureEntryForStage = (stage) =>
  Object.values(EVALUATION_STRUCTURE_REGISTRY).find(
    (entry) => entry.stage === stage && entry.defaultForStage === true
  ) ?? null;

export const getEvaluationStructureDisplayLabel = (structureKey) => {
  const normalizedKey = typeof structureKey === "string" ? structureKey.trim() : "";
  if (!normalizedKey) return "—";

  return getEvaluationStructureEntry(normalizedKey)?.displayLabel || normalizedKey;
};
