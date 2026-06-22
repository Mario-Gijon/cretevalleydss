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

const buildEvaluationStructureRegistry = () => {
  const registry = {};
  const modulePaths = Object.keys(STRUCTURE_MODULES).sort((left, right) =>
    left.localeCompare(right)
  );

  for (const modulePath of modulePaths) {
    const structure = extractEvaluationStructureFromModule({
      moduleExports: STRUCTURE_MODULES[modulePath],
      modulePath,
    });
    const folderName = extractFolderName(modulePath);

    if (structure.key !== folderName) {
      throw new Error(
        `${modulePath} structure key '${structure.key}' must match folder name '${folderName}'`
      );
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

export const getEvaluationStructureEntry = (structureKey) =>
  EVALUATION_STRUCTURE_REGISTRY[structureKey] ?? null;

export const getEvaluationStructureEntryForStage = ({ structureKey, stage }) => {
  const entry = getEvaluationStructureEntry(structureKey);

  if (!entry) return null;
  if (entry.stage !== stage) return null;

  return entry;
};
