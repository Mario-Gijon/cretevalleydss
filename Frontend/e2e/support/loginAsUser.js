import { expect } from "@playwright/test";

export const loginAsUser = async (page, { email, password }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("tab", { name: "Active" })).toBeVisible();
};
