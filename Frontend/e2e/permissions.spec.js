import { expect, test } from "@playwright/test";

import {
  authSmokeUser,
  issueExpertUser,
  securityOutsiderUser,
} from "./support/authSmokeUser.js";
import { loginAsAuthSmokeUser } from "./support/loginAsAuthSmokeUser.js";
import { loginAsUser } from "./support/loginAsUser.js";

const API_BASE_URL = "http://localhost:5001/api";

const authenticateApiUser = async (request, user) => {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: user,
  });
  await expect(response).toBeOK();

  const body = await response.json();
  expect(body.success).toBe(true);
  expect(typeof body?.data?.token).toBe("string");

  return body.data.token;
};

const getActiveIssues = async (request, token) => {
  const response = await request.get(`${API_BASE_URL}/issues/active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body?.data?.issues)).toBe(true);

  return body.data.issues;
};

test("permissions smoke: an unrelated user cannot view or mutate another owner's issue", async ({
  page,
  request,
}) => {
  const issueName = `E2E Permissions ${Date.now()}`;

  await loginAsAuthSmokeUser(page);
  await page.getByRole("tab", { name: "Create" }).click();
  await expect(
    page.getByRole("heading", { name: "Create issue", exact: true })
  ).toBeVisible();

  await page.getByText("E2E Matrix Model", { exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByPlaceholder("Alternative").fill("E2E Security Alpha");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByPlaceholder("Alternative").fill("E2E Security Beta");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByPlaceholder("Criterion").fill("E2E Security Cost");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByPlaceholder("Criterion").fill("E2E Security Quality");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();

  const expertRow = page
    .getByRole("row")
    .filter({ hasText: issueExpertUser.email });
  await expect(expertRow).toBeVisible();
  await expertRow.getByRole("button", { name: "Add expert" }).click();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  const domainSelect = page.getByRole("combobox", { name: /^Domain\b/ });
  await domainSelect.click();
  await page.getByRole("option", { name: /^E2E Numeric 0-10\b/ }).click();
  await expect(domainSelect).toContainText("E2E Numeric 0-10");
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByLabel("Issue name", { exact: true }).fill(issueName);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Created for the Playwright permissions smoke flow.");
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL("**/dashboard");
  await expect(
    page.getByRole("heading", { name: issueName, exact: true })
  ).toBeVisible();

  const ownerToken = await authenticateApiUser(request, authSmokeUser);
  const ownerIssues = await getActiveIssues(request, ownerToken);
  const matchingOwnerIssues = ownerIssues.filter((issue) => issue?.name === issueName);
  expect(matchingOwnerIssues).toHaveLength(1);
  const issueId = matchingOwnerIssues[0]?.id;
  expect(typeof issueId).toBe("string");

  const openOptionsButton = page.getByRole("button", { name: "Open options" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(openOptionsButton).toBeVisible();
  await openOptionsButton.click();
  await page.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page.getByRole("dialog", { name: "Log out" })).toBeVisible();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await page.waitForURL("**/login");

  await loginAsUser(page, securityOutsiderUser);
  await expect(page.getByRole("tab", { name: "Active" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: issueName, exact: true })
  ).toHaveCount(0);
  await expect(page.getByText(issueName, { exact: true })).toHaveCount(0);

  const outsiderToken = await authenticateApiUser(request, securityOutsiderUser);
  const outsiderIssues = await getActiveIssues(request, outsiderToken);
  expect(
    outsiderIssues.some((issue) => issue?.name === issueName || issue?.id === issueId)
  ).toBe(false);

  const outsiderHeaders = { Authorization: `Bearer ${outsiderToken}` };
  const editExpertsResponse = await request.patch(
    `${API_BASE_URL}/issues/${issueId}/experts`,
    {
      data: { expertsToAdd: [], expertsToRemove: [] },
      headers: outsiderHeaders,
    }
  );
  expect(editExpertsResponse.status()).toBe(403);
  expect((await editExpertsResponse.json()).success).toBe(false);

  const computeResponse = await request.post(
    `${API_BASE_URL}/issues/${issueId}/evaluations/alternativeEvaluation/compute`,
    { headers: outsiderHeaders }
  );
  expect(computeResponse.status()).toBe(403);
  expect((await computeResponse.json()).success).toBe(false);

  const deleteResponse = await request.delete(`${API_BASE_URL}/issues/${issueId}`, {
    headers: outsiderHeaders,
  });
  expect(deleteResponse.status()).toBe(403);
  expect((await deleteResponse.json()).success).toBe(false);

  const ownerIssuesAfterProbes = await getActiveIssues(request, ownerToken);
  const survivingOwnerIssues = ownerIssuesAfterProbes.filter(
    (issue) => issue?.id === issueId && issue?.name === issueName
  );
  expect(survivingOwnerIssues).toHaveLength(1);
  expect(survivingOwnerIssues[0]?.expertParticipants).toEqual(
    expect.arrayContaining([expect.objectContaining({ email: issueExpertUser.email })])
  );
});
