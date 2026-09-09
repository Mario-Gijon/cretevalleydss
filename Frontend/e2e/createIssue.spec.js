import { expect, test } from "@playwright/test";

import { loginAsAuthSmokeUser } from "./support/loginAsAuthSmokeUser.js";

test("create issue smoke: a seeded owner can create a minimal active issue", async ({ page }) => {
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
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByText("issue.expert@example.test", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add expert" }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Domain").click();
  await page.getByRole("option", { name: "E2E Numeric 0-10", exact: true }).click();
  await expect(page.getByLabel("Domain")).toHaveText("E2E Numeric 0-10");
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Issue name", { exact: true }).fill("E2E Create Issue Smoke");
  await page.getByLabel("Description", { exact: true }).fill("Created by the isolated Playwright smoke flow.");
  await expect(page.getByText("E2E Matrix Model", { exact: true })).toBeVisible();

  await page.getByText("Alternatives", { exact: true }).click();
  await expect(page.getByText("E2E Alternative Alpha", { exact: true })).toBeVisible();

  await page.getByText("Criteria", { exact: true }).click();
  await expect(page.getByText("E2E Criterion Cost", { exact: true })).toBeVisible();

  await page.getByText("Experts", { exact: true }).click();
  await expect(page.getByText("issue.expert@example.test", { exact: true })).toBeVisible();

  await page.getByText("Expression domain", { exact: true }).click();
  await expect(page.getByText("E2E Numeric 0-10", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("E2E Create Issue Smoke", { exact: true })).toBeVisible();
});
