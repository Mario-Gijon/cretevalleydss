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
  /from\s+["'][^"']*\/decisionPlugins\/evaluations["']/,
  /from\s+["'][^"']*\/issueEvaluation["']/,
  /from\s+["'][^"']*\/issueExperts["']/,
  /from\s+["'](?![^"']*decisionPlugins\/modelParameters)[^"']*\/modelParameters["']/,
];

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
});
