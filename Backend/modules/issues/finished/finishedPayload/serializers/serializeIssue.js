import { toIsoOrNull, toRequiredId } from "./serializers.shared.js";

const serializeUser = (user, field) => ({
  id: toRequiredId(user, field),
  name: typeof user?.name === "string" ? user.name : null,
  email: typeof user?.email === "string" ? user.email : null,
});

export const serializeIssue = ({ issue }) => ({
  id: toRequiredId(issue, "issue"),
  name: issue.name,
  description: issue.description,
  owner: serializeUser(issue.ownerId, "owner"),
  creator: serializeUser(issue.createdBy, "creator"),
});

export const serializeLifecycle = ({ issue }) => ({
  active: issue.active === true,
  currentStage: issue.currentStage,
  creationDate: issue.creationDate ?? null,
  closureDate: issue.closureDate ?? null,
  finishedAt: toIsoOrNull(issue.finishedAt),
  createdAt: toIsoOrNull(issue.createdAt),
  updatedAt: toIsoOrNull(issue.updatedAt),
});
