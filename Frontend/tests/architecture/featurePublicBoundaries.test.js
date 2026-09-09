import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";

import {
  ActiveIssuesPill,
  getActiveIssuesAuroraBg,
  getActiveIssuesHeaderGlassSx,
  getActiveIssuesPanelGlassSx,
} from "../../src/features/activeIssues/shared";

const FEATURES_ROOT = join(cwd(), "src/features");
const SOURCE_ROOT = join(cwd(), "src");
const DECISION_PLUGINS_ROOT = join(FEATURES_ROOT, "decisionPlugins");
const EVALUATION_STRUCTURES_ROOT = join(
  DECISION_PLUGINS_ROOT,
  "evaluations/structures"
);
const PARAMETER_STRUCTURES_ROOT = join(
  DECISION_PLUGINS_ROOT,
  "modelParameters/fields"
);

const listSourceFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return [".js", ".jsx"].includes(extname(entry.name)) ? [entryPath] : [];
  });

const PRIVATE_CROSS_FEATURE_PATHS = [
  "/activeIssues/components/ActiveIssuesPill",
  "/activeIssues/styles/activeIssues.styles",
  "/expressionDomains/ExpressionDomainEvaluationInput",
  "/expressionDomains/expressionDomainTypeMetadataCatalog",
  "/expressionDomains/operations",
];

const EAGER_BROAD_ENTRY_IMPORTS = [
  /from\s+["'][^"']*\/issueEvaluation["']/,
  /from\s+["'][^"']*\/issueExperts["']/,
  /from\s+["'](?![^"']*decisionPlugins\/modelParameters)[^"']*\/modelParameters["']/,
];

const DECISION_PLUGIN_PUBLIC_IMPORT_SUFFIXES = [
  "/decisionPlugins/evaluations/registry",
  "/decisionPlugins/modelParameters",
];

const EXTERNAL_DECISION_PLUGIN_IMPORT_PATTERN =
  /(?:from\s+|import\s*\()\s*["']([^"']*\/decisionPlugins(?:\/[^"']*)?)["']/g;

const listExternalDecisionPluginImports = () =>
  listSourceFiles(SOURCE_ROOT)
    .filter((filePath) => !filePath.startsWith(DECISION_PLUGINS_ROOT))
    .flatMap((filePath) => {
      const source = readFileSync(filePath, "utf8");
      const imports = Array.from(source.matchAll(EXTERNAL_DECISION_PLUGIN_IMPORT_PATTERN))
        .map((match) => match[1])
        .filter(
          (importPath) =>
            !DECISION_PLUGIN_PUBLIC_IMPORT_SUFFIXES.some((suffix) =>
              importPath.endsWith(suffix)
            )
        );

      return imports.map((importPath) => ({
        file: filePath.slice(SOURCE_ROOT.length + 1),
        importPath,
      }));
    });

const listRegisteredEvaluationStructureKeys = () =>
  readdirSync(EVALUATION_STRUCTURES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const source = readFileSync(
        join(EVALUATION_STRUCTURES_ROOT, entry.name, "index.js"),
        "utf8"
      );

      if (/implementationStatus:\s*["']scaffold["']/.test(source)) {
        return [];
      }

      const keyMatch = source.match(/key:\s*["']([^"']+)["']/);
      return keyMatch ? [keyMatch[1]] : [];
    });

const listRegisteredParameterStructureKeys = () =>
  readdirSync(PARAMETER_STRUCTURES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const source = readFileSync(
        join(PARAMETER_STRUCTURES_ROOT, entry.name, "index.js"),
        "utf8"
      );

      if (/implementationStatus:\s*["']scaffold["']/.test(source)) {
        return [];
      }

      const keyMatch = source.match(/key:\s*["']([^"']+)["']/);
      return keyMatch ? [keyMatch[1]] : [];
    });

const hasQuotedValue = (source, value) =>
  ["'", '"', "`"].some((quote) => source.includes(`${quote}${value}${quote}`));

const findConcreteEvaluationStructureIdentity = ({ source, file }) =>
  listRegisteredEvaluationStructureKeys()
    .filter((structureKey) => hasQuotedValue(source, structureKey))
    .map((structureKey) => ({ file, structureKey }));

const listConcreteEvaluationStructureIdentities = () =>
  listSourceFiles(SOURCE_ROOT)
    .filter((filePath) => !filePath.startsWith(DECISION_PLUGINS_ROOT))
    .flatMap((filePath) =>
      findConcreteEvaluationStructureIdentity({
        source: readFileSync(filePath, "utf8"),
        file: filePath.slice(SOURCE_ROOT.length + 1),
      })
    );

describe("feature public API boundaries", () => {
  it("exposes shared active-issue visuals without the full feature entry", () => {
    expect(ActiveIssuesPill).toBeTypeOf("function");
    expect(getActiveIssuesAuroraBg).toBeTypeOf("function");
    expect(getActiveIssuesHeaderGlassSx).toBeTypeOf("function");
    expect(getActiveIssuesPanelGlassSx).toBeTypeOf("function");
  });

  it("keeps shared active-issue and expression-domain consumers on public APIs", () => {
    const violations = listSourceFiles(FEATURES_ROOT).flatMap((filePath) => {
      const source = readFileSync(filePath, "utf8");

      return PRIVATE_CROSS_FEATURE_PATHS.filter((privatePath) =>
        source.includes(privatePath)
      ).map((privatePath) => ({
        file: filePath.slice(FEATURES_ROOT.length + 1),
        privatePath,
      }));
    });

    expect(violations).toEqual([]);
  });

  it("uses focused plugin subentries instead of eagerly loading broad feature barrels", () => {
    const violations = listSourceFiles(FEATURES_ROOT).flatMap((filePath) => {
      const source = readFileSync(filePath, "utf8");

      return EAGER_BROAD_ENTRY_IMPORTS.filter((pattern) =>
        pattern.test(source)
      ).map((pattern) => ({
        file: filePath.slice(FEATURES_ROOT.length + 1),
        pattern: String(pattern),
      }));
    });

    expect(violations).toEqual([]);
  });

  it("keeps external Decision Plugin consumers on focused public contracts", () => {
    expect(listExternalDecisionPluginImports()).toEqual([]);
  });

  it("keeps registered evaluation structure identities inside Decision Plugins", () => {
    expect(listConcreteEvaluationStructureIdentities()).toEqual([]);
  });

  it("detects a concrete registered structure identity outside the plugin boundary", () => {
    const [structureKey] = listRegisteredEvaluationStructureKeys();

    expect(
      findConcreteEvaluationStructureIdentity({
        source: `const structureKey = "${structureKey}";`,
        file: "features/example/example.js",
      })
    ).toEqual([{ file: "features/example/example.js", structureKey }]);
  });

  it("keeps general model-parameter value state free of parameter-plugin identities", () => {
    const source = readFileSync(
      join(FEATURES_ROOT, "modelParameters/logic/modelParameterValueState.js"),
      "utf8"
    );

    expect(
      listRegisteredParameterStructureKeys().filter((structureKey) =>
        hasQuotedValue(source, structureKey)
      )
    ).toEqual([]);
  });
});
