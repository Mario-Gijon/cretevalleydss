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
  {
    key: "sustainable-multicriteria-v3",
    name: "DEMO — GAHPSort — Sustainable Development — Multicriteria V3",
    hasCriteriaWeighting: true,
    assignments: {
      Spain: "Bad",
      "United Kingdom": "Good",
      Croatia: "Good",
      Norway: "Moderate",
      Romania: "Moderate",
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

const expectDialogOnlyVerticalScroll = async (dialog, { requireOverflow = true } = {}) => {
  const metrics = await inspectEvaluationScroll(dialog);
  if (requireOverflow) {
    expect(metrics.outerScrollHeight).toBeGreaterThan(metrics.outerClientHeight);
  } else {
    expect(metrics.outerScrollHeight).toBeGreaterThanOrEqual(metrics.outerClientHeight);
  }
  expect(metrics.nestedVerticalScrollers, JSON.stringify(metrics.nestedVerticalScrollers)).toEqual([]);
};

const expectMatrixHorizontalScroll = async (panel, { requireInternalScroll = false } = {}) => {
  const grid = panel.locator(".MuiDataGrid-root").first();
  const scrollableMatrix = grid.locator(".MuiDataGrid-virtualScroller");
  await expect(grid).toBeVisible();
  await expect(scrollableMatrix).toBeVisible();

  const initialMetrics = await grid.evaluate((element) => {
    const outerElement = element.parentElement;
    const scroller = element.querySelector(".MuiDataGrid-virtualScroller");
    return {
      outer: {
        scrollWidth: outerElement.scrollWidth,
        clientWidth: outerElement.clientWidth,
        scrollLeft: outerElement.scrollLeft,
        overflowX: window.getComputedStyle(outerElement).overflowX,
      },
      grid: {
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        rectWidth: element.getBoundingClientRect().width,
      },
      inner: {
        scrollWidth: scroller.scrollWidth,
        clientWidth: scroller.clientWidth,
        scrollLeft: scroller.scrollLeft,
        overflowX: window.getComputedStyle(scroller).overflowX,
      },
    };
  });

  expect(initialMetrics.outer.scrollWidth, JSON.stringify(initialMetrics)).toBeLessThanOrEqual(
    initialMetrics.outer.clientWidth + 1
  );
  expect(initialMetrics.outer.overflowX, JSON.stringify(initialMetrics)).not.toMatch(/auto|scroll/);
  expect(initialMetrics.grid.rectWidth, JSON.stringify(initialMetrics)).toBeLessThanOrEqual(
    initialMetrics.outer.clientWidth + 1
  );

  if (!requireInternalScroll) return;

  expect(initialMetrics.inner.scrollWidth, JSON.stringify(initialMetrics)).toBeGreaterThan(
    initialMetrics.inner.clientWidth + 1
  );
  expect(initialMetrics.inner.overflowX, JSON.stringify(initialMetrics)).toMatch(/auto|scroll/);
  const endMetrics = await scrollableMatrix.evaluate(async (element) => {
    element.scrollLeft = element.scrollWidth;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const gridElement = element.closest(".MuiDataGrid-root");
    const columnCount = Number(gridElement.querySelector('[role="grid"]')?.getAttribute("aria-colcount"));
    const lastHeader = gridElement.querySelector(
      `.MuiDataGrid-columnHeader[aria-colindex="${columnCount}"]`
    );
    const headerBounds = lastHeader?.getBoundingClientRect();
    const scrollerBounds = element.getBoundingClientRect();
    return {
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollLeft: element.scrollLeft,
      outerScroll: {
        scrollWidth: gridElement.parentElement.scrollWidth,
        clientWidth: gridElement.parentElement.clientWidth,
        scrollLeft: gridElement.parentElement.scrollLeft,
        overflowX: window.getComputedStyle(gridElement.parentElement).overflowX,
      },
      columnCount,
      lastColumnIndex: lastHeader?.getAttribute("aria-colindex"),
      lastColumnVisible: Boolean(
        headerBounds &&
        headerBounds.left >= scrollerBounds.left - 1 &&
        headerBounds.right <= scrollerBounds.right + 1
      ),
      horizontalScrollbar: (() => {
        const scrollbar = gridElement.querySelector(".MuiDataGrid-scrollbar--horizontal");
        return scrollbar ? {
          scrollWidth: scrollbar.scrollWidth,
          clientWidth: scrollbar.clientWidth,
          clientHeight: scrollbar.clientHeight,
          scrollLeft: scrollbar.scrollLeft,
          overflowX: window.getComputedStyle(scrollbar).overflowX,
        } : null;
      })(),
    };
  });
  expect(endMetrics.scrollLeft, JSON.stringify(endMetrics)).toBeGreaterThan(0);
  expect(endMetrics.outerScroll.scrollWidth, JSON.stringify(endMetrics)).toBeLessThanOrEqual(
    endMetrics.outerScroll.clientWidth + 1
  );
  expect(endMetrics.outerScroll.scrollLeft, JSON.stringify(endMetrics)).toBe(0);
  expect(endMetrics.lastColumnIndex, JSON.stringify(endMetrics)).toBe(String(endMetrics.columnCount));
  expect(endMetrics.lastColumnVisible, JSON.stringify(endMetrics)).toBe(true);
  expect(endMetrics.horizontalScrollbar, JSON.stringify(endMetrics)).not.toBeNull();
  expect(endMetrics.horizontalScrollbar.scrollWidth, JSON.stringify(endMetrics)).toBeGreaterThan(
    endMetrics.horizontalScrollbar.clientWidth
  );
};

const verifyEvaluationScrollAcrossViewports = async (page, dialog, { requireCriteriaWeighting = false } = {}) => {
  const criteriaPanel = dialog.getByTestId("evaluation-stage-panel-criteriaWeighting");
  const alternativePanel = dialog.getByTestId("evaluation-stage-panel-alternativeEvaluation");
  if (requireCriteriaWeighting) await expect(criteriaPanel).toBeVisible();
  const hasCriteriaWeightingPanel = await criteriaPanel.isVisible().catch(() => false);
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

    if (hasCriteriaWeightingPanel) {
      await dialog.evaluate((element) => { element.scrollTop = 0; });
      await criteriaPanel.evaluate((element) => element.scrollIntoView({ block: "start" }));
      const criteriaScrollTop = await dialog.evaluate((element) => element.scrollTop);
      const criteriaGrid = criteriaPanel.locator(".MuiDataGrid-root").first();
      if (await criteriaGrid.count()) {
        const columnCount = await criteriaGrid.evaluate((element) => Number(
          element.querySelector('[role="grid"]')?.getAttribute("aria-colcount")
        ));
        await expectMatrixHorizontalScroll(criteriaPanel, {
          requireInternalScroll: viewport.width < 600 && columnCount > 2,
        });
      }
      await alternativePanel.evaluate((element) => element.scrollIntoView({ block: "start" }));
      expect(await dialog.evaluate((element) => element.scrollTop)).toBeGreaterThan(criteriaScrollTop);
    } else {
      await alternativePanel.scrollIntoViewIfNeeded();
    }
    if (viewport.width < 600) {
      await expectMatrixHorizontalScroll(alternativePanel, { requireInternalScroll: true });
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

  test("multicriteria-v3 retains criterion- and expert-specific comparisons and persisted analysis", async ({ page }) => {
    test.skip(!OWNER.email || !OWNER.password, "Set AHPSORT_DEMO_OWNER_EMAIL/PASSWORD from the existing Scenario Lab owner account.");
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 960 });
    await loginAsUser(page, OWNER);
    const dialog = await openFinishedIssue(page, "DEMO — GAHPSort — Sustainable Development — Multicriteria V3");

    const executionsTab = dialog.getByRole("tab", { name: "Executions", exact: true });
    await expect(executionsTab).toBeVisible();
    await executionsTab.click();
    await expect(dialog.getByTestId("models-execution-gallery")).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Selected execution — Base", exact: true })).toBeVisible();
    await expect(dialog.getByText("AHPSort I", { exact: true })).toBeVisible();

    await dialog.getByRole("tab", { name: "Evaluations", exact: true }).click();
    const criteriaPanel = dialog.getByTestId("evaluation-stage-panel-criteriaWeighting");
    const alternativePanel = dialog.getByTestId("evaluation-stage-panel-alternativeEvaluation");
    await expect(criteriaPanel).toBeVisible();
    await expect(alternativePanel).toBeVisible();
    const criteriaGrid = criteriaPanel.locator(".MuiDataGrid-root").first();
    await expect(criteriaGrid).toBeVisible();
    expect(await criteriaGrid.locator("[aria-label]").count()).toBeGreaterThan(0);
    expect(await criteriaGrid.innerText()).toMatch(/1\/|[2-9]/);
    const criterionTabs = alternativePanel.getByRole("tab");
    await expect(criterionTabs).toHaveCount(6);

    const expertSelector = dialog.getByLabel("Expert");
    const matrixByExpert = [];
    const readMatrixValues = async () => alternativePanel.locator(".MuiDataGrid-root").first()
      .locator("[aria-label^='Compare']")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")?.split(": ").at(-1)).sort());
    for (let expertIndex = 0; expertIndex < 3; expertIndex += 1) {
      await expertSelector.click();
      const options = page.getByRole("option");
      await expect(options).toHaveCount(3);
      await options.nth(expertIndex).click();
      await criterionTabs.nth(2).click();
      await expect(criterionTabs.nth(2)).toHaveAttribute("aria-selected", "true");
      matrixByExpert.push(await readMatrixValues());
    }
    expect(new Set(matrixByExpert.map((matrix) => matrix.join("\n"))).size).toBeGreaterThan(1);

    await criterionTabs.nth(0).click();
    const povertyMatrix = await readMatrixValues();
    await criterionTabs.nth(2).click();
    const lifeExpectancyMatrix = await readMatrixValues();
    expect(povertyMatrix).not.toEqual(lifeExpectancyMatrix);
    expect(povertyMatrix.some((value) => value.includes("1/"))).toBe(true);

    await dialog.getByRole("tab", { name: "Analysis", exact: true }).click();
    await expect(dialog.getByText("General visualizations", { exact: true })).toBeVisible();
    await dialog.getByRole("tab", { name: "Interpretation", exact: true }).click();
    await expect(dialog.getByText("General analysis", { exact: true })).toBeVisible();
    const persistedInterpretation = dialog.getByText(/The final classification places/);
    await expect(persistedInterpretation).toContainText("Croatia");
    await expect(persistedInterpretation).toContainText("United Kingdom");
    await expect(persistedInterpretation).toContainText("Good");
    await expect(persistedInterpretation).toContainText("Spain");
    await expect(persistedInterpretation).toContainText("Bad");

    for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await expectNoHorizontalOverflow(page);
      await expectDialogOnlyVerticalScroll(dialog, { requireOverflow: false });
    }
    expect(pageErrors).toEqual([]);
  });

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
