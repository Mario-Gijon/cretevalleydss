import { expect, test } from "@playwright/test";

import { loginAsAuthSmokeUser } from "./support/loginAsAuthSmokeUser.js";

test("create issue smoke: a seeded owner can create a minimal active issue", async ({ page }) => {
  const issueName = `E2E Create Issue ${Date.now()}`;

  await loginAsAuthSmokeUser(page);

  await page.getByRole("tab", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Create issue" })).toBeVisible();

  await page.getByText("E2E Matrix Model", { exact: true }).click();
  await expect(page.getByText("Selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByPlaceholder("Alternative").fill("E2E Alternative Alpha");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByPlaceholder("Alternative").fill("E2E Alternative Beta");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("E2E Alternative Alpha", { exact: true })).toBeVisible();
  await expect(page.getByText("E2E Alternative Beta", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByPlaceholder("Criterion").fill("E2E Criterion Cost");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("E2E Criterion Cost", { exact: true })).toBeVisible();
  await page.getByPlaceholder("Criterion").fill("E2E Criterion Quality");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("E2E Criterion Quality", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  const expertRow = page
    .getByRole("row")
    .filter({ hasText: "issue.expert@example.test" });
  await expect(expertRow).toBeVisible();
  await expertRow.getByRole("button", { name: "Add expert" }).click();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  await expect(page.getByText("issue.expert@example.test", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Domain").click();
  await page.getByRole("option", { name: /^E2E Numeric 0-10\b/ }).click();
  await expect(page.getByLabel("Domain")).toContainText("E2E Numeric 0-10");
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Issue name", { exact: true }).fill(issueName);
  await page.getByLabel("Description", { exact: true }).fill("Created by the isolated Playwright smoke flow.");
  await expect(page.getByText("E2E Matrix Model", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Alternatives 2", exact: true }).click();
  await expect(page.getByText("E2E Alternative Alpha", { exact: true })).toBeVisible();
  await expect(page.getByText("E2E Alternative Beta", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Criteria 2", exact: true }).click();
  await expect(page.getByText("E2E Criterion Cost", { exact: true })).toBeVisible();
  await expect(page.getByText("E2E Criterion Quality", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Experts 1", exact: true }).click();
  await expect(page.getByText("issue.expert@example.test", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText(issueName, { exact: true })).toBeVisible();
});
