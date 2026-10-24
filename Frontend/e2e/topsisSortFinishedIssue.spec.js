import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { loginAsAuthSmokeUser } from "./support/loginAsAuthSmokeUser.js";
import { getLatestTopsisSortScenarioIssue } from "./support/topsisSortScenario.js";

const generatedIssue = getLatestTopsisSortScenarioIssue("topsis-sort-2016-rich");
const scenarioFixture = JSON.parse(readFileSync(
  fileURLToPath(new URL("../../Automation/issue_scenario_lab/data/topsis_sort_2016_rich.json", import.meta.url)),
  "utf8",
));
const viewports = [
  { name: "desktop", size: { width: 1440, height: 960 } },
  { name: "mobile", size: { width: 390, height: 844 } },
];

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const hasMatrixShape = (matrix, expectedRows, expectedColumns) =>
  isObject(matrix) &&
  Object.keys(matrix).length === expectedRows &&
  Object.values(matrix).every((row) => isObject(row) && Object.keys(row).length === expectedColumns);

const assertAdvancedFinishedPayload = (payload) => {
  expect(payload.models.base.technical.apiModelKey).toBe("topsis_sort_2016");
  expect(payload.models.criteriaWeighting.technical.apiModelKey).toBe("manual_criteria_weights");
  expect(payload.participants.filter((participant) => participant.invitationStatus === "accepted")).toHaveLength(4);

  const leafCriteria = payload.criteria.nodes.filter((criterion) => criterion.isLeaf);
  const expectedWeights = scenarioFixture.expectedCriteriaWeights;
  const criteriaByName = new Map(scenarioFixture.criteria.map((criterion) => [criterion.name, criterion.key]));
  const weightsByCriterionId = payload.criteria.finalWeights.byCriterionId;
  expect(Object.keys(weightsByCriterionId)).toHaveLength(6);
  expect(Object.values(weightsByCriterionId).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 9);
  for (const criterion of leafCriteria) {
    const key = criteriaByName.get(criterion.name);
    expect(weightsByCriterionId[criterion.id]).toBeCloseTo(expectedWeights[key], 9);
  }

  const individualAlternativeEvaluations = payload.evaluations.individual.filter(
    (entry) => entry.stage === "alternativeEvaluation",
  );
  expect(new Set(individualAlternativeEvaluations.map((entry) => entry.expertId)).size).toBe(4);
  expect(individualAlternativeEvaluations).toHaveLength(4);
  expect(individualAlternativeEvaluations.every((entry) =>
    hasMatrixShape(entry.rawPayload, 10, 6),
  )).toBe(true);

  const collective = payload.evaluations.collective.find(
    (entry) => entry.stage === "alternativeEvaluation",
  );
  expect(collective).toBeTruthy();
  expect(hasMatrixShape(collective.rawPayload, 10, 6)).toBe(true);

  const result = payload.phaseResults.find((entry) => entry.stage === "alternativeEvaluation");
  expect(result).toBeTruthy();
  const categories = result.standardizedOutput.categories;
  expect(categories.map((category) => category.label)).toEqual(
    scenarioFixture.orderedCategories.map((category) => category.label),
  );
  const alternativesById = new Map(payload.alternatives.map((alternative) => [alternative.id, alternative.name]));
  const keyByName = new Map(scenarioFixture.alternatives.map((alternative) => [alternative.name, alternative.key]));
  const assignmentsByKey = new Map(result.standardizedOutput.assignments.map((assignment) => [
    keyByName.get(alternativesById.get(assignment.alternativeId)),
    assignment.categoryId,
  ]));
  expect(assignmentsByKey).toEqual(new Map(Object.entries(scenarioFixture.expectedAssignments)));
};

for (const viewport of viewports) {
  test(`TOPSIS-Sort rich Finished Issue renders correctly on ${viewport.name}`, async ({ page }) => {
    const diagnostics = {
      pageErrors: [],
      consoleErrors: [],
      failedRequests: [],
      failedResponses: [],
    };
    let finishedIssuePayload = null;

    page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const error = request.failure()?.errorText || "request failed";
      if (!error.includes("ERR_ABORTED")) diagnostics.failedRequests.push(`${request.method()} ${request.url()}: ${error}`);
    });
    page.on("response", async (response) => {
      const isExpectedUnauthenticatedResponse = response.status() === 401 && response.url().includes("/api/auth/");
      if (response.status() >= 400 && !isExpectedUnauthenticatedResponse) {
        diagnostics.failedResponses.push(`${response.status()} ${response.url()}`);
      }
      if (
        response.status() === 200 &&
        response.request().method() === "GET" &&
        response.url().includes(`/issues/finished/${generatedIssue.issueId}`)
      ) {
        try {
          const body = await response.json();
          finishedIssuePayload = body?.data ?? body;
        } catch {
          // The response diagnostics below report transport failures; a non-JSON body is asserted via missing payload.
        }
      }
    });

    await page.setViewportSize({ width: 1440, height: 960 });
    await loginAsAuthSmokeUser(page);
    page.on("console", (message) => {
      if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
    });

    await page.getByRole("tab", { name: "Finished", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Finished issues", exact: true })).toBeVisible({ timeout: 20_000 });

    if (viewport.name === "mobile") {
      await page.setViewportSize(viewport.size);
      await page.getByRole("button", { name: "open navigation menu" }).click();
      await page.getByRole("menuitem", { name: "Models", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/models$/);
      await page.getByRole("button", { name: "open navigation menu" }).click();
      await page.getByRole("menuitem", { name: "Finished", exact: true }).click();
    }

    await expect(page.getByRole("heading", { name: "Finished issues", exact: true })).toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder("Search...").fill(generatedIssue.issueName);
    const issueHeading = page.getByRole("heading", { name: generatedIssue.issueName, exact: true });
    await expect(issueHeading).toBeVisible();

    const issueCard = page.locator(".MuiPaper-root").filter({ has: issueHeading });
    await expect(issueCard).toHaveCount(1);
    await expect(issueCard.getByLabel("You are the owner")).toBeVisible();
    const cardSummary = issueCard.getByRole("region", { name: "Sorting summary" });
    await expect(cardSummary).toBeVisible();
    await expect(cardSummary.getByText("5 categories", { exact: true })).toBeVisible();
    await expect(cardSummary.getByText("10 alternatives assigned", { exact: true })).toBeVisible();
    await expect(issueCard.getByText(/ranking|position|score|winner/i)).toHaveCount(0);

    await issueHeading.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("tablist", { name: "Finished issue sections" })).toBeVisible();
    await expect(dialog.getByRole("region", { name: "Issue summary" })).toContainText("E2E TOPSIS-Sort 2016");
    await expect(dialog.getByText("Unable to load this Finished Issue.", { exact: true })).toHaveCount(0);

    const summaryTab = dialog.getByRole("tab", { name: "Summary", exact: true });
    await expect(summaryTab).toHaveAttribute("aria-selected", "true");
    const categoryList = dialog.getByRole("list", { name: "Final sorting by category" });
    const categoryCards = categoryList.locator('[role="listitem"][aria-label]');
    await expect(categoryCards).toHaveCount(5);
    const expectedDisplayOrder = ["Very High", "High", "Medium", "Low", "Very Low"];
    for (const [index, label] of expectedDisplayOrder.entries()) {
      await expect(categoryCards.nth(index)).toHaveAttribute("aria-label", new RegExp(`^${label}: \\d+ alternatives?$`));
      await expect(categoryCards.nth(index)).toContainText(label);
    }
    await expect(categoryCards.nth(0)).toContainText("No alternatives assigned.");
    await expect(categoryCards.nth(1)).toContainText("Juniper Integrated Manufacturing");
    for (const alternative of [
      "Asterion Precision", "Blue Harbor Logistics", "Cedar Ridge Components", "Dune Source Cooperative",
      "Evergreen Circular Supply", "Falcon Express Parts", "Helios Advanced Materials", "Indigo Materials",
    ]) await expect(categoryCards.nth(2)).toContainText(alternative);
    await expect(categoryCards.nth(3)).toContainText("Granite Systems");
    await expect(categoryCards.nth(4)).toContainText("No alternatives assigned.");
    const findings = dialog.getByRole("region", { name: "Key findings" });
    await expect(findings.getByText("Most favorable classification", { exact: true })).toBeVisible();
    await expect(findings.getByText("Closest category boundary", { exact: true })).toBeVisible();
    await expect(findings.getByText("Least favorable classification", { exact: true })).toBeVisible();
    await expect(dialog.getByText(/\b(rank|ranking|position|score|winner)\b/i)).toHaveCount(0);
    await expect(dialog.getByText(/Spearman/i)).toHaveCount(0);
    await expect.poll(() => {
      const collective = finishedIssuePayload?.evaluations?.collective?.find(
        (entry) => entry.stage === "alternativeEvaluation",
      );
      return hasMatrixShape(collective?.rawPayload, 10, 6);
    }).toBe(true);
    assertAdvancedFinishedPayload(finishedIssuePayload);

    const issueInfoTab = dialog.getByRole("tab", { name: "Issue info", exact: true });
    await issueInfoTab.click();
    await expect(issueInfoTab).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByText("Supplier Selection Study", { exact: false })).toBeVisible();

    const evaluationsTab = dialog.getByRole("tab", { name: "Evaluations", exact: true });
    await evaluationsTab.click();
    await expect(evaluationsTab).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByTestId("evaluations-workspace")).toBeVisible();
    const expertSelector = dialog.getByRole("combobox", { name: "Expert" });
    await expertSelector.click();
    await expect(page.getByRole("option")).toHaveCount(4);
    await page.keyboard.press("Escape");
    await dialog.getByRole("button", { name: "Show collective values" }).click();
    const alternativeEvaluationPanel = dialog.getByTestId("evaluation-stage-panel-alternativeEvaluation");
    await expect(alternativeEvaluationPanel.getByRole("row")).toHaveCount(11);
    await expect(alternativeEvaluationPanel.getByRole("columnheader")).toHaveCount(
      viewport.name === "mobile" ? 3 : 7,
    );
    await expect(alternativeEvaluationPanel).toContainText("Purchase cost");
    await expect(alternativeEvaluationPanel).toContainText("Asterion Precision");

    const modelsTab = dialog.getByRole("tab", { name: "Models", exact: true });
    await modelsTab.click();
    await expect(modelsTab).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByTestId("models-execution-gallery")).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Selected execution — Base", exact: true })).toBeVisible();
    await expect(dialog.getByText("E2E TOPSIS-Sort 2016", { exact: true })).toBeVisible();

    const analysisTab = dialog.getByRole("tab", { name: "Analysis", exact: true });
    await analysisTab.click();
    await expect(analysisTab).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByTestId("results-analysis-unavailable")).toHaveCount(0);
    await expect(dialog.getByText("General visualizations", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Alternative evaluation visualizations", { exact: true })).toBeVisible();

    const boundaryPane = dialog.getByTestId("alternative-evaluation-visualization-pane")
      .filter({ hasText: "Closeness and category boundaries" });
    const boundaryCanvas = boundaryPane.getByTestId("scatter-analytical-graph");
    await expect(boundaryCanvas).toBeVisible();
    await boundaryCanvas.scrollIntoViewIfNeeded();
    const chartInfo = await boundaryCanvas.evaluate(async (canvas) => {
      const { Chart } = await import("/node_modules/.vite/deps/chart__js.js");
      const chart = Chart.getChart(canvas);
      const rect = canvas.getBoundingClientRect();
      if (!chart) return null;
      const referenceDatasets = chart.data.datasets.flatMap((dataset, index) => {
        if (dataset.isNonInteractiveReference !== true) return [];
        const points = chart.getDatasetMeta(index).data.map((element) => element.getProps(["x", "y"], true));
        return [{
          label: dataset.label,
          index,
          points,
        }];
      });
      const alternativeDataset = chart.data.datasets.findIndex((dataset) => dataset.isNonInteractiveReference !== true && dataset.data.length);
      const alternativeElement = alternativeDataset >= 0 ? chart.getDatasetMeta(alternativeDataset).data[0] : null;
      const alternativePoint = alternativeElement?.getProps(["x", "y"], true) || null;
      const referenceSamples = referenceDatasets.flatMap((dataset) => {
        const points = dataset.points;
        return points.flatMap((point, index) => {
          const following = points[index + 1];
          const samples = [point];
          if (following) samples.push({ x: (point.x + following.x) / 2, y: (point.y + following.y) / 2 });
          return samples;
        });
      });
      return {
        labels: referenceDatasets.map((dataset) => dataset.label),
        samples: referenceSamples.map((point) => ({
          chartX: point.x,
          chartY: point.y,
          x: rect.left + point.x / chart.width * rect.width,
          y: rect.top + point.y / chart.height * rect.height,
        })),
        alternativePoint: alternativePoint ? {
          chartX: alternativePoint.x,
          chartY: alternativePoint.y,
          x: rect.left + alternativePoint.x / chart.width * rect.width,
          y: rect.top + alternativePoint.y / chart.height * rect.height,
          datasetIndex: alternativeDataset,
          datasetLabel: chart.data.datasets[alternativeDataset].label,
          raw: chart.data.datasets[alternativeDataset].data[0],
        } : null,
        tooltipEnabled: chart.options.plugins?.tooltip?.enabled !== false,
        tooltipLabel: alternativePoint
          ? chart.options.plugins.tooltip.callbacks.label({
            raw: chart.data.datasets[alternativeDataset].data[0],
            dataset: chart.data.datasets[alternativeDataset],
          })
          : null,
      };
    });
    expect(chartInfo).not.toBeNull();
    expect(chartInfo.labels).toHaveLength(4);
    expect(chartInfo.labels.every((label) => label.includes("boundary"))).toBe(true);
    for (const point of chartInfo.samples) {
      await page.mouse.move(point.x, point.y);
      const referenceHits = await boundaryCanvas.evaluate(async (canvas) => {
        const { Chart } = await import("/node_modules/.vite/deps/chart__js.js");
        const chart = Chart.getChart(canvas);
        if (!chart) return null;
        return chart.getActiveElements()
          .filter((hit) => chart.data.datasets[hit.datasetIndex]?.isNonInteractiveReference === true)
          .map((hit) => chart.data.datasets[hit.datasetIndex]?.label);
      });
      expect(referenceHits).not.toBeNull();
      expect(referenceHits).toEqual([]);
    }
    if (chartInfo.alternativePoint) {
      await page.mouse.move(chartInfo.alternativePoint.x, chartInfo.alternativePoint.y);
      const alternativeHits = await boundaryCanvas.evaluate(async (canvas) => {
        const { Chart } = await import("/node_modules/.vite/deps/chart__js.js");
        const chart = Chart.getChart(canvas);
        if (!chart) return null;
        return chart.getActiveElements().map((hit) => ({
          isReference: chart.data.datasets[hit.datasetIndex]?.isNonInteractiveReference === true,
          label: chart.data.datasets[hit.datasetIndex]?.label,
        }));
      });
      expect(chartInfo.tooltipEnabled).toBe(true);
      expect(alternativeHits, JSON.stringify({ alternativePoint: chartInfo.alternativePoint, alternativeHits })).not.toBeNull();
      expect(alternativeHits.some((hit) => !hit.isReference), JSON.stringify({ alternativePoint: chartInfo.alternativePoint, alternativeHits })).toBe(true);
      expect(chartInfo.tooltipLabel).toContainEqual(expect.stringMatching(/^Category: /));
      expect(chartInfo.tooltipLabel).toContainEqual(expect.stringMatching(/^Closeness: \d\.\d{4}$/));
    }

    const criterionSelector = dialog.getByRole("combobox", { name: "Criterion" });
    await expect(criterionSelector).toBeVisible();
    await expect(criterionSelector).toHaveClass(/MuiInputBase-inputSizeSmall/);
    const criterionBox = await criterionSelector.boundingBox();
    expect(criterionBox.width).toBeLessThanOrEqual(viewport.name === "mobile" ? 390 : 320);
    await criterionSelector.click();
    await page.getByRole("option", { name: "Purchase cost", exact: true }).click();
    await expect(criterionSelector).toContainText("Purchase cost");

    const alternativeSelector = dialog.getByRole("combobox", { name: "Alternatives" });
    await expect(alternativeSelector).toBeVisible();
    await expect(alternativeSelector).toHaveClass(/MuiInputBase-inputSizeSmall/);
    const alternativeBox = await alternativeSelector.boundingBox();
    expect(alternativeBox.width).toBeLessThanOrEqual(viewport.name === "mobile" ? 390 : 320);
    await alternativeSelector.click();
    await expect(page.getByRole("option")).toHaveCount(10);
    await page.keyboard.press("Escape");
    const showAllButton = dialog.getByRole("button", { name: "Show all", exact: true });
    const resetButton = dialog.getByRole("button", { name: "Reset", exact: true });
    for (const button of [showAllButton, resetButton]) {
      await expect(button).toHaveClass(/MuiButton-outlined/);
      await expect(button).toHaveClass(/MuiButton-sizeSmall/);
    }
    await showAllButton.click();
    await expect(alternativeSelector).toContainText("10 of 10 selected");
    await resetButton.click();
    await expect(alternativeSelector).toContainText("3 of 10 selected");

    const interpretationTab = dialog.getByRole("tab", { name: "Interpretation", exact: true });
    await interpretationTab.click();
    await expect(interpretationTab).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByText("General analysis", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Alternative evaluation", exact: true })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow, `${viewport.name} viewport should not overflow horizontally`).toBe(false);
    expect(diagnostics, JSON.stringify(diagnostics, null, 2)).toEqual({
      pageErrors: [],
      consoleErrors: [],
      failedRequests: [],
      failedResponses: [],
    });
  });
}
