// src/controllers/issues.controller.js (o donde lo tengas)
import { authFetch } from "../utils/authFetch";

const API = import.meta.env.VITE_API_BACK;

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

export const getModelsInfo = async () => {
  try {
    const res = await authFetch(`${API}/issues/getModelsInfo`, { method: "GET" });
    const jsonData = await safeJson(res);
    return jsonData?.success ? jsonData.data : false;
  } catch (err) {
    console.error("Error fetching models info:", err);
    return false;
  }
};

export const getExpressionsDomain = async () => {
  try {
    const res = await authFetch(`${API}/issues/getExpressionsDomain`, { method: "GET" });
    const jsonData = await safeJson(res);
    return jsonData?.success ? jsonData.data : [];
  } catch (err) {
    console.error("Error fetching expressions domain:", err);
    return false;
  }
};

export const getAllUsers = async () => {
  try {
    const res = await authFetch(`${API}/issues/getAllUsers`, { method: "GET" });
    const jsonData = await safeJson(res);
    return jsonData?.success ? jsonData.data : false;
  } catch (err) {
    console.error("Error fetching users:", err);
    return false;
  }
};

export const createExpressionDomain = async (domain) => {
  try {
    const res = await authFetch(`${API}/issues/createExpressionDomain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(domain),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error creating domain:", err);
    return false;
  }
};

export const createIssue = async (issueInfo) => {
  try {
    const res = await authFetch(`${API}/issues/createIssue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueInfo }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error creating issue:", err);
    return false;
  }
};

export const getAllActiveIssues = async () => {
  try {
    const res = await authFetch(`${API}/issues/getAllActiveIssues`, { method: "GET" });
    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching active issues:", err);
    return false;
  }
};

export const getAllFinishedIssues = async () => {
  try {
    const res = await authFetch(`${API}/issues/getAllFinishedIssues`, { method: "GET" });
    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching finished issues:", err);
    return false;
  }
};

export const removeIssue = async (id) => {
  try {
    const res = await authFetch(`${API}/issues/removeIssue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error removing issue:", err);
    return false;
  }
};

export const removeExpressionDomain = async (id) => {
  try {
    const res = await authFetch(`${API}/issues/removeExpressionDomain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error deleting domain:", err);
    return false;
  }
};

export const updateExpressionDomain = async (id, updatedDomain) => {
  try {
    const res = await authFetch(`${API}/issues/updateExpressionDomain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updatedDomain }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error updating domain:", err);
    return false;
  }
};

export const changeInvitationStatus = async (id, action) => {
  try {
    const res = await authFetch(`${API}/issues/changeInvitationStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error changing invitation status:", err);
    return false;
  }
};

export const saveEvaluations = async (id, isPairwise, evaluations) => {
  try {
    const url = isPairwise ? "savePairwiseEvaluations" : "saveEvaluations";
    const res = await authFetch(`${API}/issues/${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, evaluations }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error saving evaluations:", err);
    return false;
  }
};

export const getEvaluations = async (id, isPairwise) => {
  try {
    const url = isPairwise ? "getPairwiseEvaluations" : "getEvaluations";
    const res = await authFetch(`${API}/issues/${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching evaluations:", err);
    return false;
  }
};

export const sendEvaluations = async (id, isPairwise, evaluations) => {
  try {
    const url = isPairwise ? "sendPairwiseEvaluations" : "sendEvaluations";
    const res = await authFetch(`${API}/issues/${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, evaluations }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error sending evaluations:", err);
    return false;
  }
};

export const resolveIssue = async (id, isPairwise) => {
  try {
    const url = isPairwise ? "resolvePairwiseIssue" : "resolveIssue";
    const res = await authFetch(`${API}/issues/${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error resolving issue:", err);
    return false;
  }
};

export const getFinishedIssueInfo = async (id) => {
  try {
    const res = await authFetch(`${API}/issues/getFinishedIssueInfo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching finished issue info:", err);
    return false;
  }
};

export const removeFinishedIssue = async (id) => {
  try {
    const res = await authFetch(`${API}/issues/removeFinishedIssue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error removing finished issue:", err);
    return false;
  }
};

export const editExperts = async (id, expertsToAdd, expertsToRemove, domainAssignments = null) => {
  try {
    const res = await authFetch(`${API}/issues/editExperts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, expertsToAdd, expertsToRemove, domainAssignments }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error editing experts:", err);
    return false;
  }
};

export const leaveIssue = async (id) => {
  try {
    const res = await authFetch(`${API}/issues/leaveIssue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error leaving issue:", err);
    return false;
  }
};

export const saveBwmWeights = async (id, bwmData) => {
  try {
    const res = await authFetch(`${API}/issues/saveBwmWeights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, bwmData }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error saving BWM weights:", err);
    return false;
  }
};

export const getBwmWeights = async (id) => {
  try {
    const res = await authFetch(`${API}/issues/getBwmWeights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching BWM weights:", err);
    return false;
  }
};

export const sendBwmWeights = async (id, bwmData) => {
  try {
    const res = await authFetch(`${API}/issues/sendBwmWeights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, bwmData }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error sending BWM weights:", err);
    return false;
  }
};

export const saveManualWeights = async (id, weights) => {
  try {
    const res = await authFetch(`${API}/issues/saveManualWeights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, weights }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error saving manual weights:", err);
    return false;
  }
};

export const getManualWeights = async (id) => {
  try {
    const res = await authFetch(`${API}/issues/getManualWeights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching manual weights:", err);
    return false;
  }
};

export const sendManualWeights = async (id, weights) => {
  try {
    const res = await authFetch(`${API}/issues/sendManualWeights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, weights }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error sending manual weights:", err);
    return false;
  }
};

export const computeWeights = async (id) => {
  try {
    const res = await authFetch(`${API}/issues/computeWeights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error computing weights:", err);
    return false;
  }
};

export const computeManualWeights = async (id) => {
  try {
    const res = await authFetch(`${API}/issues/computeManualWeights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error computing manual weights:", err);
    return false;
  }
};

export const getIssueScenarios = async (issueId) => {
  try {
    const res = await authFetch(`${API}/issues/getIssueScenarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching scenarios:", err);
    return false;
  }
};

export const getIssueScenarioById = async (scenarioId) => {
  try {
    const res = await authFetch(`${API}/issues/getIssueScenarioById`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching scenario by id:", err);
    return false;
  }
};

export const createIssueScenario = async ({ issueId, scenarioName, targetModelName, paramOverrides }) => {
  try {
    const res = await authFetch(`${API}/issues/createIssueScenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId, scenarioName, targetModelName, paramOverrides }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error creating scenario:", err);
    return false;
  }
};

export const removeIssueScenario = async (scenarioId) => {
  try {
    const res = await authFetch(`${API}/issues/removeIssueScenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    });
    return await safeJson(res);
  } catch (err) {
    console.error("Error removing scenario:", err);
    return false;
  }
};