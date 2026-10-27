import { expect, test } from "@playwright/test";

import { issueExpertUser } from "./support/authSmokeUser.js";
import { loginAsAuthSmokeUser } from "./support/loginAsAuthSmokeUser.js";
import { loginAsUser } from "./support/loginAsUser.js";

const scenarioExpert = Object.freeze({
  email: "scenario.expert.c@example.test",
  password: "E2eScenarioExpertC123",
});
const longReliabilityCriterion = "AHP Long-Term Supplier Reliability and Service Continuity";

const logout = async (page) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Open options" }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  const dialog = page.getByRole("dialog", { name: "Log out" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Logout", exact: true }).click();
  await page.waitForURL("**/login");
};

const acceptInvitationAndOpenIssue = async (page, issueName) => {
  await page.getByRole("button", { name: "Open options" }).click();
  await page.getByRole("menuitem", { name: "Notifications" }).click();
  const notificationsHeading = page.getByRole("heading", {
    name: "Notifications",
    exact: true,
  });
  await expect(notificationsHeading).toBeVisible();
  const invitation = page
    .getByRole("list")
    .filter({ hasText: issueName })
    .getByRole("listitem")
    .filter({ hasText: issueName });
  await expect(invitation).toBeVisible();
  await invitation.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(
    invitation.getByRole("button", { name: "Invitation accepted", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Close notifications" }).click();
  await expect(notificationsHeading).not.toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("tab", { name: "Active", exact: true }).click();
  const issueHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(issueHeading).toBeVisible();
  await issueHeading.click();
  return issueHeading;
};

const selectSaatyComparison = async (page, rowCriterion, columnCriterion, value) => {
  const select = page.getByRole("combobox", {
    name: `Compare ${rowCriterion} with ${columnCriterion}`,
  });
  if (value === null) {
    await select.focus();
    await select.press("Backspace");
    return;
  }
  const optionLabel = value === 1
    ? "1 — Neutral"
    : value < 1
      ? `1/${Math.round(1 / value)}`
      : String(value);
  await select.click();
  await page.getByRole("option", {
    name: optionLabel,
    exact: true,
  }).click();
};

const submitEvaluation = async (page, { expectConsistencyWarning = false } = {}) => {
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Submit evaluations?" });
  await expect(dialog).toBeVisible();
  if (expectConsistencyWarning) {
    await expect(dialog.getByRole("alert")).toContainText(/consistency ratio/i);
    await expect(dialog.getByRole("button", { name: "Submit", exact: true })).toBeEnabled();
    await page.screenshot({ path: test.info().outputPath("ahp-submit-warning-inconsistent.png"), fullPage: true });
  } else {
    await expect(dialog.getByRole("alert")).toHaveCount(0);
  }
  await dialog.getByRole("button", { name: "Submit", exact: true }).click();
};

const clickCheckCR = async (page, requestPathSuffix) => {
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    new URL(response.url()).pathname.endsWith(requestPathSuffix),
  );
  await page.getByRole("button", { name: "Check CR", exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  return response;
};

const completeAHPEvaluation = async (page, {
  qualityCost,
  qualityReliability,
  costReliability,
  expectReview = false,
  consistencyRequests,
}) => {
  const requestsBeforeEvaluation = consistencyRequests.length;
  const evaluateWeights = page.getByRole("button", { name: "Evaluate weights" });
  await expect(evaluateWeights).toBeEnabled();
  await evaluateWeights.click();
  await expect(page.getByRole("heading", { name: "Criteria weighting", exact: true })).toBeVisible();

  const status = page.getByRole("status").filter({ hasText: /of 3 comparisons complete/ });
  await expect(status).toHaveText("0 of 3 comparisons complete");
  await selectSaatyComparison(page, "AHP Quality", "AHP Cost", qualityCost);
  await selectSaatyComparison(page, "AHP Quality", longReliabilityCriterion, qualityReliability);
  await selectSaatyComparison(page, "AHP Cost", longReliabilityCriterion, costReliability);
  await expect(status).toHaveText("3 of 3 comparisons complete");
  const diagnostic = page.getByTestId("ahp-consistency-diagnostic");
  await expect(diagnostic).toBeVisible();
  await expect(diagnostic).toContainText("Consistency has not been checked for the current comparisons.");
  await page.waitForTimeout(350);
  expect(consistencyRequests).toHaveLength(requestsBeforeEvaluation);
  await clickCheckCR(page, "/evaluations/criteriaWeighting/diagnostics");
  expect(consistencyRequests).toHaveLength(requestsBeforeEvaluation + 1);
  await expect(diagnostic).toContainText(expectReview ? "Review consistency" : "Consistent");
  await page.screenshot({ path: test.info().outputPath("ahp-criteria-matrix-evaluation-desktop.png"), fullPage: true });
  if (expectReview) {
    await selectSaatyComparison(page, "AHP Quality", "AHP Cost", 8);
    await expect(diagnostic).toContainText("Consistency has not been checked for the current comparisons.");
    await page.waitForTimeout(350);
    expect(consistencyRequests).toHaveLength(requestsBeforeEvaluation + 1);
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    const submitDialog = page.getByRole("dialog", { name: "Submit evaluations?" });
    await expect(submitDialog.getByRole("alert")).toHaveCount(0);
    await submitDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await selectSaatyComparison(page, "AHP Quality", "AHP Cost", qualityCost);
    await expect(diagnostic).toContainText("Consistency has not been checked for the current comparisons.");
    await clickCheckCR(page, "/evaluations/criteriaWeighting/diagnostics");
    expect(consistencyRequests).toHaveLength(requestsBeforeEvaluation + 2);
    await expect(diagnostic).toContainText("Review consistency");
  }
  await submitEvaluation(page, { expectConsistencyWarning: expectReview });
  await expect(page.getByRole("heading", { name: "Criteria weighting", exact: true })).not.toBeVisible();
};

const addAlternative = async (page, name) => {
  await page.getByPlaceholder("Alternative").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
};

const addCriterion = async (page, name, direction) => {
  const directionSelect = page.getByRole("combobox", { name: "Type" });
  await directionSelect.click();
  await page.getByRole("option", { name: direction, exact: true }).click();
  await page.getByPlaceholder("Criterion").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
};

test("AHP TOPSIS-Sort: real multi-expert weighting is persisted and consumed by TOPSIS-Sort", async ({ page }) => {
  test.setTimeout(300_000);
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);
  const issueName = `E2E AHP TOPSIS-Sort ${Date.now()}`;
  const diagnostics = {
    pageErrors: [],
    consoleErrors: [],
    expectedAuth401s: [],
    failedRequests: [],
    failedResponses: [],
    consistencyRequests: [],
  };
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (
      request.method() === "POST" &&
      (pathname.endsWith("/api/issues/criteria-weighting/diagnostics") ||
        pathname.endsWith("/evaluations/criteriaWeighting/diagnostics"))
    ) {
      diagnostics.consistencyRequests.push(pathname);
    }
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const sourceUrl = message.location().url;
    const text = message.text();
    if (/401/.test(text) && /\/api\/auth\/(me|refresh)(?:\?|$)/.test(sourceUrl)) {
      diagnostics.expectedAuth401s.push(`${sourceUrl}: ${text}`);
      return;
    }
    diagnostics.consoleErrors.push(`${sourceUrl}: ${text}`);
  });
  page.on("requestfailed", (request) => {
    const error = request.failure()?.errorText || "failed";
    if (!error.includes("ERR_ABORTED")) diagnostics.failedRequests.push(`${request.method()} ${request.url()}: ${error}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("/api/auth/")) diagnostics.failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await loginAsAuthSmokeUser(page);
  await page.getByRole("tab", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Create issue", exact: true })).toBeVisible();
  await page.getByText("TOPSIS-SORT", { exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await addAlternative(page, "AHP Budget Option");
  await addAlternative(page, "AHP Balanced Option");
  await addAlternative(page, "AHP Premium Option");
  await page.getByRole("button", { name: "Next" }).click();

  await addCriterion(page, "AHP Quality", "Benefit");
  await addCriterion(page, "AHP Cost", "Cost");
  await addCriterion(page, longReliabilityCriterion, "Benefit");

  const ahpMethod = page.getByRole("button", { name: /AHP/ });
  await expect(ahpMethod).toBeVisible();
  await ahpMethod.click();
  await expect(page.getByText("Criteria comparisons", { exact: true })).toBeVisible();
  await expect(page.getByText("1 indicates equal importance. Values greater than 1 favour the row criterion; fractions favour the column criterion.", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Compare AHP Quality with AHP Cost" })).toBeVisible();
  await expect(page.locator(".MuiDataGrid-root").getByRole("combobox")).toHaveCount(6);
  const creatorDiagnostic = page.getByTestId("ahp-consistency-diagnostic");
  await expect(creatorDiagnostic).toContainText("Complete all pairwise comparisons to check consistency.");
  await selectSaatyComparison(page, "AHP Quality", "AHP Cost", 2);
  await selectSaatyComparison(page, "AHP Quality", longReliabilityCriterion, 6);
  await selectSaatyComparison(page, "AHP Cost", longReliabilityCriterion, 3);
  await expect(creatorDiagnostic).toContainText("Consistency has not been checked for the current comparisons.");
  await page.waitForTimeout(350);
  expect(diagnostics.consistencyRequests).toHaveLength(0);
  await clickCheckCR(page, "/api/issues/criteria-weighting/diagnostics");
  expect(diagnostics.consistencyRequests).toHaveLength(1);
  await expect(creatorDiagnostic).toContainText("CR 0.0000");
  await expect(creatorDiagnostic).toContainText("Consistent");
  await page.screenshot({ path: test.info().outputPath("ahp-diagnostic-creator-consistent.png"), fullPage: true });
  await selectSaatyComparison(page, "AHP Quality", "AHP Cost", 9);
  await selectSaatyComparison(page, "AHP Quality", longReliabilityCriterion, 1);
  await selectSaatyComparison(page, "AHP Cost", longReliabilityCriterion, 9);
  await expect(creatorDiagnostic).toContainText("Consistency has not been checked for the current comparisons.");
  await page.waitForTimeout(350);
  expect(diagnostics.consistencyRequests).toHaveLength(1);
  await clickCheckCR(page, "/api/issues/criteria-weighting/diagnostics");
  expect(diagnostics.consistencyRequests).toHaveLength(2);
  await expect(creatorDiagnostic).toContainText("Review consistency");
  await expect(creatorDiagnostic).toContainText("Optional mathematical simulations");
  await expect(creatorDiagnostic).toContainText("nothing is changed automatically");
  await page.screenshot({ path: test.info().outputPath("ahp-diagnostic-creator-inconsistent.png"), fullPage: true });
  await expect(page.getByLabel("Neutral self-comparison")).toHaveCount(3);
  await expect(page.getByLabel("Neutral self-comparison").first()).toHaveText("1 — Neutral");
  const longCriterionCell = page.locator(".MuiDataGrid-row")
    .filter({ hasText: longReliabilityCriterion })
    .locator(".MuiDataGrid-cell[data-field='criterionLabel']");
  await expect(longCriterionCell).toHaveAttribute("title", longReliabilityCriterion);
  await page.screenshot({ path: test.info().outputPath("ahp-criteria-matrix-create-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: test.info().outputPath("ahp-criteria-matrix-create-mobile.png"), fullPage: true });
  await expect(page.getByRole("combobox", { name: "Compare AHP Quality with AHP Cost" })).toBeVisible();
  const matrixScroller = page.locator(".MuiDataGrid-root .MuiDataGrid-virtualScroller");
  const mobileScrollMetrics = await matrixScroller.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX,
  }));
  expect(mobileScrollMetrics.scrollWidth).toBeGreaterThan(mobileScrollMetrics.clientWidth);
  expect(mobileScrollMetrics.overflowX).toMatch(/auto|scroll/);
  await matrixScroller.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  expect(await matrixScroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.setViewportSize({ width: 1440, height: 960 });

  const manualWeightingMethod = page.getByRole("button", { name: /^Manual\s+Set weights now/ });
  await manualWeightingMethod.click();
  await expect(page.getByText("Criteria comparisons", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /^AHP\s+Compute now/ }).click();
  await expect(page.getByText("Criteria comparisons", { exact: true })).toBeVisible();

  const mccToggle = page.getByRole("button", { name: "MCC EXPERTS CONSENSUS" });
  await expect(mccToggle).toBeVisible();
  await mccToggle.click();
  await expect(page.getByText("Preferences will be collected from experts and aggregated before alternative evaluation.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  const expertRow = page.getByRole("row").filter({ hasText: "issue.expert@example.test" });
  await expect(expertRow).toBeVisible();
  await expertRow.getByRole("button", { name: "Add expert" }).click();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  const secondExpertRow = page.getByRole("row").filter({ hasText: "scenario.expert.c@example.test" });
  await expect(secondExpertRow).toBeVisible();
  await secondExpertRow.getByRole("button", { name: "Add expert" }).click();
  await expect(page.getByText("2 selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  const domainSelect = page.getByRole("combobox", { name: /^Domain\b/ });
  await domainSelect.click();
  await page.getByRole("option", { name: /^E2E Numeric 0-10\b/ }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Review the configuration before creating the issue.", { exact: true })).toBeVisible();
  await page.getByLabel("Issue name", { exact: true }).fill(issueName);
  await page.getByLabel("Description", { exact: true }).fill("Real AHP criteria weighting integrated with TOPSIS-Sort.");
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: "Add category" }).click();
  }
  await page.getByTestId("ordered-category-1").getByRole("textbox").fill("Low");
  await page.getByTestId("ordered-category-2").getByRole("textbox").fill("Medium");
  await page.getByTestId("ordered-category-3").getByRole("textbox").fill("High");
  const references = [
    ["AHP Quality", "Low → Medium", "4"],
    ["AHP Quality", "Medium → High", "7"],
    ["AHP Cost", "Low → Medium", "7"],
    ["AHP Cost", "Medium → High", "4"],
    [longReliabilityCriterion, "Low → Medium", "4"],
    [longReliabilityCriterion, "Medium → High", "7"],
  ];
  for (const [criterion, boundary, value] of references) {
    await page.getByRole("textbox", { name: `${criterion} reference in ${boundary}` }).fill(value);
  }
  await page.screenshot({ path: test.info().outputPath("ahp-topsis-sort-summary.png"), fullPage: true });
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.failedResponses).toEqual([]);

  const createResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/issues") && response.status() < 400,
  );
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const createResponse = await createResponsePromise;
  const createPayload = createResponse.request().postDataJSON();
  expect(createPayload.issueInfo.selectedModelId).toBeTruthy();
  expect(createPayload.issueInfo.criteriaWeightingConfig.criteriaWeightingModelKey).toBe("ahp_criteria_weights");
  expect(createPayload.issueInfo.criteriaWeightingConfig.mode).toBe("expertApiModel");
  expect(diagnostics.pageErrors).toEqual([]);
  await expect(page.getByRole("heading", { name: issueName, exact: true })).toBeVisible();

  await logout(page);
  await loginAsUser(page, issueExpertUser);
  await acceptInvitationAndOpenIssue(page, issueName);
  const evaluateWeights = page.getByRole("button", { name: "Evaluate weights" });
  await expect(evaluateWeights).toBeEnabled();
  await evaluateWeights.click();
  await expect(page.getByRole("heading", { name: "Criteria weighting", exact: true })).toBeVisible();
  const status = page.getByRole("status").filter({ hasText: /of 3 comparisons complete/ });
  await expect(status).toHaveText("0 of 3 comparisons complete");
  const firstComparison = page.getByRole("combobox", { name: "Compare AHP Quality with AHP Cost" });
  const reverseComparison = page.getByRole("combobox", { name: "Compare AHP Cost with AHP Quality" });
  await selectSaatyComparison(page, "AHP Quality", "AHP Cost", 3);
  await expect(reverseComparison).toHaveText("1/3");
  await selectSaatyComparison(page, "AHP Cost", "AHP Quality", 2);
  await expect(firstComparison).toHaveText("1/2");
  await selectSaatyComparison(page, "AHP Quality", "AHP Cost", 3);
  await expect(reverseComparison).toHaveText("1/3");
  await selectSaatyComparison(page, "AHP Quality", "AHP Cost", 4);
  await selectSaatyComparison(page, "AHP Quality", "AHP Cost", 3);
  await selectSaatyComparison(page, "AHP Quality", longReliabilityCriterion, 6);
  await selectSaatyComparison(page, "AHP Cost", longReliabilityCriterion, null);
  await expect(status).toHaveText("2 of 3 comparisons complete");
  await page.keyboard.press("Escape");
  const saveDialog = page.getByRole("dialog", { name: "Save changes?" });
  await expect(saveDialog).toBeVisible();
  await saveDialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Evaluation draft saved successfully", { exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { name: issueName, exact: true })).toBeVisible();
  await expect(evaluateWeights).toBeEnabled();
  await evaluateWeights.click();
  await expect(page.getByRole("heading", { name: "Criteria weighting", exact: true })).toBeVisible();
  await expect(status).toHaveText("2 of 3 comparisons complete");
  await expect(page.getByRole("combobox", { name: "Compare AHP Cost with AHP Quality" })).toHaveText("1/3");
  await selectSaatyComparison(page, "AHP Cost", longReliabilityCriterion, 2);
  await expect(status).toHaveText("3 of 3 comparisons complete");
  const expertDiagnostic = page.getByTestId("ahp-consistency-diagnostic");
  await expect(expertDiagnostic).toContainText("Consistency has not been checked for the current comparisons.");
  await page.waitForTimeout(350);
  expect(diagnostics.consistencyRequests).toHaveLength(2);
  await clickCheckCR(page, "/evaluations/criteriaWeighting/diagnostics");
  expect(diagnostics.consistencyRequests).toHaveLength(3);
  await expect(expertDiagnostic).toContainText("Consistent");
  await page.screenshot({ path: test.info().outputPath("ahp-diagnostic-expert-consistent.png"), fullPage: true });

  await page.keyboard.press("Escape");
  const completedDraftDialog = page.getByRole("dialog", { name: "Save changes?" });
  await expect(completedDraftDialog).toBeVisible();
  await completedDraftDialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Evaluation draft saved successfully", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: issueName, exact: true })).toBeVisible();

  await evaluateWeights.click();
  await expect(page.getByRole("heading", { name: "Criteria weighting", exact: true })).toBeVisible();
  await expect(status).toHaveText("3 of 3 comparisons complete");
  await expect(expertDiagnostic).toContainText("Consistency has not been checked for the current comparisons.");
  await page.waitForTimeout(350);
  expect(diagnostics.consistencyRequests).toHaveLength(3);
  await clickCheckCR(page, "/evaluations/criteriaWeighting/diagnostics");
  expect(diagnostics.consistencyRequests).toHaveLength(4);
  await expect(expertDiagnostic).toContainText("Consistent");

  await submitEvaluation(page);
  await expect(page.getByRole("heading", { name: issueName, exact: true })).toBeVisible();

  await logout(page);
  await loginAsUser(page, scenarioExpert);
  await acceptInvitationAndOpenIssue(page, issueName);
  await completeAHPEvaluation(page, {
    qualityCost: 9,
    qualityReliability: 1,
    costReliability: 9,
    expectReview: true,
    consistencyRequests: diagnostics.consistencyRequests,
  });

  await logout(page);
  await loginAsAuthSmokeUser(page);
  await page.getByRole("tab", { name: "Active", exact: true }).click();
  const ownerIssueHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(ownerIssueHeading).toBeVisible();
  await ownerIssueHeading.click();
  const computeWeights = page.getByRole("button", { name: "Compute weights", exact: true });
  await expect(computeWeights).toBeEnabled();
  const computeWeightsResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && /\/evaluations\/criteriaWeighting\/compute$/.test(new URL(response.url()).pathname),
  );
  await computeWeights.click();
  const computeDialog = page.getByRole("dialog", { name: "Compute weights" });
  await expect(computeDialog).toBeVisible();
  await computeDialog.getByRole("button", { name: "Compute", exact: true }).click();
  const computeWeightsResponse = await computeWeightsResponsePromise;
  expect(computeWeightsResponse.ok()).toBe(true);
  const computeBody = await computeWeightsResponse.json();
  const ahpResult = computeBody.data.result;
  expect(ahpResult.weightsByCriterion).toBeTruthy();
  expect(Object.keys(ahpResult.weightsByCriterion)).toHaveLength(3);
  expect(Object.values(ahpResult.weightsByCriterion).every((weight) => weight > 0)).toBe(true);
  expect(Object.values(ahpResult.weightsByCriterion).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 10);
  expect(ahpResult.rawOutput.priorityMethod).toBe("principalEigenvector");
  expect(ahpResult.rawOutput.aggregation.method).toBe("mcc");
  const diagnosticsByExpert = ahpResult.rawOutput.expertDiagnosticsByExpert;
  expect(diagnosticsByExpert[issueExpertUser.email].consistencyRatio).toBeCloseTo(0, 10);
  expect(diagnosticsByExpert[issueExpertUser.email].lambdaMax).toBeCloseTo(3, 10);
  expect(diagnosticsByExpert[issueExpertUser.email].consistencyStatus).toBe("consistent");
  expect(diagnosticsByExpert[scenarioExpert.email].consistencyRatio).toBeCloseTo(2.2050595997463422, 9);
  expect(diagnosticsByExpert[scenarioExpert.email].consistencyStatus).toBe("review");
  expect(diagnosticsByExpert[scenarioExpert.email].lambdaMax).toBeCloseTo(5.557869135705757, 9);
  await expect(ownerIssueHeading).toBeVisible();

  const resultWeightsById = ahpResult.weightsByCriterion;
  await logout(page);
  await loginAsUser(page, issueExpertUser);
  await page.getByRole("tab", { name: "Active", exact: true }).click();
  const expertIssueHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(expertIssueHeading).toBeVisible();
  await expertIssueHeading.click();
  await expect(page.getByRole("button", { name: "Evaluate alternatives" })).toBeEnabled();
  await page.getByRole("button", { name: "Evaluate alternatives" }).click();
  await expect(page.getByRole("heading", { name: "Alternative evaluation", exact: true })).toBeVisible();
  const expertValues = [
    ["AHP Budget Option", "AHP Quality", "2"],
    ["AHP Budget Option", "AHP Cost", "9"],
    ["AHP Budget Option", longReliabilityCriterion, "4"],
    ["AHP Balanced Option", "AHP Quality", "6"],
    ["AHP Balanced Option", "AHP Cost", "5"],
    ["AHP Balanced Option", longReliabilityCriterion, "7"],
    ["AHP Premium Option", "AHP Quality", "9"],
    ["AHP Premium Option", "AHP Cost", "2"],
    ["AHP Premium Option", longReliabilityCriterion, "9"],
  ];
  for (const [alternative, criterion, value] of expertValues) {
    await page.getByRole("group", { name: `${alternative} — ${criterion}` }).getByRole("textbox").fill(value);
  }
  await submitEvaluation(page);
  await expect(page.getByRole("heading", { name: "Alternative evaluation", exact: true })).not.toBeVisible();

  await logout(page);
  await loginAsUser(page, scenarioExpert);
  await page.getByRole("tab", { name: "Active", exact: true }).click();
  const secondExpertIssueHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(secondExpertIssueHeading).toBeVisible();
  await secondExpertIssueHeading.click();
  await expect(page.getByRole("button", { name: "Evaluate alternatives" })).toBeEnabled();
  await page.getByRole("button", { name: "Evaluate alternatives" }).click();
  await expect(page.getByRole("heading", { name: "Alternative evaluation", exact: true })).toBeVisible();
  const secondExpertValues = [
    ["AHP Budget Option", "AHP Quality", "3"],
    ["AHP Budget Option", "AHP Cost", "8"],
    ["AHP Budget Option", longReliabilityCriterion, "5"],
    ["AHP Balanced Option", "AHP Quality", "7"],
    ["AHP Balanced Option", "AHP Cost", "6"],
    ["AHP Balanced Option", longReliabilityCriterion, "6"],
    ["AHP Premium Option", "AHP Quality", "10"],
    ["AHP Premium Option", "AHP Cost", "3"],
    ["AHP Premium Option", longReliabilityCriterion, "8"],
  ];
  for (const [alternative, criterion, value] of secondExpertValues) {
    await page.getByRole("group", { name: `${alternative} — ${criterion}` }).getByRole("textbox").fill(value);
  }
  await submitEvaluation(page);
  await expect(page.getByRole("heading", { name: "Alternative evaluation", exact: true })).not.toBeVisible();

  await logout(page);
  await loginAsAuthSmokeUser(page);
  await page.getByRole("tab", { name: "Active", exact: true }).click();
  await expect(ownerIssueHeading).toBeVisible();
  await ownerIssueHeading.click();
  const resolveButton = page.getByRole("button", { name: "Resolve", exact: true });
  await expect(resolveButton).toBeEnabled();
  const resolveResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && /\/evaluations\/alternativeEvaluation\/compute$/.test(new URL(response.url()).pathname),
  );
  await resolveButton.click();
  const resolveDialog = page.getByRole("dialog", { name: "Resolve issue" });
  await expect(resolveDialog).toBeVisible();
  await resolveDialog.getByRole("button", { name: "Resolve", exact: true }).click();
  const resolveResponse = await resolveResponsePromise;
  expect(resolveResponse.ok()).toBe(true);
  const resolveBody = await resolveResponse.json();
  expect(resolveBody.data.currentStage).toBe("finished");
  expect(resolveBody.data.result.modelExecution.apiModelKey).toBe("topsis_sort_2016");

  await page.getByRole("tab", { name: "Finished", exact: true }).click();
  await expect(page.getByRole("heading", { name: issueName, exact: true })).toBeVisible();
  const finishedPayloadPromise = page.waitForResponse((response) =>
    response.request().method() === "GET" && new URL(response.url()).pathname.startsWith("/api/issues/finished/"),
  );
  await page.getByRole("heading", { name: issueName, exact: true }).click();
  const finishedResponse = await finishedPayloadPromise;
  expect(finishedResponse.ok()).toBe(true);
  const finishedBody = await finishedResponse.json();
  const finishedPayload = finishedBody.data;
  expect(finishedPayload.models.base.technical.apiModelKey).toBe("topsis_sort_2016");
  expect(finishedPayload.models.criteriaWeighting.technical.apiModelKey).toBe("ahp_criteria_weights");
  expect(finishedPayload.criteria.finalWeights.source.kind).toBe("criteriaWeightingStageResult");
  const persistedWeightsById = finishedPayload.criteria.finalWeights.byCriterionId;
  expect(Object.keys(persistedWeightsById)).toHaveLength(3);
  for (const [criterionId, weight] of Object.entries(resultWeightsById)) {
    expect(persistedWeightsById[criterionId]).toBeCloseTo(weight, 10);
  }
  const criteriaByName = new Map(finishedPayload.criteria.nodes.map((criterion) => [criterion.name, criterion]));
  const consistentWeightsById = diagnosticsByExpert[issueExpertUser.email].weightsByCriterion;
  expect(consistentWeightsById[criteriaByName.get("AHP Quality").id]).toBeCloseTo(2 / 3, 10);
  expect(consistentWeightsById[criteriaByName.get("AHP Cost").id]).toBeCloseTo(2 / 9, 10);
  expect(consistentWeightsById[criteriaByName.get(longReliabilityCriterion).id]).toBeCloseTo(1 / 9, 10);
  expect(persistedWeightsById[criteriaByName.get("AHP Quality").id]).toBeCloseTo(0.62541154, 7);
  expect(persistedWeightsById[criteriaByName.get("AHP Cost").id]).toBeCloseTo(0.25152767, 7);
  expect(persistedWeightsById[criteriaByName.get(longReliabilityCriterion).id]).toBeCloseTo(0.12306079, 7);
  const ahpPhaseResult = finishedPayload.phaseResults.find((result) => result.stage === "criteriaWeighting");
  expect(ahpPhaseResult.standardizedOutput.weightsByCriterion).toEqual(persistedWeightsById);
  expect(ahpPhaseResult.rawOutput.aggregation.method).toBe("mcc");
  expect(ahpPhaseResult.rawOutput.expertDiagnosticsByExpert[issueExpertUser.email].consistencyStatus).toBe("consistent");
  expect(ahpPhaseResult.rawOutput.expertDiagnosticsByExpert[scenarioExpert.email].consistencyStatus).toBe("review");
  const ahpEvaluations = finishedPayload.evaluations.individual.filter((evaluation) => evaluation.stage === "criteriaWeighting");
  expect(ahpEvaluations).toHaveLength(2);
  const criterionIds = new Set(finishedPayload.criteria.nodes.filter((criterion) => criterion.isLeaf).map((criterion) => criterion.id));
  for (const evaluation of ahpEvaluations) {
    expect(evaluation.rawPayload.comparisons).toHaveLength(3);
    const uniquePairs = new Set(evaluation.rawPayload.comparisons.map(({ criterionId, comparedCriterionId }) => {
      expect(criterionIds.has(criterionId)).toBe(true);
      expect(criterionIds.has(comparedCriterionId)).toBe(true);
      return [criterionId, comparedCriterionId].sort().join(":");
    }));
    expect(uniquePairs.size).toBe(3);
  }
  const alternativeContext = finishedPayload.evaluations.contexts.find((context) => context.stage === "alternativeEvaluation");
  expect(alternativeContext.decisionContext.criteriaWeights).toEqual(persistedWeightsById);
  const sortingResult = finishedPayload.phaseResults.find((result) => result.stage === "alternativeEvaluation");
  expect(sortingResult).toBeTruthy();
  expect(sortingResult.standardizedOutput.categories.map((category) => category.label)).toEqual(["Low", "Medium", "High"]);
  expect(sortingResult.standardizedOutput.assignments).toHaveLength(3);
  const sortingDiagnostics = sortingResult.standardizedOutput.diagnostics;
  for (const [alternativeId, normalizedValues] of Object.entries(sortingDiagnostics.normalized_values_by_alternative_id)) {
    for (const [criterionId, normalizedValue] of Object.entries(normalizedValues)) {
      expect(sortingDiagnostics.weighted_values_by_alternative_id[alternativeId][criterionId]).toBeCloseTo(
        normalizedValue * persistedWeightsById[criterionId],
        9,
      );
    }
  }
  const alternativeNameById = new Map(finishedPayload.alternatives.map((alternative) => [alternative.id, alternative.name]));
  const categoryLabelById = new Map(sortingResult.standardizedOutput.categories.map((category) => [category.categoryId, category.label]));
  const assignmentByAlternative = Object.fromEntries(sortingResult.standardizedOutput.assignments.map((assignment) => [
    alternativeNameById.get(assignment.alternativeId),
    categoryLabelById.get(assignment.categoryId),
  ]));
  expect(assignmentByAlternative).toEqual({
    "AHP Budget Option": "Low",
    "AHP Balanced Option": "Medium",
    "AHP Premium Option": "High",
  });
  const finishedDialog = page.getByRole("dialog");
  const summaryTab = finishedDialog.getByRole("tab", { name: "Summary", exact: true });
  await expect(summaryTab).toHaveAttribute("aria-selected", "true");
  await expect(finishedDialog.getByRole("region", { name: "Key findings" })).toBeVisible();
  await expect(finishedDialog.getByRole("list", { name: "Final sorting by category" })).toBeVisible();
  await expect(finishedDialog.getByRole("tab", { name: "Evaluations", exact: true })).toBeVisible();
  const analysisTab = finishedDialog.getByRole("tab", { name: "Analysis", exact: true });
  await analysisTab.click();
  await expect(finishedDialog.getByText("General visualizations", { exact: true })).toBeVisible();
  await expect(finishedDialog.getByText("Alternative evaluation visualizations", { exact: true })).toBeVisible();
  const interpretationTab = finishedDialog.getByRole("tab", { name: "Interpretation", exact: true });
  await interpretationTab.click();
  await expect(finishedDialog.getByText("General analysis", { exact: true })).toBeVisible();
  await expect(finishedDialog.getByRole("heading", { name: "Alternative evaluation", exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("ahp-topsis-sort-finished-interpretation.png"), fullPage: true });
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
  expect(diagnostics.failedRequests).toEqual([]);
  expect(diagnostics.failedResponses).toEqual([]);
});
