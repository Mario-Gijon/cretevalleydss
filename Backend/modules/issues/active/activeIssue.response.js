import {
  ACTIVE_ACTION_META,
  ACTIVE_STAGE_META,
  ACTIVE_STATUS_META,
  ACTIVE_TASK_ACTION_KEYS,
} from "./activeIssue.meta.js";

const ACTIVE_ROLE_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "expert", label: "Expert" },
  { value: "both", label: "Admin & Expert" },
  { value: "viewer", label: "Viewer" },
];

const ACTIVE_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "creationDate", label: "Creation Date" },
  { value: "deadlineDate", label: "Deadline Date" },
];

export const getEmptyTasksByType = () => ({
  resolveIssue: [],
  computeWeights: [],
  evaluateWeights: [],
  evaluateAlternatives: [],
});

const buildStageOptions = () => [
  { value: "all", label: "All stages" },
  ...Object.values(ACTIVE_STAGE_META).map((stage) => ({
    value: stage.key,
    label: stage.label,
  })),
];

const buildActionOptions = () => [
  { value: "all", label: "All actions" },
  ...Object.values(ACTIVE_STATUS_META).map((status) => ({
    value: status.key,
    label: status.label,
  })),
  ...Object.values(ACTIVE_ACTION_META)
    .sort((a, b) => a.sortPriority - b.sortPriority)
    .map((action) => ({
      value: action.key,
      label: action.label,
    })),
  { value: "none", label: "No pending action" },
];

export const sortActiveIssues = (issues) => {
  issues.sort((a, b) => {
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (diff !== 0) return diff;

    return a.name.localeCompare(b.name);
  });
};

export const sortActiveTasksByType = (tasksByType) => {
  for (const actionKey of ACTIVE_TASK_ACTION_KEYS) {
    tasksByType[actionKey].sort((a, b) => {
      if (a.sortPriority !== b.sortPriority) {
        return a.sortPriority - b.sortPriority;
      }

      const aDeadline = a.deadline.hasDeadline ? a.deadline.daysLeft : 999999;
      const bDeadline = b.deadline.hasDeadline ? b.deadline.daysLeft : 999999;
      if (aDeadline !== bDeadline) return aDeadline - bDeadline;

      return a.issueName.localeCompare(b.issueName);
    });
  }
};

export const buildActiveTaskCenter = (tasksByType) => {
  const total = ACTIVE_TASK_ACTION_KEYS.reduce(
    (acc, key) => acc + tasksByType[key].length,
    0
  );

  const sections = Object.values(ACTIVE_ACTION_META)
    .filter((action) => ACTIVE_TASK_ACTION_KEYS.includes(action.key))
    .sort((a, b) => a.sortPriority - b.sortPriority)
    .map((action) => {
      const items = tasksByType[action.key];

      return {
        key: action.key,
        title: action.label,
        role: action.role,
        severity: action.severity,
        sortPriority: action.sortPriority,
        count: items.length,
        items,
      };
    })
    .filter((section) => section.count > 0);

  return {
    total,
    sections,
  };
};

export const buildActiveFiltersMeta = ({
  roleCounts,
  stageCounts,
  actionCounts,
}) => ({
  defaults: {
    role: "all",
    stage: "all",
    action: "all",
    sort: "creationDate",
    q: "",
  },
  roleOptions: ACTIVE_ROLE_OPTIONS,
  stageOptions: buildStageOptions(),
  actionOptions: buildActionOptions(),
  sortOptions: ACTIVE_SORT_OPTIONS,
  counts: {
    roles: roleCounts,
    stages: stageCounts,
    actions: actionCounts,
  },
});

export const buildActiveIssuesResponseMeta = ({
  formattedIssues,
  tasksByType,
}) => {
  const taskCenter = buildActiveTaskCenter(tasksByType);

  const roleCounts = {};
  const stageCounts = {};
  const actionCounts = {};

  for (const issue of formattedIssues) {
    const role = issue.role;
    const stage = issue.ui.stage;
    const actionKey = issue.ui.statusKey;

    roleCounts[role] = (roleCounts[role] || 0) + 1;
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    actionCounts[actionKey] = (actionCounts[actionKey] || 0) + 1;
  }

  return {
    tasks: {
      total: taskCenter.total,
      byType: tasksByType,
    },
    taskCenter,
    filtersMeta: buildActiveFiltersMeta({
      roleCounts,
      stageCounts,
      actionCounts,
    }),
  };
};

export const buildEmptyActiveIssuesPayload = () => ({
  issues: [],
  tasks: {
    total: 0,
    byType: getEmptyTasksByType(),
  },
  taskCenter: {
    total: 0,
    sections: [],
  },
  filtersMeta: buildActiveFiltersMeta({
    roleCounts: {},
    stageCounts: {},
    actionCounts: {},
  }),
});