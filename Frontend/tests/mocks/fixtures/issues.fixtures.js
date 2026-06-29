export const activeIssuesFixture = {
  success: true,
  message: "Active issues fetched.",
  data: {
    issues: [{ _id: "issue-1", name: "Budget planning" }],
    taskCenter: { pending: 2 },
    filtersMeta: { total: 1 },
  },
};

export const activeIssuesDashboardFixture = [
  {
    id: "issue-active-1",
    _id: "issue-active-1",
    name: "Budget Planning",
    model: { name: "AHP" },
    owner: "Alice Owner",
    alternatives: ["Redwood", "Cedar"],
    criteria: [
      {
        name: "Cost",
        children: [{ name: "Maintenance", children: [] }],
      },
    ],
    createdAt: "2025-06-10T10:00:00.000Z",
    creationDate: "10/06/2025",
    closureDate: "12/07/2025",
    isIssueOwner: true,
    statusFlags: { canResolveIssue: true },
  },
  {
    id: "issue-active-2",
    _id: "issue-active-2",
    name: "Campus Labs",
    model: { name: "TOPSIS" },
    owner: "Bob Builder",
    alternatives: [{ name: "Solar Roof" }],
    criteria: [{ name: "Sustainability", children: [] }],
    createdAt: "",
    creationDate: "09/06/2025",
    closureDate: "",
    isIssueOwner: false,
    statusFlags: { canResolveIssue: false },
  },
  {
    id: "issue-active-3",
    _id: "issue-active-3",
    name: "Hiring Committee",
    model: { name: "PROMETHEE" },
    owner: "Carol Chair",
    alternatives: ["Candidate A"],
    criteria: [
      {
        name: "Experience",
        children: [{ name: "Research", children: [] }],
      },
    ],
    createdAt: "2025-06-01T08:00:00.000Z",
    creationDate: "01/06/2025",
    closureDate: "01/07/2025",
    isIssueOwner: true,
    statusFlags: { canResolveIssue: false },
  },
  {
    id: "issue-active-4",
    _id: "issue-active-4",
    name: "Dorm Upgrade",
    model: null,
    owner: null,
    createdAt: "",
    creationDate: "11/06/2025",
    closureDate: null,
    isIssueOwner: false,
    statusFlags: null,
  },
];

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
