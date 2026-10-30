import { expect, test } from "@playwright/test";
import { env } from "node:process";

import { loginAsUser } from "./support/loginAsUser.js";

const DEMO_USERS = {
  creator: {
    email: env.DEMO_CREATOR_EMAIL,
    password: env.DEMO_CREATOR_PASSWORD,
  },
  experts: ["A", "B", "C"].map((letter) => ({
    email: env[`DEMO_EXPERT_${letter}_EMAIL`],
    password: env[`DEMO_EXPERT_${letter}_PASSWORD`],
  })),
};

const SUPPLIER_ISSUE = "DEMO — Supplier Pre-qualification (Ishizaka et al., 2012)";
const GROUP_ISSUE = "DEMO — Sustainable Development (Labella et al., 2021)";
const SUPPLIER_CRITERIA = ["Experience", "Flexibility", "Security", "Resilience", "Environment"];
const SUPPLIER_PAIRWISE_VALUES = [7, 4, 7, 8, 1 / 4, 1, 3, 4, 5, 3];
const SUPPLIER_JUDGMENTS = {
  A: [9, 9, 9, 9, 9],
  B: [9, 9, 9, 9, 9],
  C: [8, 9, 9, 9, 9],
  D: [7, 9, 5, 1 / 5, 9],
  E: [5, 7, 7, 1 / 5, 5],
  F: [1, 1 / 6, 9, 9, 9],
  G: [5, 3, 1, 5, 5],
  H: [1 / 7, 9, 1, 9, 9],
  I: [1 / 4, 1 / 7, 4, 1 / 5, 1 / 5],
  J: [1 / 9, 1 / 9, 1, 1, 1],
  K: [1 / 8, 1 / 9, 1, 1 / 5, 1 / 5],
  L: [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9],
};

const SUSTAINABILITY_CRITERIA = [
  { name: "People at risk of poverty or social exclusion", direction: "Cost" },
  { name: "Obesity rate by BMI", direction: "Cost" },
  { name: "Life expectancy at birth", direction: "Benefit" },
  { name: "Young people not in employment, education, or training (NEET", direction: "Cost" },
  { name: "Gender employment gap", direction: "Cost" },
  { name: "Death rate due to homicide", direction: "Cost" },
];
const SUSTAINABILITY_ALTERNATIVES = ["Spain", "United Kingdom", "Croatia", "Norway", "Romania"];
const CATEGORY_VOTES = [
  ["Bad", "Bad", "Bad"],
  ["Moderate", "Moderate", "Good"],
  ["Bad", "Moderate", "Good"],
  ["Good", "Good", "Moderate"],
  ["Bad", "Bad", "Good"],
];

const SAATY_LABEL = (value) => {
  if (value === 1) return "1 — Neutral";
  return value < 1 ? `1/${Math.round(1 / value)}` : String(value);
};

const chooseSaaty = async (page, label, value) => {
  const select = page.getByRole("combobox", { name: label, exact: true });
  await select.click();
  await page.getByRole("option", { name: SAATY_LABEL(value), exact: true }).click();
  await expect(select).toHaveText(SAATY_LABEL(value));
};

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

const logout = async (page) => {
  const closeIssueDetails = page.getByRole("button", { name: "Close issue details", exact: true });
  if (await closeIssueDetails.count() && await closeIssueDetails.first().isVisible()) {
    await closeIssueDetails.first().click();
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('button[aria-controls="menu-user"]').click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  const dialog = page.getByRole("dialog", { name: "Log out" });
  await dialog.getByRole("button", { name: "Logout", exact: true }).click();
  await page.waitForURL("**/login");
};

const acceptInvitationAndOpenIssue = async (page, issueName) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('button[aria-controls="menu-user"]').click();
  await page.getByRole("menuitem", { name: "Notifications" }).click();
  const invitation = page.getByRole("list").filter({ hasText: issueName })
    .getByRole("listitem").filter({ hasText: issueName });
  const acceptButton = invitation.getByRole("button", { name: "Accept", exact: true });
  if (await acceptButton.count()) {
    await acceptButton.click();
    await expect(invitation.getByRole("button", { name: "Invitation accepted", exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Close notifications" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("tab", { name: "Active", exact: true }).click();
  const issueHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(issueHeading).toBeVisible();
  await issueHeading.click();
};

const addCriterion = async (page, name, direction) => {
  void direction;
  await page.getByPlaceholder("Criterion").fill(name);
  await page.getByRole("button", { name: "Add", exact: true }).click();
};

const createIssue = async (page, {
  issueName,
  alternatives,
  criteria,
  experts,
  creatorPairwiseValues = null,
  useExpertMcc = false,
  groupTiePolicy = null,
  categories,
  domainName,
  boundaryValues = [],
}) => {
  await page.getByRole("tab", { name: "Create", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Create issue", exact: true })).toBeVisible();
  await page.getByText("AHPSort I", { exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  for (const name of alternatives) {
    await page.getByPlaceholder("Alternative").fill(name);
    await page.getByRole("button", { name: "Add", exact: true }).click();
  }
  await page.getByRole("button", { name: "Next", exact: true }).click();
  for (const criterion of criteria) await addCriterion(page, criterion.name, criterion.direction);

  await page.getByRole("button", { name: /^Manual\s+Set weights now/ }).click();
  await page.getByRole("button", { name: /^AHP\s+Compute now/ }).click();
  await expect(page.getByText("Criteria comparisons", { exact: true })).toBeVisible();
  if (useExpertMcc) {
    const mccToggle = page.getByRole("button", { name: "MCC EXPERTS CONSENSUS", exact: true });
    await mccToggle.click();
    await expect(mccToggle).toHaveAttribute("aria-pressed", "true");
  } else {
    expect(creatorPairwiseValues).toHaveLength((criteria.length * (criteria.length - 1)) / 2);
    let index = 0;
    for (let row = 0; row < criteria.length; row += 1) {
      for (let column = row + 1; column < criteria.length; column += 1) {
        await chooseSaaty(page, `Compare ${criteria[row].name} with ${criteria[column].name}`, creatorPairwiseValues[index]);
        index += 1;
      }
    }
  }
  await page.getByRole("button", { name: "Next", exact: true }).click();

  for (const expert of experts) {
    const expertRow = page.getByRole("row").filter({ hasText: expert.email });
    await expect(expertRow).toBeVisible();
    await expertRow.getByRole("button", { name: "Add expert" }).click();
  }
  await expect(page.getByText(`${experts.length} selected`, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const domainSelect = page.getByRole("combobox", { name: /^Domain\b/ });
  await domainSelect.click();
  await page.getByRole("option").filter({ hasText: domainName }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByLabel("Issue name", { exact: true }).fill(issueName);
  await page.getByLabel("Description", { exact: true }).fill(`Reproducible local demo: ${issueName}.`);
  for (let index = 0; index < categories.length; index += 1) {
    await page.getByRole("button", { name: "Add category", exact: true }).click();
  }
  for (const [index, label] of categories.entries()) {
    await page.getByTestId(`ordered-category-${index + 1}`).getByRole("textbox").fill(label);
  }
  await page.getByRole("button", { name: "Limiting profiles", exact: true }).click();
  if (groupTiePolicy) {
    const tiePolicy = page.getByRole("combobox", { name: "Equal-vote preference" });
    await tiePolicy.click();
    await page.getByRole("option", { name: "More preferred category", exact: true }).click();
  }
  for (const [criterion, boundary, value] of boundaryValues) {
    await page.getByRole("textbox", { name: `${criterion} reference in ${boundary}`, exact: true }).fill(value);
  }

  await page.screenshot({ path: test.info().outputPath(`${issueName.includes("Supplier") ? "supplier" : "sustainable"}-create-desktop.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Limiting profiles", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`${issueName.includes("Supplier") ? "supplier" : "sustainable"}-create-mobile.png`), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/issues"),
  );
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const response = await responsePromise;
  const createBody = await response.json();
  expect(response.ok(), createBody.message || JSON.stringify(createBody)).toBe(true);
  const issueInfo = response.request().postDataJSON().issueInfo;
  expect(issueInfo.isConsensus).toBe(false);
  expect(issueInfo.simulateConsensus).toBe(false);
  expect(issueInfo.selectedModelId).toBeTruthy();
  expect(issueInfo.paramValues.orderedCategories.map(({ label }) => label)).toEqual(categories);
  const profileConfig = issueInfo.paramValues.ahpSortProfiles;
  expect(profileConfig.mode).toBe("limiting");
  expect(profileConfig.profiles).toHaveLength(categories.length - 1);
  expect(profileConfig.profiles.map(({ lowerCategoryId, upperCategoryId }) => [lowerCategoryId, upperCategoryId])).toEqual(
    issueInfo.paramValues.orderedCategories.slice(1).map((upper, index) => [
      issueInfo.paramValues.orderedCategories[index].categoryId,
      upper.categoryId,
    ]),
  );
  expect(issueInfo.addedExperts.sort()).toEqual(experts.map(({ email }) => email).sort());
  if (useExpertMcc) {
    expect(issueInfo.criteriaWeightingConfig.mode).toBe("expertApiModel");
    expect(issueInfo.criteriaWeightingConfig.criteriaWeightingModelKey).toBe("ahp_criteria_weights");
  }
  if (groupTiePolicy) {
    expect(issueInfo.paramValues.ahpSortGroup).toEqual({ tiePolicy: groupTiePolicy });
  }
  await expect(page.getByRole("heading", { name: issueName, exact: true })).toBeVisible();
};

const openExistingFinishedIssue = async (page, issueName) => {
  await page.getByRole("tab", { name: "Finished", exact: true }).click();
  const listResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname === "/api/issues/finished",
  );
  await page.reload();
  const listResponse = await listResponsePromise;
  expect(listResponse.ok()).toBe(true);
  const finishedIssues = (await listResponse.json()).data;
  const matchingIssue = finishedIssues.find(({ name }) => name === issueName);
  if (!matchingIssue) return null;

  const issueHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(issueHeading).toBeVisible();
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname === `/api/issues/finished/${matchingIssue.id}`,
  );
  await issueHeading.click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  return (await response.json()).data;
};

const assertNoActiveDuplicate = async (page, issueName) => {
  await page.getByRole("tab", { name: "Active", exact: true }).click();
  const listResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname === "/api/issues/active",
  );
  await page.reload();
  const listResponse = await listResponsePromise;
  expect(listResponse.ok()).toBe(true);
  const activePayload = (await listResponse.json()).data;
  const matchingIssue = activePayload?.issues?.find(({ name }) => name === issueName);
  if (!matchingIssue) return false;
  await expect(page.getByRole("heading", { name: issueName, exact: true })).toBeVisible();
  return true;
};

const selectCriterionTab = async (page, criterion) => {
  const tab = page.getByRole("tab").filter({ hasText: criterion }).first();
  await expect(tab).toBeVisible();
  await tab.click();
};

const submitEvaluation = async (page, stage) => {
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Submit evaluations?" });
  await expect(dialog).toBeVisible();
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    new URL(response.url()).pathname.endsWith(`/evaluations/${stage}/submit`),
  );
  await dialog.getByRole("button", { name: "Submit", exact: true }).click();
  const response = await responsePromise;
  const body = await response.json();
  console.log(`DEMO_SUBMIT ${stage} ${response.status()} ${JSON.stringify(body.data || body)}`);
  expect(response.ok(), body.message || JSON.stringify(body)).toBe(true);
  expect(body.data).toMatchObject({ stage, completed: true });
};

const finishAndLoad = async (page, issueName) => {
  await loginAsUser(page, DEMO_USERS.creator);
  await page.getByRole("tab", { name: "Active", exact: true }).click();
  const issueHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(issueHeading).toBeVisible();
  await issueHeading.click();
  const resolveResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && /\/evaluations\/alternativeEvaluation\/compute$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Resolve issue" });
  await dialog.getByRole("button", { name: "Resolve", exact: true }).click();
  const resolveResponse = await resolveResponsePromise;
  expect(resolveResponse.ok()).toBe(true);
  const resolveData = (await resolveResponse.json()).data;
  console.log(`DEMO_RESOLVE ${resolveResponse.status()} ${JSON.stringify({ currentStage: resolveData?.currentStage, model: resolveData?.result?.modelExecution?.apiModelKey, issueId: new URL(resolveResponse.url()).pathname.split("/")[3] })}`);
  expect(resolveData.currentStage).toBe("finished");
  expect(resolveData.result.modelExecution.apiModelKey).toBe("ahp_sort_i");

  return openExistingFinishedIssue(page, issueName);
};

const assertFinishedPayloadAndPresentation = async (page, payload, {
  issueName,
  alternatives,
  categories,
  expectedByAlternative,
  isGroup = false,
}) => {
  expect(payload.models.base.technical.apiModelKey).toBe("ahp_sort_i");
  const output = payload.phaseResults.find(({ stage }) => stage === "alternativeEvaluation").standardizedOutput;
  expect(output.categories.map(({ label }) => label)).toEqual(categories);
  expect(output.assignments).toHaveLength(alternatives.length);
  const categoryById = new Map(output.categories.map(({ categoryId, label }) => [categoryId, label]));
  const alternativeById = new Map(payload.alternatives.map(({ id, name }) => [id, name]));
  const assignments = Object.fromEntries(output.assignments.map(({ alternativeId, categoryId }) => [
    alternativeById.get(alternativeId), categoryById.get(categoryId),
  ]));
  expect(assignments).toEqual(expectedByAlternative);

  const individualEvaluations = payload.evaluations.individual.filter(({ stage }) => stage === "alternativeEvaluation");
  expect(individualEvaluations).toHaveLength(isGroup ? 3 : 1);
  expect(new Set(individualEvaluations.map(({ expertId }) => expertId)).size).toBe(isGroup ? 3 : 1);
  for (const evaluation of individualEvaluations) {
    expect(evaluation.completed).toBe(true);
    expect(evaluation.rawPayload.alternativeProfileComparisons).toHaveLength(
      alternatives.length * payload.criteria.nodes.filter(({ isLeaf }) => isLeaf).length * (categories.length - 1),
    );
  }

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("list", { name: "Final sorting by category" })).toBeVisible();
  for (const alternative of alternatives) {
    const category = expectedByAlternative[alternative];
    const categoryCount = Object.values(expectedByAlternative).filter((item) => item === category).length;
    const categoryCard = dialog.getByRole("listitem", {
      name: `${category}: ${categoryCount} ${categoryCount === 1 ? "alternative" : "alternatives"}`,
      exact: true,
    });
    await expect(categoryCard).toHaveCount(1);
    const alternativeRow = categoryCard.locator(":scope > ul > li").filter({ hasText: alternative });
    await expect(alternativeRow).toHaveCount(1);
    if (isGroup) {
      await expect(alternativeRow).toHaveAttribute("data-testid", "ahpsort-i-group-alternative");
    }
  }
  await page.screenshot({ path: test.info().outputPath(`${issueName.includes("Supplier") ? "supplier" : "sustainable"}-finished-desktop.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByRole("list", { name: "Final sorting by category" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`${issueName.includes("Supplier") ? "supplier" : "sustainable"}-finished-mobile.png`), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  const reloadedHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(reloadedHeading).toBeVisible();
  await reloadedHeading.click();
  await expect(page.getByRole("dialog").getByRole("list", { name: "Final sorting by category" })).toBeVisible();

  return { issueId: payload.issue.id, assignments, weightsByCriterion: payload.criteria.finalWeights.byCriterionId };
};

const runSupplierDemo = async (page) => {
  const diagnostics = { pageErrors: [], failedResponses: [] };
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("/api/auth/")) diagnostics.failedResponses.push(`${response.status()} ${response.url()}`);
  });
  await loginAsUser(page, DEMO_USERS.creator);
  let payload = await openExistingFinishedIssue(page, SUPPLIER_ISSUE);
  if (!payload) {
    const activeExists = await assertNoActiveDuplicate(page, SUPPLIER_ISSUE);
    const alternatives = [..."ABCDEFGHIJKL"].map((letter) => `Supplier ${letter}`);
    if (!activeExists) {
      await createIssue(page, {
        issueName: SUPPLIER_ISSUE,
        alternatives,
        criteria: SUPPLIER_CRITERIA.map((name) => ({ name, direction: "Benefit" })),
        experts: [DEMO_USERS.experts[0]],
        creatorPairwiseValues: SUPPLIER_PAIRWISE_VALUES,
        categories: ["Rejected", "Accepted"],
        domainName: "AHP Saaty Scale",
      });
    }
    await logout(page);
    await loginAsUser(page, DEMO_USERS.experts[0]);
    await acceptInvitationAndOpenIssue(page, SUPPLIER_ISSUE);
    await page.getByRole("button", { name: "Evaluate alternatives", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Limiting profiles", exact: true })).toBeVisible();
    for (const letter of "ABCDEFGHIJKL") {
      for (const [index, criterion] of SUPPLIER_CRITERIA.entries()) {
        await selectCriterionTab(page, criterion);
        await chooseSaaty(page, `Compare Supplier ${letter} with Rejected → Accepted for ${criterion}`, SUPPLIER_JUDGMENTS[letter][index]);
      }
    }
    await expect(page.getByText("All comparisons complete", { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("supplier-evaluation-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: test.info().outputPath("supplier-evaluation-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await submitEvaluation(page, "alternativeEvaluation");
    await expect(page.getByRole("heading", { name: "Limiting profiles", exact: true })).not.toBeVisible();
    await logout(page);
    payload = await finishAndLoad(page, SUPPLIER_ISSUE);
  }
  const expectedByAlternative = Object.fromEntries([..."ABCDEFGHIJKL"].map((letter) => [
    `Supplier ${letter}`, "ABCDEFG".includes(letter) ? "Accepted" : "Rejected",
  ]));
  const result = await assertFinishedPayloadAndPresentation(page, payload, {
    issueName: SUPPLIER_ISSUE,
    alternatives: Object.keys(expectedByAlternative),
    categories: ["Rejected", "Accepted"],
    expectedByAlternative,
  });
  const criterionByName = new Map(payload.criteria.nodes.map(({ name, id }) => [name, id]));
  const weights = Object.fromEntries(SUPPLIER_CRITERIA.map((name) => [name, result.weightsByCriterion[criterionByName.get(name)]]));
  expect(Object.values(weights)).toEqual(expect.arrayContaining([expect.any(Number)]));
  expect(Object.values(weights)).toHaveLength(5);
  for (const [index, expected] of [0.565, 0.081, 0.234, 0.081, 0.040].entries()) {
    expect(weights[SUPPLIER_CRITERIA[index]]).toBeCloseTo(expected, 3);
  }
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.failedResponses).toEqual([]);
  return { ...result, weights };
};

const enterExpertAHP = async (page, expert, criteria, issueName, specialPair) => {
  await loginAsUser(page, expert);
  await acceptInvitationAndOpenIssue(page, issueName);
  const evaluateWeightsButton = page.getByRole("button", { name: "Evaluate weights", exact: true });
  if (!(await evaluateWeightsButton.isEnabled())) {
    await logout(page);
    return;
  }
  await evaluateWeightsButton.click();
  await expect(page.getByRole("heading", { name: "Criteria weighting", exact: true })).toBeVisible();
  for (let row = 0; row < criteria.length; row += 1) {
    for (let column = row + 1; column < criteria.length; column += 1) {
      const value = row === specialPair?.row && column === specialPair?.column ? specialPair.value : 1;
      await chooseSaaty(page, `Compare ${criteria[row].name} with ${criteria[column].name}`, value);
    }
  }
  await expect(page.getByRole("button", { name: "Check Consistency", exact: true })).toBeEnabled();
  await submitEvaluation(page, "criteriaWeighting");
  await expect(page.getByRole("heading", { name: "Criteria weighting", exact: true })).not.toBeVisible();
  await logout(page);
};

const computeMccWeights = async (page, issueName, expectedCriteriaCount) => {
  await loginAsUser(page, DEMO_USERS.creator);
  await page.getByRole("tab", { name: "Active", exact: true }).click();
  const issueHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(issueHeading).toBeVisible();
  await issueHeading.click();
  const computeButton = page.getByRole("button", { name: "Compute weights", exact: true });
  if (!(await computeButton.isEnabled())) {
    await logout(page);
    return null;
  }
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" && /\/evaluations\/criteriaWeighting\/compute$/.test(new URL(response.url()).pathname),
  );
  await computeButton.click();
  const dialog = page.getByRole("dialog", { name: "Compute weights" });
  await dialog.getByRole("button", { name: "Compute", exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  const output = (await response.json()).data.result;
  expect(output.rawOutput.aggregation.method).toBe("mcc");
  expect(output.rawOutput.priorityMethod).toBe("principalEigenvector");
  expect(Object.keys(output.weightsByCriterion)).toHaveLength(expectedCriteriaCount);
  expect(Object.values(output.weightsByCriterion).every((weight) => weight > 0)).toBe(true);
  expect(Object.values(output.weightsByCriterion).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 7);
  await logout(page);
  return output.weightsByCriterion;
};

const runSustainableGroupDemo = async (page) => {
  const diagnostics = { pageErrors: [], failedResponses: [] };
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("/api/auth/")) diagnostics.failedResponses.push(`${response.status()} ${response.url()}`);
  });
  await loginAsUser(page, DEMO_USERS.creator);
  let payload = await openExistingFinishedIssue(page, GROUP_ISSUE);
  if (!payload) {
    const activeExists = await assertNoActiveDuplicate(page, GROUP_ISSUE);
    const pairOverrides = [
      { row: 0, column: 1, value: 3 },
      { row: 1, column: 2, value: 2 },
      { row: 2, column: 3, value: 4 },
    ];
    if (!activeExists) {
      await createIssue(page, {
        issueName: GROUP_ISSUE,
        alternatives: SUSTAINABILITY_ALTERNATIVES,
        criteria: SUSTAINABILITY_CRITERIA,
        experts: DEMO_USERS.experts,
        useExpertMcc: true,
        groupTiePolicy: "optimistic",
        categories: ["Bad", "Moderate", "Good"],
        domainName: "AHP Saaty Scale",
      });
    }
    await logout(page);

    for (const [index, expert] of DEMO_USERS.experts.entries()) {
      await enterExpertAHP(page, expert, SUSTAINABILITY_CRITERIA, GROUP_ISSUE, pairOverrides[index]);
    }
    await computeMccWeights(page, GROUP_ISSUE, SUSTAINABILITY_CRITERIA.length);

    for (let expertIndex = 0; expertIndex < DEMO_USERS.experts.length; expertIndex += 1) {
      const expert = DEMO_USERS.experts[expertIndex];
      await loginAsUser(page, expert);
      await acceptInvitationAndOpenIssue(page, GROUP_ISSUE);
      const evaluateAlternativesButton = page.getByRole("button", { name: "Evaluate alternatives", exact: true });
      if (!(await evaluateAlternativesButton.isEnabled())) {
        await logout(page);
        continue;
      }
      await evaluateAlternativesButton.click();
      await expect(page.getByRole("heading", { name: "Limiting profiles", exact: true })).toBeVisible();
      for (const [alternativeIndex, alternative] of SUSTAINABILITY_ALTERNATIVES.entries()) {
        const category = CATEGORY_VOTES[alternativeIndex][expertIndex];
        const value = category === "Bad" ? 1 / 9 : category === "Good" ? 9 : 1;
        for (const { name: criterion } of SUSTAINABILITY_CRITERIA) {
          await selectCriterionTab(page, criterion);
          for (const boundary of ["Bad → Moderate", "Moderate → Good"]) {
            await chooseSaaty(page, `Compare ${alternative} with ${boundary} for ${criterion}`, value);
          }
        }
      }
      for (const { name: criterion } of SUSTAINABILITY_CRITERIA) {
        await selectCriterionTab(page, criterion);
        await chooseSaaty(page, `Compare Bad → Moderate with Moderate → Good for ${criterion}`, 1 / 3);
      }
      await expect(page.getByText("All comparisons complete", { exact: true })).toBeVisible();
      if (expertIndex === 0) {
        await page.screenshot({ path: test.info().outputPath("sustainable-evaluation-desktop.png"), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        await expectNoHorizontalOverflow(page);
        await page.screenshot({ path: test.info().outputPath("sustainable-evaluation-mobile.png"), fullPage: true });
        await page.setViewportSize({ width: 1280, height: 900 });
      }
      await submitEvaluation(page, "alternativeEvaluation");
      await expect(page.getByRole("heading", { name: "Limiting profiles", exact: true })).not.toBeVisible();
      await logout(page);
    }
    payload = await finishAndLoad(page, GROUP_ISSUE);
  }

  const expectedByAlternative = Object.fromEntries(SUSTAINABILITY_ALTERNATIVES.map((alternative, index) => [
    alternative,
    index === 1 ? "Moderate" : index === 2 || index === 3 ? "Good" : "Bad",
  ]));
  const result = await assertFinishedPayloadAndPresentation(page, payload, {
    issueName: GROUP_ISSUE,
    alternatives: SUSTAINABILITY_ALTERNATIVES,
    categories: ["Bad", "Moderate", "Good"],
    expectedByAlternative,
    isGroup: true,
  });
  const weightingResult = payload.phaseResults.find(({ stage }) => stage === "criteriaWeighting");
  expect(weightingResult).toBeTruthy();
  expect(weightingResult.rawOutput.aggregation.method).toBe("mcc");
  expect(weightingResult.standardizedOutput.weightsByCriterion).toEqual(payload.criteria.finalWeights.byCriterionId);
  expect(payload.evaluations.individual.filter(({ stage }) => stage === "criteriaWeighting")).toHaveLength(3);
  expect(Object.keys(payload.criteria.finalWeights.byCriterionId)).toHaveLength(6);

  const groupDiagnostics = payload.phaseResults.find(({ stage }) => stage === "alternativeEvaluation").standardizedOutput.diagnostics;
  const categoryById = Object.fromEntries(payload.phaseResults.find(({ stage }) => stage === "alternativeEvaluation")
    .standardizedOutput.categories.map(({ label, categoryId }) => [label, categoryId]));
  const alternativeById = Object.fromEntries(payload.alternatives.map(({ name, id }) => [name, id]));
  const voteExpectations = {
    Spain: { status: "unanimous", selected: "Bad", counts: [3, 0, 0] },
    "United Kingdom": { status: "unique_plurality", selected: "Moderate", counts: [0, 2, 1] },
    Croatia: { status: "tied_plurality", selected: "Good", counts: [1, 1, 1] },
    Norway: { status: "unique_plurality", selected: "Good", counts: [0, 1, 2] },
    Romania: { status: "unique_plurality", selected: "Bad", counts: [2, 0, 1] },
  };
  for (const [alternative, expectation] of Object.entries(voteExpectations)) {
    const vote = groupDiagnostics.resultsByAlternativeId[alternativeById[alternative]];
    expect(vote.aggregationStatus).toBe(expectation.status);
    expect(vote.selectedCategoryId).toBe(categoryById[expectation.selected]);
    expect(vote.tiePolicy).toBe(
      expectation.status === "tied_plurality" ? "optimistic" : null,
    );
    expect(Object.values(vote.votesByCategoryId)).toEqual(expectation.counts);
    expect(Object.values(vote.classificationsByExpertId)).toHaveLength(3);
  }
  expect(groupDiagnostics.groupTiePolicy).toBe("optimistic");
  expect(groupDiagnostics.aggregationMethod).toBe("unweighted_plurality_vote");
  for (const evaluation of payload.evaluations.individual.filter(({ stage }) => stage === "alternativeEvaluation")) {
    expect(evaluation.rawPayload.alternativeProfileComparisons).toHaveLength(5 * 6 * 2);
    expect(evaluation.rawPayload.profileComparisons).toHaveLength(6);
  }

  const criterionByName = new Map(payload.criteria.nodes.map(({ name, id }) => [name, id]));
  const weights = Object.fromEntries(SUSTAINABILITY_CRITERIA.map(({ name }) => [
    name,
    result.weightsByCriterion[criterionByName.get(name)],
  ]));
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.failedResponses).toEqual([]);
  return { ...result, weights, groupVotes: voteExpectations };
};

test.describe("AHPSort I local demonstration Issues", () => {
  test.describe.configure({ mode: "serial" });

  test("reproduces supplier pre-qualification and persists the original 12 classifications", async ({ page }) => {
    test.setTimeout(600_000);
    page.setDefaultTimeout(20_000);
    const result = await runSupplierDemo(page);
    console.log(`AHPSORT_I_DEMO_RESULT ${JSON.stringify({ kind: "supplier", ...result })}`);
  });

  test("creates the three-expert sustainability demonstration with AHP, MCC and GAHPSort votes", async ({ page }) => {
    test.setTimeout(900_000);
    page.setDefaultTimeout(20_000);
    const result = await runSustainableGroupDemo(page);
    console.log(`AHPSORT_I_DEMO_RESULT ${JSON.stringify({ kind: "sustainable-group", ...result })}`);
  });
});
