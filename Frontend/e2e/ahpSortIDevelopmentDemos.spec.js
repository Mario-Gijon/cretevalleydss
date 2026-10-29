import { expect, test } from "@playwright/test";
import { env } from "node:process";

import { loginAsUser } from "./support/loginAsUser.js";

const OWNER = {
  email: env.AHPSORT_DEMO_OWNER_EMAIL,
  password: env.AHPSORT_DEMO_OWNER_PASSWORD,
};

const DEMOS = [
  {
    key: "supplier",
    name: "DEMO — AHPSort I — Supplier Pre-qualification (2012)",
    assignments: {
      "Supplier A": "Accepted", "Supplier B": "Accepted", "Supplier C": "Accepted",
      "Supplier D": "Accepted", "Supplier E": "Accepted", "Supplier F": "Accepted", "Supplier G": "Accepted",
      "Supplier H": "Rejected", "Supplier I": "Rejected", "Supplier J": "Rejected", "Supplier K": "Rejected", "Supplier L": "Rejected",
    },
    categories: ["Rejected", "Accepted"],
  },
  {
    key: "sustainable-development",
    name: "DEMO — GAHPSort — Sustainable Development (2021)",
    assignments: {
      Spain: "Bad",
      "United Kingdom": "Moderate",
      Croatia: "Good",
      Norway: "Good",
      Romania: "Bad",
    },
    categories: ["Bad", "Moderate", "Good"],
  },
];

const expectNoHorizontalOverflow = async (page) => {
  await page.evaluate(() => new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  }));
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
};

const openFinishedIssue = async (page, issueName) => {
  await page.getByRole("tab", { name: "Finished", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Finished issues", exact: true })).toBeVisible();

  await page.getByPlaceholder("Search...").fill(issueName);
  const heading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(heading).toBeVisible();
  await heading.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("tab", { name: "Summary", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("list", { name: "Final sorting by category" })).toBeVisible();
  return dialog;
};

test.describe("AHPSort I development demonstration Finished Issues", () => {
  test.describe.configure({ mode: "serial" });

  for (const demo of DEMOS) {
    test(`${demo.key} is visible in Finished Issues on desktop and mobile`, async ({ page }) => {
      test.skip(!OWNER.email || !OWNER.password, "Set AHPSORT_DEMO_OWNER_EMAIL/PASSWORD from the existing Scenario Lab owner account.");
      await page.setViewportSize({ width: 1440, height: 960 });
      await loginAsUser(page, OWNER);
      await expect(page.getByRole("tab", { name: "Finished", exact: true })).toBeVisible();

      const dialog = await openFinishedIssue(page, demo.name);
      for (const label of demo.categories) {
        await expect(dialog.getByRole("listitem").filter({ hasText: label }).first()).toBeVisible();
      }
      for (const [alternative, category] of Object.entries(demo.assignments)) {
        const categoryCount = Object.values(demo.assignments).filter((assigned) => assigned === category).length;
        const card = dialog.getByRole("listitem", {
          name: `${category}: ${categoryCount} ${categoryCount === 1 ? "alternative" : "alternatives"}`,
          exact: true,
        });
        const row = card.locator(":scope > ul > li").filter({ hasText: alternative });
        await expect(row).toHaveCount(1);
        await expect(row.getByText(alternative, { exact: true }).first()).toBeVisible();
      }
      await page.screenshot({ path: test.info().outputPath(`${demo.key}-finished-desktop.png`), fullPage: true });

      await page.setViewportSize({ width: 390, height: 844 });
      await expect(dialog.getByRole("list", { name: "Final sorting by category" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: test.info().outputPath(`${demo.key}-finished-mobile.png`), fullPage: true });
    });
  }
});
