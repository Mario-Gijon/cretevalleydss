import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

import { issueExpertUser } from "./support/authSmokeUser.js";
import { loginAsAuthSmokeUser } from "./support/loginAsAuthSmokeUser.js";
import { loginAsUser } from "./support/loginAsUser.js";

const saatyLabel = (value) => {
  if (value === 1) return "1 — Neutral";
  if (value < 1) return `1/${Math.round(1 / value)}`;
  return String(value);
};

const chooseSaatyValue = async (page, accessibleName, value) => {
  const select = page.getByRole("combobox", { name: accessibleName });
  await select.click();
  await page.getByRole("option", { name: saatyLabel(value), exact: true }).click();
  await expect(select).toHaveText(saatyLabel(value));
};

const expectNoHorizontalOverflow = async (page) => {
  await page.evaluate(() => new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  }));
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.documentWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewportWidth);
};

const logout = async (page) => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: "Open options" }).click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  const dialog = page.getByRole("dialog", { name: "Log out" });
  await dialog.getByRole("button", { name: "Logout", exact: true }).click();
  await page.waitForURL("**/login");
};

const acceptInvitationAndOpenIssue = async (page, issueName) => {
  await page.getByRole("button", { name: "Open options" }).click();
  await page.getByRole("menuitem", { name: "Notifications" }).click();
  const notificationsHeading = page.getByRole("heading", { name: "Notifications", exact: true });
  await expect(notificationsHeading).toBeVisible();
  const invitation = page.getByRole("list").filter({ hasText: issueName })
    .getByRole("listitem").filter({ hasText: issueName });
  await invitation.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(invitation.getByRole("button", { name: "Invitation accepted", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close notifications" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("tab", { name: "Active", exact: true }).click();
  const issueHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(issueHeading).toBeVisible();
  await issueHeading.click();
};

const createIssue = async (page, { mode, issueName, alternatives }) => {
  await loginAsAuthSmokeUser(page);
  await page.getByRole("tab", { name: "Create", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Create issue", exact: true })).toBeVisible();
  await page.getByText("AHPSort I", { exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  for (const name of alternatives) {
    await page.getByPlaceholder("Alternative").fill(name);
    await page.getByRole("button", { name: "Add", exact: true }).click();
  }
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByPlaceholder("Criterion").fill("Quality");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const expertRow = page.getByRole("row").filter({ hasText: issueExpertUser.email });
  await expect(expertRow).toBeVisible();
  await expertRow.getByRole("button", { name: "Add expert" }).click();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  await expect(page.getByText("AHPSort I requires exactly one expert.", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const domainSelect = page.getByRole("combobox", { name: /^Domain\b/ });
  await domainSelect.click();
  await page.getByRole("option", { name: /^E2E Numeric 0-10\b/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByLabel("Issue name", { exact: true }).fill(issueName);
  await page.getByLabel("Description", { exact: true }).fill(`Real AHPSort I ${mode} profile execution.`);
  const categoryLabels = mode === "limiting" ? ["Low", "Medium", "High"] : ["Low", "High"];
  for (let index = 0; index < categoryLabels.length; index += 1) {
    await page.getByRole("button", { name: "Add category", exact: true }).click();
  }
  for (const [index, label] of categoryLabels.entries()) {
    await page.getByTestId(`ordered-category-${index + 1}`).getByRole("textbox").fill(label);
  }

  const profileModeLabel = mode === "limiting" ? "Limiting profiles" : "Central profiles";
  await page.getByRole("button", { name: profileModeLabel, exact: true }).click();
  await expect(page.getByRole("list", {
    name: mode === "limiting" ? "Limiting profiles in preference order" : "Central profiles in preference order",
  })).toBeVisible();
  if (mode === "central") {
    const tiePolicy = page.getByRole("combobox", { name: "Equal-distance preference" });
    await tiePolicy.click();
    await page.getByRole("option", { name: "Optimistic — more preferred category", exact: true }).click();
  }

  await page.screenshot({ path: test.info().outputPath(`ahpsort-i-${mode}-create-desktop.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: profileModeLabel, exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`ahpsort-i-${mode}-create-mobile.png`), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  const createResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    new URL(response.url()).pathname.endsWith("/api/issues") &&
    response.status() < 400,
  );
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const createResponse = await createResponsePromise;
  const requestBody = createResponse.request().postDataJSON();
  const createPayload = requestBody.issueInfo;
  expect(createPayload.addedExperts).toEqual([issueExpertUser.email]);
  expect(createPayload.paramValues).not.toHaveProperty("ahpSortGroup");
  expect(createPayload.isConsensus).toBe(false);
  expect(createPayload.simulateConsensus).toBe(false);
  expect(createPayload.paramValues.orderedCategories.map(({ label }) => label)).toEqual(categoryLabels);
  const categoriesByLabel = Object.fromEntries(createPayload.paramValues.orderedCategories.map((category) => [category.label, category.categoryId]));
  expect(Object.values(categoriesByLabel).every(Boolean)).toBe(true);
  const profileConfiguration = createPayload.paramValues.ahpSortProfiles;
  expect(profileConfiguration.mode).toBe(mode);
  expect(profileConfiguration.profiles.map(({ profileId }) => profileId).every(Boolean)).toBe(true);
  expect(new Set(profileConfiguration.profiles.map(({ profileId }) => profileId)).size).toBe(profileConfiguration.profiles.length);
  if (mode === "limiting") {
    expect(profileConfiguration.profiles.map(({ lowerCategoryId, upperCategoryId }) => [lowerCategoryId, upperCategoryId])).toEqual([
      [categoriesByLabel.Low, categoriesByLabel.Medium],
      [categoriesByLabel.Medium, categoriesByLabel.High],
    ]);
  } else {
    expect(profileConfiguration.tiePolicy).toBe("optimistic");
    expect(profileConfiguration.profiles.map(({ categoryId }) => categoryId)).toEqual([
      categoriesByLabel.Low,
      categoriesByLabel.High,
    ]);
  }
  await expect(page.getByRole("heading", { name: issueName, exact: true })).toBeVisible();
  await logout(page);
};

const resolveAndAssert = async (page, { mode, issueName, alternatives, expectedCategories }) => {
  await logout(page);
  await loginAsAuthSmokeUser(page);
  await page.getByRole("tab", { name: "Active", exact: true }).click();
  const issueHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(issueHeading).toBeVisible();
  await issueHeading.click();
  const resolveResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    /\/evaluations\/alternativeEvaluation\/compute$/.test(new URL(response.url()).pathname),
  );
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  const resolveDialog = page.getByRole("dialog", { name: "Resolve issue" });
  await resolveDialog.getByRole("button", { name: "Resolve", exact: true }).click();
  const resolveResponse = await resolveResponsePromise;
  expect(resolveResponse.ok()).toBe(true);
  const authorizationHeader = resolveResponse.request().headers().authorization;
  const resolveBody = await resolveResponse.json();
  expect(resolveBody.data.currentStage).toBe("finished");
  expect(resolveBody.data.result.modelExecution.apiModelKey).toBe("ahp_sort_i");

  await page.getByRole("tab", { name: "Finished", exact: true }).click();
  const finishedHeading = page.getByRole("heading", { name: issueName, exact: true });
  await expect(finishedHeading).toBeVisible();
  const finishedResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    new URL(response.url()).pathname.startsWith("/api/issues/finished/"),
  );
  await finishedHeading.click();
  const finishedResponse = await finishedResponsePromise;
  expect(finishedResponse.ok()).toBe(true);
  const payload = (await finishedResponse.json()).data;
  expect(payload.models.base.technical.apiModelKey).toBe("ahp_sort_i");
  const stageResult = payload.phaseResults.find(({ stage }) => stage === "alternativeEvaluation");
  expect(stageResult.standardizedOutput.diagnostics.profileMode).toBe(mode);
  expect(stageResult.standardizedOutput.categories.map(({ label }) => label)).toEqual(
    mode === "limiting" ? expectedCategories : ["Low", "High"],
  );
  expect(stageResult.standardizedOutput.assignments).toHaveLength(alternatives.length);
  const evaluation = payload.evaluations.individual.find(({ stage }) => stage === "alternativeEvaluation");
  expect(evaluation).toBeTruthy();
  expect(evaluation.rawPayload.alternativeProfileComparisons).toHaveLength(
    alternatives.length * 2,
  );
  expect(evaluation.rawPayload.profileComparisons).toHaveLength(1);

  const categoryById = new Map(stageResult.standardizedOutput.categories.map(({ categoryId, label }) => [categoryId, label]));
  const alternativeById = new Map(payload.alternatives.map(({ id, name }) => [id, name]));
  const assignments = Object.fromEntries(stageResult.standardizedOutput.assignments.map(({ alternativeId, categoryId }) => [
    alternativeById.get(alternativeId), categoryById.get(categoryId),
  ]));
  expect(assignments).toEqual(Object.fromEntries(alternatives.map((name, index) => [name, expectedCategories[index]])));
  if (mode === "central") {
    const { diagnostics } = stageResult.standardizedOutput;
    expect(diagnostics.tiePolicy).toBe("optimistic");
    const tiedAlternative = alternatives.find((name) => name === "Central Tie");
    const tiedAlternativeId = payload.alternatives.find(({ name }) => name === tiedAlternative).id;
    expect(diagnostics.resultsByAlternativeId[tiedAlternativeId].classification).toMatchObject({
      tieDetected: true,
      tiePolicy: "optimistic",
      tiedCenterProfileIds: expect.arrayContaining([expect.any(String)]),
    });
    expect(diagnostics.resultsByAlternativeId[tiedAlternativeId].classification.tiedCenterProfileIds).toHaveLength(2);
    for (const alternative of Object.values(diagnostics.resultsByAlternativeId)) {
      expect(Object.keys(alternative.classification.centerDistancesByProfileId)).toHaveLength(2);
      expect(alternative.classification.distanceToSelectedCenter).toEqual(expect.any(Number));
    }
  }

  const finishedDialog = page.getByRole("dialog");
  await expect(finishedDialog.getByRole("list", { name: "Final sorting by category" })).toBeVisible();
  for (const [name, category] of Object.entries(assignments)) {
    const categoryCount = Object.values(assignments).filter((assignedCategory) => assignedCategory === category).length;
    const categoryLabel = `${category}: ${categoryCount} ${categoryCount === 1 ? "alternative" : "alternatives"}`;
    await expect(finishedDialog.getByRole("listitem", { name: categoryLabel, exact: true })
      .getByText(name, { exact: true }).first()).toBeVisible();
  }
  if (mode === "central") {
    for (const [name, category] of Object.entries(assignments)) {
      const explanation = finishedDialog.getByTestId("ahp-sort-i-assignment-explanation").filter({ hasText: name });
      if (name === "Central Tie") {
        await expect(explanation).toContainText(/equally close to the Low and High centers .* tie policy selected High, the more preferred category/);
      } else {
        await expect(explanation).toContainText(`closest to the ${category} center`);
        await expect(explanation).toContainText(/distance \d+\.\d{4}/);
      }
    }
  }
  const evidenceDisclosure = finishedDialog.getByText("View AHP evidence").first();
  await expect(evidenceDisclosure).toBeVisible();
  await evidenceDisclosure.click();
  await expect(finishedDialog.getByText(/Alternative global priority:/).first()).toBeVisible();
  await expect(finishedDialog.getByText("Pairwise matrix for Quality", { exact: true }).first()).toBeVisible();
  if (mode === "central") {
    await expect(finishedDialog.getByText("Tie policy: more preferred category.", { exact: true }).first()).toBeVisible();
    await expect(finishedDialog.getByText(/distance \d+\.\d{4}/).first()).toBeVisible();
  }
  await page.screenshot({ path: test.info().outputPath(`ahpsort-i-${mode}-finished-desktop.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(finishedDialog.getByRole("list", { name: "Final sorting by category" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`ahpsort-i-${mode}-finished-mobile.png`), fullPage: true });

  if (mode === "limiting") {
    expect(authorizationHeader).toMatch(/^Bearer\s+\S+/);
    expect(payload.issue.owner.email).toBe("auth.smoke@example.test");
    const authTokenPayload = JSON.parse(Buffer.from(authorizationHeader.split(" ")[1].split(".")[1], "base64url").toString("utf8"));
    expect(authTokenPayload.uid).toBe(payload.issue.owner.id);
    const baseModelParameters = payload.models.base.configuredParameters;
    const scenarioName = "AHPSort I limiting snapshot scenario";
    const scenarioResponse = await page.context().request.post(
      `http://localhost:5001/api/issues/${payload.issue.id}/scenarios`,
      {
        headers: { Authorization: authorizationHeader },
        data: {
          scenarioName,
          scenarioDescription: "Replays the selected AHPSort I evidence with its saved profile IDs.",
          targetModelId: payload.models.base.id,
          paramOverrides: {
            ...baseModelParameters,
            weights: payload.criteria.finalWeights.byCriterionId,
          },
        },
      },
    );
    const scenarioBody = await scenarioResponse.json();
    expect(scenarioResponse.status(), scenarioBody.message || JSON.stringify(scenarioBody)).toBe(201);
    expect(scenarioBody.data.scenarioId).toBeTruthy();

    const refreshedResponse = await page.context().request.get(
      `http://localhost:5001/api/issues/finished/${payload.issue.id}`,
      { headers: { Authorization: authorizationHeader } },
    );
    expect(refreshedResponse.ok()).toBe(true);
    const refreshedPayload = (await refreshedResponse.json()).data;
    const scenario = refreshedPayload.scenarios.find(({ id }) => id === scenarioBody.data.scenarioId);
    expect(scenario).toBeTruthy();
    const scenarioPhase = scenario.phaseResults.find(({ phase }) => phase === 0);
    expect(scenarioPhase.requestSnapshot.context.structure).toEqual({
      key: "ahpSortAlternativeProfiles",
      stage: "alternativeEvaluation",
    });
    expect(scenarioPhase.requestSnapshot.modelParameters.orderedCategories)
      .toEqual(baseModelParameters.orderedCategories);
    expect(scenarioPhase.requestSnapshot.modelParameters.ahpSortProfiles)
      .toEqual(baseModelParameters.ahpSortProfiles);
    expect(scenarioPhase.requestSnapshot.modelParameters.weights)
      .toEqual(payload.criteria.finalWeights.byCriterionId);
    expect(scenarioPhase.requestSnapshot.evaluations).toHaveLength(1);
    expect(scenarioPhase.standardizedOutput.diagnostics.profileMode).toBe("limiting");
    expect(scenarioPhase.standardizedOutput.assignments).toHaveLength(alternatives.length);
    const scenarioCategoryById = new Map(scenarioPhase.standardizedOutput.categories.map(({ categoryId, label }) => [categoryId, label]));
    const scenarioAlternativeById = new Map(refreshedPayload.alternatives.map(({ id, name }) => [id, name]));
    const scenarioAssignments = Object.fromEntries(scenarioPhase.standardizedOutput.assignments.map(({ alternativeId, categoryId }) => [
      scenarioAlternativeById.get(alternativeId), scenarioCategoryById.get(categoryId),
    ]));
    expect(scenarioAssignments).toEqual(Object.fromEntries(alternatives.map((name, index) => [name, expectedCategories[index]])));

    await page.reload();
    const reloadedIssueHeading = page.getByRole("heading", { name: issueName, exact: true });
    await expect(reloadedIssueHeading).toBeVisible();
    await reloadedIssueHeading.click();
    const reloadedDialog = page.getByRole("dialog");
    await reloadedDialog.getByRole("tab", { name: "Executions", exact: true }).click();
    await reloadedDialog.getByRole("heading", { name: scenarioName, exact: true }).click();
    await expect(reloadedDialog.getByRole("heading", { name: `Selected execution — ${scenarioName}`, exact: true })).toBeVisible();
    await reloadedDialog.getByRole("tab", { name: "Summary", exact: true }).click();
    for (const [name, category] of Object.entries(assignments)) {
      const categoryCount = Object.values(assignments).filter((assignedCategory) => assignedCategory === category).length;
      const categoryLabel = `${category}: ${categoryCount} ${categoryCount === 1 ? "alternative" : "alternatives"}`;
      await expect(reloadedDialog.getByRole("listitem", { name: categoryLabel, exact: true })
        .getByText(name, { exact: true }).first()).toBeVisible();
    }
    await page.screenshot({ path: test.info().outputPath("ahpsort-i-limiting-scenario-summary.png"), fullPage: true });
  } else if (mode === "central") {
    const baseModelParameters = payload.models.base.configuredParameters;
    const scenarioName = "AHPSort I central pessimistic snapshot scenario";
    const scenarioResponse = await page.context().request.post(
      `http://localhost:5001/api/issues/${payload.issue.id}/scenarios`,
      {
        headers: { Authorization: authorizationHeader },
        data: {
          scenarioName,
          scenarioDescription: "Replays the persisted central-profile judgments with the pessimistic tie policy.",
          targetModelId: payload.models.base.id,
          paramOverrides: {
            ...baseModelParameters,
            weights: payload.criteria.finalWeights.byCriterionId,
            ahpSortProfiles: {
              ...baseModelParameters.ahpSortProfiles,
              tiePolicy: "pessimistic",
            },
          },
        },
      },
    );
    const scenarioBody = await scenarioResponse.json();
    expect(scenarioResponse.status(), scenarioBody.message || JSON.stringify(scenarioBody)).toBe(201);

    const refreshedResponse = await page.context().request.get(
      `http://localhost:5001/api/issues/finished/${payload.issue.id}`,
      { headers: { Authorization: authorizationHeader } },
    );
    expect(refreshedResponse.ok()).toBe(true);
    const refreshedPayload = (await refreshedResponse.json()).data;
    const scenario = refreshedPayload.scenarios.find(({ id }) => id === scenarioBody.data.scenarioId);
    expect(scenario).toBeTruthy();
    const scenarioPhase = scenario.phaseResults.find(({ phase }) => phase === 0);
    expect(scenarioPhase.requestSnapshot.context.structure).toEqual({
      key: "ahpSortAlternativeProfiles",
      stage: "alternativeEvaluation",
    });
    expect(scenarioPhase.requestSnapshot.modelParameters.ahpSortProfiles).toMatchObject({
      mode: "central",
      tiePolicy: "pessimistic",
      profiles: baseModelParameters.ahpSortProfiles.profiles,
    });
    expect(scenarioPhase.requestSnapshot.evaluations).toHaveLength(1);
    const scenarioDiagnostics = scenarioPhase.standardizedOutput.diagnostics;
    expect(scenarioDiagnostics.tiePolicy).toBe("pessimistic");
    const tiedAlternativeId = payload.alternatives.find(({ name }) => name === "Central Tie").id;
    const tiedClassification = scenarioDiagnostics.resultsByAlternativeId[tiedAlternativeId].classification;
    expect(tiedClassification).toMatchObject({
      tieDetected: true,
      tiePolicy: "pessimistic",
      selectedCenterProfileId: baseModelParameters.ahpSortProfiles.profiles[0].profileId,
    });
    expect(tiedClassification.tiedCenterProfileIds).toHaveLength(2);
    const scenarioCategoryById = new Map(scenarioPhase.standardizedOutput.categories.map(({ categoryId, label }) => [categoryId, label]));
    const scenarioAlternativeById = new Map(refreshedPayload.alternatives.map(({ id, name }) => [id, name]));
    const scenarioAssignments = Object.fromEntries(scenarioPhase.standardizedOutput.assignments.map(({ alternativeId, categoryId }) => [
      scenarioAlternativeById.get(alternativeId), scenarioCategoryById.get(categoryId),
    ]));
    expect(scenarioAssignments).toEqual({
      "Central Low": "Low",
      "Central High": "High",
      "Central Tie": "Low",
    });
  }
};

const runProfileMode = async ({ page, mode, suffix, alternatives, expectedCategories }) => {
  test.setTimeout(300_000);
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(30_000);
  const issueName = `E2E AHPSort I ${mode} ${Date.now()} ${suffix}`;
  const diagnostics = { pageErrors: [], failedResponses: [] };
  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("/api/auth/")) {
      diagnostics.failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await createIssue(page, { mode, issueName, alternatives });
  await loginAsUser(page, issueExpertUser);
  await acceptInvitationAndOpenIssue(page, issueName);
  await page.getByRole("button", { name: "Evaluate alternatives", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Alternative evaluation", exact: true })).toBeVisible();
  await enterEvaluationOnOpen(page, { mode, issueName, alternatives });
  await resolveAndAssert(page, { mode, issueName, alternatives, expectedCategories });
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.failedResponses).toEqual([]);
};

const enterEvaluationOnOpen = async (page, args) => {
  const { mode, alternatives } = args;
  await expect(page.getByRole("heading", { name: mode === "limiting" ? "Limiting profiles" : "Central profiles", exact: true })).toBeVisible();
  if (mode === "limiting") {
    const firstName = `Compare ${alternatives[0]} with Low → Medium for Quality`;
    await chooseSaatyValue(page, firstName, 1 / 3);
    await page.keyboard.press("Escape");
    const saveDialog = page.getByRole("dialog", { name: "Save changes?" });
    await expect(saveDialog).toBeVisible();
    await saveDialog.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByText("Evaluation draft saved successfully", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Evaluate alternatives", exact: true }).click();
    await expect(page.getByRole("combobox", { name: firstName })).toHaveText("1/3");
    await expect(page.getByRole("button", { name: "Submit", exact: true })).toBeDisabled();
    await page.screenshot({ path: test.info().outputPath("ahpsort-i-limiting-draft-recovered.png"), fullPage: true });
    const comparisons = [
      [alternatives[0], "Low → Medium", 1 / 3],
      [alternatives[0], "Medium → High", 1 / 9],
      [alternatives[1], "Low → Medium", 2],
      [alternatives[1], "Medium → High", 1 / 2],
      [alternatives[2], "Low → Medium", 9],
      [alternatives[2], "Medium → High", 3],
    ];
    for (const [alternative, profile, value] of comparisons.slice(1)) {
      await chooseSaatyValue(page, `Compare ${alternative} with ${profile} for Quality`, value);
    }
    await chooseSaatyValue(page, "Compare Low → Medium with Medium → High for Quality", 1 / 3);
  } else {
    await chooseSaatyValue(page, "Compare Low center with High center for Quality", 3);
    const rows = [
      [alternatives[0], [["Low center", 2], ["High center", 1 / 9]]],
      [alternatives[1], [["Low center", 4], ["High center", 1 / 3]]],
      [alternatives[2], [["Low center", 9], ["High center", 1 / 8]]],
    ];
    for (const [alternative, judgments] of rows) {
      for (const [profile, value] of judgments) {
        await chooseSaatyValue(page, `Compare ${alternative} with ${profile} for Quality`, value);
      }
    }
  }

  await expect(page.getByText("All comparisons complete", { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath(`ahpsort-i-${mode}-evaluation-desktop.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("combobox", { name: `Compare ${alternatives[0]} with ${mode === "limiting" ? "Low → Medium" : "Low center"} for Quality`, exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`ahpsort-i-${mode}-evaluation-mobile.png`), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  const submitDialog = page.getByRole("dialog", { name: "Submit evaluations?" });
  await expect(submitDialog).toBeVisible();
  await submitDialog.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Alternative evaluation", exact: true })).not.toBeVisible();
};

test("AHPSort I limiting profiles: draft, execution and persisted classification", async ({ page }) => {
  await runProfileMode({
    page,
    mode: "limiting",
    suffix: "boundary",
    alternatives: ["Limiting Low", "Limiting Medium", "Limiting High"],
    expectedCategories: ["Low", "Medium", "High"],
  });
});

test("AHPSort I central profiles: draft-free execution and persisted classification", async ({ page }) => {
  await runProfileMode({
    page,
    mode: "central",
    suffix: "centers",
    alternatives: ["Central Low", "Central High", "Central Tie"],
    expectedCategories: ["Low", "High", "High"],
  });
});
