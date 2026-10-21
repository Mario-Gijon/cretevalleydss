import { expect, test } from "@playwright/test";

import { loginAsAuthSmokeUser } from "./support/loginAsAuthSmokeUser.js";
import { getLatestTopsisSortScenarioIssue } from "./support/topsisSortScenario.js";

const generatedIssue = getLatestTopsisSortScenarioIssue();
const viewports = [
  { name: "desktop", size: { width: 1440, height: 960 } },
  { name: "mobile", size: { width: 390, height: 844 } },
];

for (const viewport of viewports) {
  test(`TOPSIS-Sort Finished Issue renders correctly on ${viewport.name}`, async ({ page }, testInfo) => {
    const diagnostics = {
      pageErrors: [],
      consoleErrors: [],
      failedRequests: [],
      failedResponses: [],
    };

    page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
    page.on("requestfailed", (request) => {
      const error = request.failure()?.errorText || "request failed";
      if (!error.includes("ERR_ABORTED")) {
        diagnostics.failedRequests.push(`${request.method()} ${request.url()}: ${error}`);
      }
    });
    page.on("response", (response) => {
      const isExpectedUnauthenticatedResponse =
        response.status() === 401 && response.url().includes("/api/auth/");
      if (response.status() >= 400 && !isExpectedUnauthenticatedResponse) {
        diagnostics.failedResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    // The shared login helper verifies the desktop tab navigation. Authenticate first,
    // then move to Finished before resizing so an unrelated Active view warning does
    // not get attributed to the sorting result.
    await page.setViewportSize({ width: 1440, height: 960 });
    await loginAsAuthSmokeUser(page);

    // Initial unauthenticated auth/me and refresh requests may return 401 by design.
    // Start transport diagnostics after login to catch failures relevant to the test flow.
    page.on("console", (message) => {
      if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
    });
    await page.getByRole("tab", { name: "Finished", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Finished issues", exact: true })).toBeVisible({
      timeout: 20_000,
    });

    if (viewport.name === "mobile") {
      await page.setViewportSize(viewport.size);
      await page.getByRole("button", { name: "open navigation menu" }).click();
      await page.getByRole("menuitem", { name: "Models", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/models$/);
      await page.getByRole("button", { name: "open navigation menu" }).click();
      await page.getByRole("menuitem", { name: "Finished", exact: true }).click();
    }

    await expect(page.getByRole("heading", { name: "Finished issues", exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByPlaceholder("Search...").fill(generatedIssue.issueName);

    const issueHeading = page.getByRole("heading", {
      name: generatedIssue.issueName,
      exact: true,
    });
    await expect(issueHeading).toBeVisible();

    const issueCard = page.locator(".MuiPaper-root").filter({ has: issueHeading });
    await expect(issueCard).toHaveCount(1);
    await expect(issueCard.getByLabel("You are the owner")).toBeVisible();
    const cardSummary = issueCard.getByRole("region", { name: "Sorting summary" });
    await expect(cardSummary).toBeVisible();
    await expect(cardSummary.getByText("3 categories", { exact: true })).toBeVisible();
    await expect(cardSummary.getByText("3 alternatives assigned", { exact: true })).toBeVisible();
    await expect(issueCard.getByText(/ranking|position|score|winner/i)).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-finished-card.png`) });

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
    await expect(categoryCards).toHaveCount(3);
    await expect(categoryCards.nth(0)).toHaveAttribute("aria-label", "High: 1 alternative");
    await expect(categoryCards.nth(0)).toContainText("High");
    await expect(categoryCards.nth(0)).toContainText("Premium option");
    await expect(categoryCards.nth(1)).toHaveAttribute("aria-label", "Medium: 1 alternative");
    await expect(categoryCards.nth(1)).toContainText("Medium");
    await expect(categoryCards.nth(1)).toContainText("Balanced option");
    await expect(categoryCards.nth(2)).toHaveAttribute("aria-label", "Low: 1 alternative");
    await expect(categoryCards.nth(2)).toContainText("Low");
    await expect(categoryCards.nth(2)).toContainText("Budget option");
    await expect(dialog.getByText(/\b(rank|ranking|position|score|winner)\b/i)).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-finished-summary.png`) });

    const issueInfoTab = dialog.getByRole("tab", { name: "Issue info", exact: true });
    await issueInfoTab.click();
    await expect(issueInfoTab).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByText("Budget option", { exact: true })).toBeVisible();

    const evaluationsTab = dialog.getByRole("tab", { name: "Evaluations", exact: true });
    await evaluationsTab.click();
    await expect(evaluationsTab).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByTestId("evaluations-workspace")).toBeVisible();
    await expect(dialog.getByTestId("evaluation-stage-panel-alternativeEvaluation")).toBeVisible();

    const modelsTab = dialog.getByRole("tab", { name: "Models", exact: true });
    await modelsTab.click();
    await expect(modelsTab).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByTestId("models-execution-gallery")).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Selected execution — Base", exact: true })).toBeVisible();
    await expect(dialog.getByText("E2E TOPSIS-Sort 2016", { exact: true })).toBeVisible();

    const analysisTab = dialog.getByRole("tab", { name: "Analysis", exact: true });
    await analysisTab.click();
    await expect(analysisTab).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByTestId("results-analysis-unavailable")).toContainText("sorting@1");
    await expect(dialog.getByRole("button", { name: "Reload analysis", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Executions", exact: true })).toBeDisabled();
    await expect(dialog.getByText(/General analysis|Final ranking|Spearman/i)).toHaveCount(0);

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
