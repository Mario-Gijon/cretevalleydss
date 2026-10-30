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
    name: "DEMO — AHPSort I — Supplier Pre-qualification (2012) — AHP Saaty Scale",
    assignments: {
      "Supplier A": "Accepted", "Supplier B": "Accepted", "Supplier C": "Accepted",
      "Supplier D": "Accepted", "Supplier E": "Accepted", "Supplier F": "Accepted", "Supplier G": "Accepted",
      "Supplier H": "Rejected", "Supplier I": "Rejected", "Supplier J": "Rejected", "Supplier K": "Rejected", "Supplier L": "Rejected",
    },
    categories: ["Rejected", "Accepted"],
  },
  {
    key: "sustainable-development",
    name: "DEMO — GAHPSort — Sustainable Development (2021) — AHP Saaty Scale",
    hasCriteriaWeighting: true,
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

const inspectEvaluationScroll = async (dialog) => dialog.evaluate((dialogElement) => {
  const dialogPaper = dialogElement.closest(".MuiDialog-paper") || dialogElement;
  const nestedVerticalScrollers = [...dialogPaper.querySelectorAll("*")]
    .filter((element) => element.getClientRects().length > 0)
    .filter((element) => {
      const { overflowY } = window.getComputedStyle(element);
      return ["auto", "scroll"].includes(overflowY)
        && element.scrollHeight > element.clientHeight + 2;
    })
    .map((element) => ({
      testId: element.getAttribute("data-testid"),
      className: element.className?.toString?.().slice(0, 100),
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));

  return {
    outerScrollHeight: dialogPaper.scrollHeight,
    outerClientHeight: dialogPaper.clientHeight,
    nestedVerticalScrollers,
  };
});

const selectDifferentExpertWhenAvailable = async (page, dialog) => {
  const expertSelect = dialog.getByLabel("Expert");
  if (await expertSelect.count() === 0) return;
  await expertSelect.click();
  const expertOptions = page.getByRole("option");
  if (await expertOptions.count() > 1) {
    await expertOptions.nth(1).click();
  } else {
    await page.keyboard.press("Escape");
  }
};

const expandExpressionDomainCriteria = async (dialog) => {
  const domainToggles = dialog.getByRole("button", { name: /^Used by \d+ criteria$/ });
  for (const toggle of await domainToggles.all()) {
    if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
  }
};

const expectDialogOnlyVerticalScroll = async (dialog) => {
  const metrics = await inspectEvaluationScroll(dialog);
  expect(metrics.outerScrollHeight).toBeGreaterThan(metrics.outerClientHeight);
  expect(metrics.nestedVerticalScrollers, JSON.stringify(metrics.nestedVerticalScrollers)).toEqual([]);
};

const expectMatrixHorizontalScroll = async (panel) => {
  const scrollableMatrix = panel.locator(".MuiDataGrid-virtualScroller").first();
  await expect(scrollableMatrix).toBeVisible();
  const horizontalMetrics = await scrollableMatrix.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    overflowX: window.getComputedStyle(element).overflowX,
  }));
  expect(horizontalMetrics.overflowX).toMatch(/auto|scroll/);
  expect(horizontalMetrics.scrollWidth).toBeGreaterThan(horizontalMetrics.clientWidth);
  await scrollableMatrix.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  expect(await scrollableMatrix.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
};

const verifyEvaluationScrollAcrossViewports = async (page, dialog, { requireCriteriaWeighting = false } = {}) => {
  const criteriaPanel = dialog.getByTestId("evaluation-stage-panel-criteriaWeighting");
  const alternativePanel = dialog.getByTestId("evaluation-stage-panel-alternativeEvaluation");
  if (requireCriteriaWeighting) await expect(criteriaPanel).toBeVisible();
  await expect(alternativePanel).toBeVisible();
  await selectDifferentExpertWhenAvailable(page, dialog);

  const collectiveToggle = dialog.getByRole("button", { name: "Show collective values" });
  if (await collectiveToggle.count()) await collectiveToggle.click();

  const criterionTabs = alternativePanel.getByRole("tab");
  if (await criterionTabs.count() > 1) {
    const nextCriterion = criterionTabs.nth(1);
    await nextCriterion.click();
    await expect(nextCriterion).toHaveAttribute("aria-selected", "true");
  }

  await expandExpressionDomainCriteria(dialog);
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
    await expectDialogOnlyVerticalScroll(dialog);

    if (requireCriteriaWeighting) {
      await dialog.evaluate((element) => { element.scrollTop = 0; });
      await criteriaPanel.evaluate((element) => element.scrollIntoView({ block: "start" }));
      const criteriaScrollTop = await dialog.evaluate((element) => element.scrollTop);
      await alternativePanel.evaluate((element) => element.scrollIntoView({ block: "start" }));
      expect(await dialog.evaluate((element) => element.scrollTop)).toBeGreaterThan(criteriaScrollTop);
    } else {
      await alternativePanel.scrollIntoViewIfNeeded();
    }
    if (viewport.width < 600) {
      if (requireCriteriaWeighting) await expectMatrixHorizontalScroll(criteriaPanel);
      await expectMatrixHorizontalScroll(alternativePanel);
    }

    await dialog.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const atEnd = await dialog.evaluate((element) => ({
      scrollTop: element.scrollTop,
      maxScrollTop: element.scrollHeight - element.clientHeight,
    }));
    expect(atEnd.scrollTop).toBeGreaterThan(0);
    expect(atEnd.scrollTop).toBeGreaterThanOrEqual(atEnd.maxScrollTop - 1);
    await expectDialogOnlyVerticalScroll(dialog);
  }
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

    test(`${demo.key} evaluations use one vertical scroll and retain matrix navigation`, async ({ page }) => {
      test.skip(!OWNER.email || !OWNER.password, "Set AHPSORT_DEMO_OWNER_EMAIL/PASSWORD from the existing Scenario Lab owner account.");
      await page.setViewportSize({ width: 1440, height: 960 });
      await loginAsUser(page, OWNER);
      const dialog = await openFinishedIssue(page, demo.name);
      await dialog.getByRole("tab", { name: "Evaluations", exact: true }).click();
      await verifyEvaluationScrollAcrossViewports(page, dialog, {
        requireCriteriaWeighting: demo.hasCriteriaWeighting === true,
      });
    });
  }

  test("TOPSIS-Sort keeps its shared evaluation renderer within the dialog scroll", async ({ page }) => {
    test.skip(!OWNER.email || !OWNER.password, "Set AHPSORT_DEMO_OWNER_EMAIL/PASSWORD from the existing Scenario Lab owner account.");
    await page.setViewportSize({ width: 1440, height: 960 });
    await loginAsUser(page, OWNER);
    await page.getByRole("tab", { name: "Finished", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Finished issues", exact: true })).toBeVisible();
    await page.getByPlaceholder("Search...").fill("TOPSIS-Sort 2016 — Tehran reproduction");
    const issueHeading = page.getByRole("heading", { name: /TOPSIS-Sort 2016 — Tehran reproduction/ });
    await expect(issueHeading).toBeVisible();
    await issueHeading.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("tab", { name: "Summary", exact: true })).toHaveAttribute("aria-selected", "true");
    await dialog.getByRole("tab", { name: "Evaluations", exact: true }).click();
    await verifyEvaluationScrollAcrossViewports(page, dialog);
  });
});
