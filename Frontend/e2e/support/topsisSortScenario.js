import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const manifestPath = fileURLToPath(
  new URL(
    "../../../Automation/issue_scenario_lab/.issue-scenario-lab/manifest.json",
    import.meta.url,
  ),
);

export const getLatestTopsisSortScenarioIssue = () => {
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
    .find((entry) => entry?.scenarioId === "topsis-sort-2016");
  if (!issue) {
    throw new Error(
      `No topsis-sort-2016 generation is recorded in ${manifestPath}. Generate one with Scenario Lab before running this E2E test.`,
    );
  }

  if (
    typeof issue.generationId !== "string" ||
    typeof issue.issueId !== "string" ||
    typeof issue.issueName !== "string" ||
    issue.issueName !== `[AUTO:${issue.generationId}] TOPSIS-Sort 2016 synthetic classification`
  ) {
    throw new Error("The latest TOPSIS-Sort Scenario Lab generation has invalid manifest metadata.");
  }

  return {
    generationId: issue.generationId,
    issueId: issue.issueId,
    issueName: issue.issueName,
  };
};
