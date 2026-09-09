import { expect, test } from "@playwright/test";

import { loginAsAuthSmokeUser } from "./support/loginAsAuthSmokeUser.js";

test("auth smoke: a seeded user can log in and log out", async ({ page }) => {
  await loginAsAuthSmokeUser(page);

  await page.getByRole("button", { name: "Open options" }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("dialog", { name: "Log out" })).toBeVisible();
  await page.getByRole("button", { name: "Logout", exact: true }).click();

  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
});
