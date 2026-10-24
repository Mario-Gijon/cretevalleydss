import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";

const defaultManifestPath = fileURLToPath(
  new URL(
    "../../../Automation/issue_scenario_lab/.issue-scenario-lab/manifest.json",
    import.meta.url,
  ),
);
const manifestPath = env.SCENARIO_LAB_MANIFEST_FILE
  ? resolve(env.SCENARIO_LAB_MANIFEST_FILE)
  : defaultManifestPath;

export const getLatestTopsisSortScenarioIssue = (scenarioId = "topsis-sort-2016-rich") => {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Unable to read the Scenario Lab manifest at ${manifestPath}. Generate a TOPSIS-Sort 2016 Issue with Scenario Lab before running this E2E test.`,
      { cause: error },
    );
  }

  const generatedIssues = manifest?.generatedIssues;
  if (!Array.isArray(generatedIssues)) {
    throw new Error(`Scenario Lab manifest has no generatedIssues list: ${manifestPath}`);
  }

  const issue = [...generatedIssues]
    .reverse()
    .find((entry) => entry?.scenarioId === scenarioId);
  if (!issue) {
    throw new Error(
      `No ${scenarioId} generation is recorded in ${manifestPath}. Generate one with Scenario Lab before running this E2E test.`,
    );
  }

  if (
    typeof issue.generationId !== "string" ||
    typeof issue.issueId !== "string" ||
    typeof issue.issueName !== "string" ||
    !issue.issueName.startsWith(`[AUTO:${issue.generationId}] TOPSIS-Sort`)
  ) {
    throw new Error("The latest TOPSIS-Sort Scenario Lab generation has invalid manifest metadata.");
  }

  return {
    generationId: issue.generationId,
    issueId: issue.issueId,
    issueName: issue.issueName,
  };
};
