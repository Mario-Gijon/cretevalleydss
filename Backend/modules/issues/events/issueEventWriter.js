import { IssueEvent } from "../../../models/IssueEvents.js";
import { createInternalError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { normalizeOptionalString, normalizeString } from "../../../utils/common/strings.js";
import { ISSUE_EVENT_TYPE_VALUES } from "./issueEventTypes.js";
import { ISSUE_STAGES } from "../shared/issueStages.js";

const EVENT_STAGES = new Set(Object.values(ISSUE_STAGES));

export const cloneIssueEventValue = (value, fallback = null) => {
  if (value === undefined) return fallback;
  return JSON.parse(JSON.stringify(value));
};

const requireId = (value, field) => {
  const id = toIdString(value);
  if (!id) {
    throw createInternalError(`Issue event ${field} is required`, { field });
  }
  return id;
};

const normalizeNullableId = (value, field) => {
  if (value == null) return null;
  return requireId(value, field);
};

const requireNonEmptyString = (value, field) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    throw createInternalError(`Issue event ${field} is required`, { field });
  }
  return normalized;
};

const normalizeOccurredAt = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw createInternalError("Issue event occurredAt must be a valid Date", {
      field: "occurredAt",
    });
  }
  return value;
};

const normalizeStage = (stage) => {
  if (stage == null) return null;
  if (!EVENT_STAGES.has(stage)) {
    throw createInternalError("Issue event stage is invalid", { field: "stage" });
  }
  return stage;
};

const normalizePhase = (phase) => {
  if (phase == null) return null;
  if (!Number.isInteger(phase) || phase < 0) {
    throw createInternalError("Issue event phase is invalid", { field: "phase" });
  }
  return phase;
};

export const writeIssueEvent = async ({
  issueId,
  eventType,
  actorType,
  actorUser = null,
  subjectUser = null,
  entityType = null,
  entityId = null,
  stage = null,
  phase = null,
  occurredAt,
  correlationId,
  reason = null,
  previousState = null,
  nextState = null,
  details = {},
  session = null,
}) => {
  const normalizedEventType = requireNonEmptyString(eventType, "eventType");
  if (!ISSUE_EVENT_TYPE_VALUES.includes(normalizedEventType)) {
    throw createInternalError("Issue event eventType is unsupported", {
      field: "eventType",
    });
  }
  if (actorType !== "user" && actorType !== "system") {
    throw createInternalError("Issue event actorType is invalid", {
      field: "actorType",
    });
  }
  if ((actorType === "user" && actorUser == null) ||
      (actorType === "system" && actorUser != null)) {
    throw createInternalError("Issue event actor metadata is inconsistent", {
      field: "actorUser",
    });
  }
  if (!isPlainObject(details)) {
    throw createInternalError("Issue event details must be an object", {
      field: "details",
    });
  }

  const normalizedEntityType = normalizeOptionalString(entityType);

  const [event] = await IssueEvent.create(
    [{
      issue: requireId(issueId, "issueId"),
      eventType: normalizedEventType,
      actorType,
      actorUser: actorType === "user" ? requireId(actorUser, "actorUser") : null,
      subjectUser: normalizeNullableId(subjectUser, "subjectUser"),
      entityType: normalizedEntityType,
      entityId: normalizeNullableId(entityId, "entityId"),
      stage: normalizeStage(stage),
      phase: normalizePhase(phase),
      occurredAt: normalizeOccurredAt(occurredAt),
      correlationId: requireNonEmptyString(correlationId, "correlationId"),
      reason: normalizeOptionalString(reason),
      previousState: cloneIssueEventValue(previousState),
      nextState: cloneIssueEventValue(nextState),
      details: cloneIssueEventValue(details, {}),
      schemaVersion: 1,
    }],
    { session }
  );

  return event;
};
