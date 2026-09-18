import { toIsoOrNull, toRequiredId } from "./serializers.shared.js";

const id = (value) => {
  try { return toRequiredId(value, "evaluation participation expert"); } catch { return null; }
};
const identity = (user, expertId) => ({
  expertId,
  name: user?.name ?? null,
  email: user?.email ?? null,
  university: user?.university ?? null,
});
const mergeIdentity = (entry, user) => {
  ["name", "email", "university"].forEach((field) => {
    if (entry[field] === null && user?.[field] != null) {
      entry[field] = user[field];
    }
  });
};
const submission = (evaluation) => ({ phase: evaluation.consensusPhase, completed: evaluation.completed === true, submittedAt: toIsoOrNull(evaluation.submittedAt) });
const revisionSubmission = (revision) => ({
  phase: revision.consensusPhase,
  completed: revision.action === "submitted",
  submittedAt: toIsoOrNull(revision.submittedAt),
});
const eventType = (type) => ({
  "invitation.accepted": "invitationAccepted", "invitation.declined": "invitationDeclined", "participation.entered": "entered", "participation.left": "left", "participation.removed": "removed",
}[type] || null);

/** Read-only audit projection: dates are emitted only from canonical IssueEvent evidence. */
export const serializeEvaluationParticipation = ({ participations = [], evaluations = [], evaluationRevisions = [], issueEvents = [] }) => {
  const experts = new Map();
  const add = (user) => {
    const expertId = id(user);
    if (!expertId) return;

    if (!experts.has(expertId)) {
      experts.set(expertId, {
        ...identity(user, expertId),
        participation: null,
        events: [],
      });
      return;
    }

    mergeIdentity(experts.get(expertId), user);
  };
  participations.forEach((entry) => add(entry.expert));
  evaluations.forEach((entry) => add(entry.expert));
  evaluationRevisions.forEach((entry) => add(entry.expert));
  issueEvents.forEach((entry) => add(entry.subjectUser));
  participations.forEach((entry) => { const expertId = id(entry.expert); if (expertId && experts.has(expertId)) experts.get(expertId).participation = entry; });
  issueEvents.forEach((entry) => { const expertId = id(entry.subjectUser); const type = eventType(entry.eventType); if (expertId && type && experts.has(expertId)) experts.get(expertId).events.push(entry); });
  const phases = (stage) => [...new Set([
    ...evaluations,
    ...evaluationRevisions,
  ].filter((entry) => entry.stage === stage && Number.isInteger(entry.consensusPhase)).map((entry) => entry.consensusPhase))].sort((a, b) => a - b);
  const submissions = ({ expertId, stage }) => {
    const byPhase = new Map();
    evaluations
      .filter((entry) => id(entry.expert) === expertId && entry.stage === stage)
      .forEach((entry) => byPhase.set(entry.consensusPhase, submission(entry)));
    evaluationRevisions
      .filter((entry) => id(entry.expert) === expertId && entry.stage === stage)
      .forEach((entry) => {
        const existing = byPhase.get(entry.consensusPhase);
        const revision = revisionSubmission(entry);
        byPhase.set(entry.consensusPhase, {
          phase: entry.consensusPhase,
          completed: existing?.completed === true || revision.completed,
          submittedAt: existing?.submittedAt ?? revision.submittedAt,
        });
      });
    return [...byPhase.values()].sort((left, right) => left.phase - right.phase);
  };
  return {
    stagePhases: { criteriaWeighting: phases("criteriaWeighting"), alternativeEvaluation: phases("alternativeEvaluation") },
    experts: [...experts.values()].map((entry) => {
      const response = entry.events.find((event) => event.eventType === "invitation.accepted" || event.eventType === "invitation.declined") || null;
      const events = entry.events.map((event) => ({ type: eventType(event.eventType), stage: event.stage ?? null, phase: Number.isInteger(event.phase) ? event.phase : null, occurredAt: toIsoOrNull(event.occurredAt), reason: event.reason ?? null }));
      const entries = events.filter((event) => event.type === "entered");
      return {
        expertId: entry.expertId, name: entry.name, email: entry.email, university: entry.university,
        invitation: {
          status: ["pending", "accepted", "declined"].includes(entry.participation?.invitationStatus)
            ? entry.participation.invitationStatus
            : response?.eventType === "invitation.accepted"
              ? "accepted"
              : response?.eventType === "invitation.declined"
                ? "declined"
                : "pending",
          respondedAt: response ? toIsoOrNull(response.occurredAt) : null,
        },
        entry: entries[0] ? { stage: entries[0].stage, phase: entries[0].phase, occurredAt: entries[0].occurredAt } : null,
        criteriaWeighting: { submissions: submissions({ expertId: entry.expertId, stage: "criteriaWeighting" }) },
        alternativeEvaluation: { submissions: submissions({ expertId: entry.expertId, stage: "alternativeEvaluation" }) },
        participationEvents: events,
      };
    }).sort((left, right) => {
      const leftName = typeof left.name === "string" ? left.name.trim() : "";
      const rightName = typeof right.name === "string" ? right.name.trim() : "";

      return (
        leftName.localeCompare(rightName) ||
        left.expertId.localeCompare(right.expertId)
      );
    }),
  };
};

export default serializeEvaluationParticipation;
