export const activeIssuesFixture = {
  success: true,
  message: "Active issues fetched.",
  data: {
    issues: [{ _id: "issue-1", name: "Budget planning" }],
    taskCenter: { pending: 2 },
    filtersMeta: { total: 1 },
  },
};

export const finishedIssuesFixture = {
  success: true,
  message: "Finished issues fetched.",
  data: [{ _id: "issue-finished-1", name: "Hiring committee" }],
};

export const usersFixture = {
  success: true,
  message: "Users fetched.",
  data: [
    { _id: "expert-1", email: "expert1@example.com" },
    { _id: "expert-2", email: "expert2@example.com" },
  ],
};

export const modelsFixture = {
  success: true,
  message: "Models fetched.",
  data: {
    models: [{ id: "model-1", name: "AHP" }],
    criteriaWeightingModels: [{ id: "cw-1", name: "BWM" }],
  },
};

export const expressionDomainsFixture = {
  success: true,
  message: "Domains fetched.",
  data: {
    globals: [{ _id: "global-domain-1", name: "Global Domain" }],
    userDomains: [{ _id: "user-domain-1", name: "User Domain" }],
  },
};
