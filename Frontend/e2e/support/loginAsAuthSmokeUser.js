import { expect } from "@playwright/test";

import { authSmokeUser } from "./authSmokeUser.js";

export const loginAsAuthSmokeUser = async (page) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
  await page.getByLabel("Email").fill(authSmokeUser.email);
  await page.getByLabel("Password", { exact: true }).fill(authSmokeUser.password);
  await page.getByRole("button", { name: "Log in" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("tab", { name: "Active" })).toBeVisible();
};
