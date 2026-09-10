import { expect, test } from "@playwright/test";

import { issueExpertUser } from "./support/authSmokeUser.js";
import { loginAsAuthSmokeUser } from "./support/loginAsAuthSmokeUser.js";
import { loginAsUser } from "./support/loginAsUser.js";

test("invitation smoke: an invited expert can accept a newly created issue", async ({ page }) => {
  const issueName = `E2E Invitation ${Date.now()}`;

  await loginAsAuthSmokeUser(page);

  await page.getByRole("tab", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Create issue" })).toBeVisible();

  await page.getByText("E2E Matrix Model", { exact: true }).click();
  await expect(page.getByText("Selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByPlaceholder("Alternative").fill("E2E Invitation Alpha");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByPlaceholder("Alternative").fill("E2E Invitation Beta");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByPlaceholder("Criterion").fill("E2E Invitation Cost");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByPlaceholder("Criterion").fill("E2E Invitation Quality");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();

  const expertRow = page
    .getByRole("row")
    .filter({ hasText: issueExpertUser.email });
  await expect(expertRow).toBeVisible();
  await expertRow.getByRole("button", { name: "Add expert" }).click();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  await expect(page.getByText(issueExpertUser.email, { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Next" }).click();

  const domainSelect = page.getByRole("combobox", { name: /^Domain\b/ });
  await domainSelect.click();
  await page.getByRole("option", { name: /^E2E Numeric 0-10\b/ }).click();
  await expect(domainSelect).toContainText("E2E Numeric 0-10");
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Issue name", { exact: true }).fill(issueName);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Created for the Playwright invitation acceptance flow.");
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText(issueName, { exact: true })).toBeVisible();

  const openOptionsButton = page.getByRole("button", { name: "Open options" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(openOptionsButton).toBeVisible();
  await openOptionsButton.click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("dialog", { name: "Log out" })).toBeVisible();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();

  await loginAsUser(page, issueExpertUser);
  await page.getByRole("button", { name: "Open options" }).click();
  await page.getByRole("menuitem", { name: "Notifications" }).click();
  await expect(
    page.getByRole("heading", { name: "Notifications", exact: true })
  ).toBeVisible();

  const invitationList = page.getByRole("list").filter({ hasText: issueName });
  const invitation = invitationList.getByRole("listitem").filter({ hasText: issueName });
  await expect(invitation.getByRole("heading", { name: "Invitation", exact: true })).toBeVisible();
  await expect(invitation).toContainText(issueName);
  await invitation.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(
    invitation.getByRole("button", { name: "Invitation accepted", exact: true })
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Notifications", exact: true })
  ).not.toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  const activeTab = page.getByRole("tab", { name: "Active" });
  await expect(activeTab).toBeVisible();
  await activeTab.click();
  await expect(page.getByText(issueName, { exact: true })).toBeVisible();
});
