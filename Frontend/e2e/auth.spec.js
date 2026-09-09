import { expect, test } from "@playwright/test";

import { authSmokeUser } from "./support/authSmokeUser.js";

test("auth smoke: a seeded user can log in and log out", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
  await page.getByLabel("Email").fill(authSmokeUser.email);
  await page.getByLabel("Password", { exact: true }).fill(authSmokeUser.password);
  await page.getByRole("button", { name: "Log in" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("tab", { name: "Active" })).toBeVisible();

  await page.getByRole("button", { name: "Open options" }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("dialog", { name: "Log out" })).toBeVisible();
  await page.getByRole("button", { name: "Logout", exact: true }).click();

  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
});
