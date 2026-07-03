import { createBadRequestError } from "../../../utils/common/errors.js";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TYPES_ROOT = path.join(__dirname, "types");

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const isValidExpressionDomainType = (value) =>
  value !== null &&
  typeof value === "object" &&
  isNonEmptyString(value.key) &&
  isNonEmptyString(value.label) &&
  isNonEmptyString(value.description) &&
  isNonEmptyString(value.family) &&
  typeof value.validateCreation === "function" &&
  typeof value.validateEvaluation === "function";

const extractExpressionDomainTypeFromModule = ({ moduleExports, modulePath }) => {
  const domainTypes = Object.entries(moduleExports).filter(([, value]) =>
    isValidExpressionDomainType(value)
  );

  if (domainTypes.length === 0) {
    throw new Error(
      `${modulePath} must export exactly one valid expression domain type object`
    );
  }

  if (domainTypes.length > 1) {
    throw new Error(
      `${modulePath} exports multiple valid expression domain type objects`
    );
  }

  return domainTypes[0][1];
};

const loadExpressionDomainTypes = async () => {
  const entries = fs.readdirSync(TYPES_ROOT, { withFileTypes: true });
  const typeDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const registry = {};

  for (const folderName of typeDirs) {
    const modulePath = path.join(TYPES_ROOT, folderName, "index.js");

    if (!fs.existsSync(modulePath)) {
      throw new Error(
        `Expression domain type folder '${folderName}' must contain index.js`
      );
    }

    const moduleExports = await import(pathToFileURL(modulePath).href);
    const domainType = extractExpressionDomainTypeFromModule({
      moduleExports,
      modulePath,
    });

    if (domainType.key !== folderName) {
      throw new Error(
        `${modulePath} type key '${domainType.key}' must match folder name '${folderName}'`
      );
    }

    if (Object.hasOwn(registry, domainType.key)) {
      throw new Error(
        `Duplicate expression domain type key detected: ${domainType.key}`
      );
    }

    registry[domainType.key] = domainType;
  }

  return Object.freeze(registry);
};

export const EXPRESSION_DOMAIN_TYPE_REGISTRY = await loadExpressionDomainTypes();

export const getExpressionDomainTypeOrThrow = (typeKey) => {
  const domainType = EXPRESSION_DOMAIN_TYPE_REGISTRY[typeKey];

  if (!domainType) {
    throw createBadRequestError(
      `Unsupported expression domain type: ${typeKey}`,
      {
        code: "UNSUPPORTED_EXPRESSION_DOMAIN_TYPE",
        field: "typeKey",
      }
    );
  }

  return domainType;
};
