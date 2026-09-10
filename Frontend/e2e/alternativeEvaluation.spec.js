import { expect, test } from "@playwright/test";

import { issueExpertUser } from "./support/authSmokeUser.js";
import { loginAsAuthSmokeUser } from "./support/loginAsAuthSmokeUser.js";
import { loginAsUser } from "./support/loginAsUser.js";

test("alternative evaluation smoke: an invited expert can submit a matrix evaluation", async ({ page }) => {
  const issueName = `E2E Alternative Evaluation ${Date.now()}`;

  await loginAsAuthSmokeUser(page);
  await page.getByRole("tab", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Create issue" })).toBeVisible();

  await page.getByText("E2E Matrix Model", { exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByPlaceholder("Alternative").fill("E2E Alt Alpha");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByPlaceholder("Alternative").fill("E2E Alt Beta");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByPlaceholder("Criterion").fill("E2E Alt Cost");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByPlaceholder("Criterion").fill("E2E Alt Quality");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();

  const expertRow = page
    .getByRole("row")
    .filter({ hasText: issueExpertUser.email });
  await expect(expertRow).toBeVisible();
  await expertRow.getByRole("button", { name: "Add expert" }).click();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  const domainSelect = page.getByRole("combobox", { name: /^Domain\b/ });
  await domainSelect.click();
  await page.getByRole("option", { name: /^E2E Numeric 0-10\b/ }).click();
  await expect(domainSelect).toContainText("E2E Numeric 0-10");
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Issue name", { exact: true }).fill(issueName);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Created for the Playwright alternative-evaluation flow.");
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

  const evaluateAlternatives = page.getByRole("button", {
    name: "Evaluate alternatives",
  });
  await expect(evaluateAlternatives).toBeEnabled();
  await evaluateAlternatives.click();
  await expect(
    page.getByRole("heading", { name: "Alternative evaluation", exact: true })
  ).toBeVisible();

  await page
    .getByRole("group", { name: "E2E Alt Alpha — E2E Alt Cost" })
    .getByRole("spinbutton")
    .fill("3");
  await page
    .getByRole("group", { name: "E2E Alt Alpha — E2E Alt Quality" })
    .getByRole("spinbutton")
    .fill("8");
  await page
    .getByRole("group", { name: "E2E Alt Beta — E2E Alt Cost" })
    .getByRole("spinbutton")
    .fill("7");
  await page
    .getByRole("group", { name: "E2E Alt Beta — E2E Alt Quality" })
    .getByRole("spinbutton")
    .fill("6");

  await page.getByRole("button", { name: "Submit", exact: true }).click();
  const submitDialog = page.getByRole("dialog", { name: "Submit evaluations?" });
  await expect(submitDialog).toBeVisible();
  await submitDialog.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Alternative evaluation", exact: true })
  ).not.toBeVisible();

  await expect(issueHeading).toBeVisible();
  await issueHeading.click();
  await expect(
    page.getByRole("button", { name: "Evaluate alternatives" })
  ).toBeDisabled();
});
