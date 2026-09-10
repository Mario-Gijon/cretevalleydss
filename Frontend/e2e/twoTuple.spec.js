import { expect, test } from "@playwright/test";

import { issueExpertUser } from "./support/authSmokeUser.js";
import { loginAsAuthSmokeUser } from "./support/loginAsAuthSmokeUser.js";
import { loginAsUser } from "./support/loginAsUser.js";

test("2-tuple smoke: an owner resolves a linguistically evaluated issue", async ({ page }) => {
  const issueName = `E2E 2-Tuple ${Date.now()}`;

  await loginAsAuthSmokeUser(page);
  await page.getByRole("tab", { name: "Create" }).click();
  await expect(
    page.getByRole("heading", { name: "Create issue", exact: true })
  ).toBeVisible();

  await page.getByText("E2E 2-Tuple Linguistic Model", { exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByPlaceholder("Alternative").fill("E2E 2-Tuple Alpha");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByPlaceholder("Alternative").fill("E2E 2-Tuple Beta");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByPlaceholder("Criterion").fill("Quality");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByPlaceholder("Criterion").fill("Reliability");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  const expertManualToggle = page.getByRole("button", {
    name: "MCC EXPERTS CONSENSUS",
  });
  await expect(expertManualToggle).toHaveAttribute("aria-pressed", "false");
  await expertManualToggle.click();
  await expect(expertManualToggle).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next" }).click();

  const expertRow = page
    .getByRole("row")
    .filter({ hasText: issueExpertUser.email });
  await expect(expertRow).toBeVisible();
  await expertRow.getByRole("button", { name: "Add expert" }).click();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Equal weights" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await page.getByRole("button", { name: "Next" }).click();

  const domainSelect = page.getByRole("combobox", { name: /^Domain\b/ });
  await domainSelect.click();
  await page
    .getByRole("option", { name: /^E2E Linguistic 2-Tuple 5\b/ })
    .click();
  await expect(domainSelect).toContainText("E2E Linguistic 2-Tuple 5");
  await page.getByRole("button", { name: "Next" }).click();

  const expertAggregation = page.getByRole("combobox", {
    name: "Expert aggregation method",
  });
  const criteriaAggregation = page.getByRole("combobox", {
    name: "Criteria aggregation method",
  });
  await expect(expertAggregation).toContainText("2-Tuple Arithmetic Mean");
  await expect(criteriaAggregation).toContainText("2-Tuple Weighted Average");

  await page.getByLabel("Issue name", { exact: true }).fill(issueName);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Created for the Playwright 2-tuple linguistic flow.");
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL("**/dashboard");
  await expect(
    page.getByRole("heading", { name: issueName, exact: true })
  ).toBeVisible();

  const openOptionsButton = page.getByRole("button", { name: "Open options" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(openOptionsButton).toBeVisible();
  await openOptionsButton.click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("dialog", { name: "Log out" })).toBeVisible();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await page.waitForURL("**/login");

  await loginAsUser(page, issueExpertUser);
  await page.getByRole("button", { name: "Open options" }).click();
  await page.getByRole("menuitem", { name: "Notifications" }).click();
  const notificationsHeading = page.getByRole("heading", {
    name: "Notifications",
    exact: true,
  });
  await expect(notificationsHeading).toBeVisible();
  const invitationList = page.getByRole("list").filter({ hasText: issueName });
  const invitation = invitationList.getByRole("listitem").filter({ hasText: issueName });
  await invitation.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(
    invitation.getByRole("button", { name: "Invitation accepted", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Close notifications" }).click();
  await expect(notificationsHeading).not.toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 0));
  const activeTab = page.getByRole("tab", { name: "Active" });
  await expect(activeTab).toBeVisible();
  await activeTab.click();
  const issueHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(issueHeading).toBeVisible();
  await issueHeading.click();

  const evaluateWeights = page.getByRole("button", { name: "Evaluate weights" });
  await expect(evaluateWeights).toBeEnabled();
  await evaluateWeights.click();
  await expect(
    page.getByRole("heading", { name: "Criteria weighting", exact: true })
  ).toBeVisible();
  await page
    .getByText("Quality", { exact: true })
    .locator("..")
    .getByRole("spinbutton")
    .fill("0.5");
  await page
    .getByText("Reliability", { exact: true })
    .locator("..")
    .getByRole("spinbutton")
    .fill("0.5");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  const submitDialog = page.getByRole("dialog", { name: "Submit evaluations?" });
  await expect(submitDialog).toBeVisible();
  await submitDialog.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Criteria weighting", exact: true })
  ).not.toBeVisible();

  await expect(issueHeading).toBeVisible();
  await issueHeading.click();
  await expect(evaluateWeights).toBeDisabled();

  const evaluateAlternatives = page.getByRole("button", {
    name: "Evaluate alternatives",
  });
  await expect(evaluateAlternatives).toBeEnabled();
  await evaluateAlternatives.click();
  await expect(
    page.getByRole("heading", { name: "Alternative evaluation", exact: true })
  ).toBeVisible();

  const selectLinguisticValue = async ({ alternative, criterion, label }) => {
    const cell = page.getByRole("group", { name: `${alternative} — ${criterion}` });
    const input = cell.getByRole("combobox");
    await input.click();
    await page.getByRole("option", { name: label, exact: true }).click();
    await expect(input).toContainText(label);
  };

  await selectLinguisticValue({
    alternative: "E2E 2-Tuple Alpha",
    criterion: "Quality",
    label: "High",
  });
  await selectLinguisticValue({
    alternative: "E2E 2-Tuple Alpha",
    criterion: "Reliability",
    label: "Very High",
  });
  await selectLinguisticValue({
    alternative: "E2E 2-Tuple Beta",
    criterion: "Quality",
    label: "Low",
  });
  await selectLinguisticValue({
    alternative: "E2E 2-Tuple Beta",
    criterion: "Reliability",
    label: "Medium",
  });

  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(submitDialog).toBeVisible();
  await submitDialog.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Alternative evaluation", exact: true })
  ).not.toBeVisible();

  await expect(issueHeading).toBeVisible();
  await issueHeading.click();
  await expect(evaluateAlternatives).toBeDisabled();

  const closeIssueDetailsButton = page.getByRole("button", {
    name: "Close issue details",
    exact: true,
  });
  await closeIssueDetailsButton.click();
  await expect(closeIssueDetailsButton).not.toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(openOptionsButton).toBeVisible();
  await openOptionsButton.click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("dialog", { name: "Log out" })).toBeVisible();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await page.waitForURL("**/login");

  await loginAsAuthSmokeUser(page);
  await expect(activeTab).toBeVisible();
  await activeTab.click();
  await expect(issueHeading).toBeVisible();
  await issueHeading.click();

  const resolveButton = page.getByRole("button", { name: "Resolve", exact: true });
  await expect(resolveButton).toBeEnabled();
  await resolveButton.click();
  const resolveDialog = page.getByRole("dialog", { name: "Resolve issue" });
  await expect(resolveDialog).toBeVisible();
  await resolveDialog.getByRole("button", { name: "Resolve", exact: true }).click();

  await page.evaluate(() => window.scrollTo(0, 0));
  const finishedTab = page.getByRole("tab", { name: "Finished" });
  await expect(finishedTab).toBeVisible();
  await finishedTab.click();
  await expect(
    page.getByRole("heading", { name: issueName, exact: true })
  ).toBeVisible();

  const finishedIssueDialog = page.getByRole("dialog");
  const finishedIssueHeading = finishedIssueDialog.getByRole("heading", {
    name: issueName,
    exact: true,
    level: 1,
  });
  await page.getByRole("heading", { name: issueName, exact: true }).click();
  await expect(finishedIssueDialog).toBeVisible();
  await expect(finishedIssueHeading).toBeVisible();
  await expect(
    finishedIssueDialog.getByText("Unable to load this Finished Issue.", { exact: true })
  ).toHaveCount(0);

  await finishedIssueDialog
    .getByRole("tab", { name: "Results analysis", exact: true })
    .click();
  await expect(
    finishedIssueDialog.getByRole("heading", { name: "Final ranking", exact: true })
  ).toBeVisible();
  await expect(
    finishedIssueDialog.getByTitle("E2E 2-Tuple Alpha", { exact: true })
  ).toBeVisible();
  await expect(
    finishedIssueDialog.getByTitle("E2E 2-Tuple Beta", { exact: true })
  ).toBeVisible();
  await expect(
    finishedIssueDialog.getByText("2 alternatives", { exact: true })
  ).toBeVisible();
  await expect(
    finishedIssueDialog.getByText("Between High and Very High", { exact: true })
  ).toBeVisible();
  await expect(
    finishedIssueDialog.getByText("Between Low and Medium", { exact: true })
  ).toBeVisible();

  await finishedIssueDialog
    .getByRole("tab", { name: "Interpretation", exact: true })
    .click();
  await expect(
    finishedIssueDialog.getByText(
      /E2E 2-Tuple Alpha.*finished first in the recorded execution\./
    )
  ).toBeVisible();

  await finishedIssueDialog
    .getByRole("button", { name: "Close Finished Issue", exact: true })
    .click();
  await expect(finishedIssueHeading).not.toBeVisible();
});
