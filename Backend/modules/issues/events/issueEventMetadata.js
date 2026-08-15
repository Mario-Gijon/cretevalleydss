import { randomUUID } from "node:crypto";

export const createIssueEventOperationMetadata = () => ({
  correlationId: randomUUID(),
  occurredAt: new Date(),
});
