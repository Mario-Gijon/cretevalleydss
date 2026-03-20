import { authFetch } from "../utils/authFetch";

const API = import.meta.env.VITE_API_BACK;

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const buildQuery = (paramsObj = {}) => {
  const params = new URLSearchParams();

  Object.entries(paramsObj).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : "";
};

/* =========================================================
 * Admin auth
 * ========================================================= */

export const checkAdminAccess = async () => {
  try {
    const res = await authFetch(`${API}/auth/admin/check`, { method: "GET" });
    return await safeJson(res);
  } catch (err) {
    console.error("Error checking admin access:", err);
    return false;
  }
};

/* =========================================================
 * Users / Experts admin
 * ========================================================= */

export const getAllUsers = async ({ q = "", includeAdmins = true } = {}) => {
  try {
    const query = buildQuery({
      q: q?.trim(),
      includeAdmins: includeAdmins ? "true" : undefined,
    });

    const res = await authFetch(`${API}/admin/getAllExperts${query}`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching experts:", err);
    return false;
  }
};

export const createUser = async (userData) => {
  try {
    const res = await authFetch(`${API}/admin/createExpert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error creating user:", err);
    return false;
  }
};

export const updateUser = async ({
  id,
  name,
  university,
  email,
  password,
  accountConfirm,
  role,
}) => {
  try {
    const res = await authFetch(`${API}/admin/updateExpert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name,
        university,
        email,
        password,
        accountConfirm,
        role,
      }),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error updating user:", err);
    return false;
  }
};

export const deleteUser = async (id) => {
  try {
    const res = await authFetch(`${API}/admin/deleteExpert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error deleting user:", err);
    return false;
  }
};

/* =========================================================
 * Issues admin
 * ========================================================= */

export const getAllIssues = async ({
  q = "",
  active = "all",
  currentStage = "all",
  isConsensus = "all",
  adminId = "",
  modelId = "",
} = {}) => {
  try {
    const query = buildQuery({
      q: q?.trim(),
      active,
      currentStage,
      isConsensus,
      adminId,
      modelId,
    });

    const res = await authFetch(`${API}/admin/getAllIssues${query}`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching admin issues:", err);
    return false;
  }
};

export const getIssueByIdAdmin = async (id) => {
  try {
    if (!id) return false;

    const res = await authFetch(`${API}/admin/getIssue/${id}`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching admin issue detail:", err);
    return false;
  }
};

export const getIssueExpertsProgress = async (issueId) => {
  try {
    if (!issueId) return false;

    const res = await authFetch(`${API}/admin/getIssueExpertsProgress/${issueId}`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching issue experts progress:", err);
    return false;
  }
};

export const getIssueExpertEvaluations = async (issueId, expertId) => {
  try {
    if (!issueId || !expertId) return false;

    const res = await authFetch(
      `${API}/admin/getIssueExpertEvaluations/${issueId}/${expertId}`,
      {
        method: "GET",
      }
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching issue expert evaluations:", err);
    return false;
  }
};

export const getIssueExpertWeights = async (issueId, expertId) => {
  try {
    if (!issueId || !expertId) return false;

    const res = await authFetch(
      `${API}/admin/getIssueExpertWeights/${issueId}/${expertId}`,
      {
        method: "GET",
      }
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching issue expert weights:", err);
    return false;
  }
};

export const reassignIssueAdmin = async ({ issueId, newAdminId }) => {
  try {
    const res = await authFetch(`${API}/admin/reassignIssueAdmin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueId,
        newAdminId,
      }),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error reassigning issue admin:", err);
    return false;
  }
};

/* =========================================================
 * Admin acting as creator on issues
 * ========================================================= */

export const editIssueExpertsAdminAction = async ({
  issueId,
  expertsToAdd = [],
  expertsToRemove = [],
  domainAssignments = null,
}) => {
  try {
    const res = await authFetch(`${API}/admin/issues/edit-experts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueId,
        expertsToAdd,
        expertsToRemove,
        domainAssignments,
      }),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error editing issue experts as admin:", err);
    return false;
  }
};

export const computeIssueWeightsAdminAction = async (issueId) => {
  try {
    if (!issueId) return false;

    const res = await authFetch(`${API}/admin/issues/compute-weights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId }),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error computing issue weights as admin:", err);
    return false;
  }
};

export const resolveIssueAdminAction = async (issueId, forceFinalize = false) => {
  try {
    if (!issueId) return false;

    const res = await authFetch(`${API}/admin/issues/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueId,
        forceFinalize,
      }),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error resolving issue as admin:", err);
    return false;
  }
};

export const removeIssueAdminAction = async (issueId) => {
  try {
    if (!issueId) return false;

    const res = await authFetch(`${API}/admin/issues/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId }),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error removing issue as admin:", err);
    return false;
  }
};