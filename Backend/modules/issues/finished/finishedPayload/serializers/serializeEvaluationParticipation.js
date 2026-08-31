import { toIsoOrNull, toRequiredId } from "./serializers.shared.js";

const id = (value) => {
  try { return toRequiredId(value, "evaluation participation expert"); } catch { return null; }
};
const identity = (user, expertId) => ({ expertId, name: user?.name ?? null, email: user?.email ?? null, university: user?.university ?? null });
const submission = (evaluation) => ({ phase: evaluation.consensusPhase, completed: evaluation.completed === true, submittedAt: toIsoOrNull(evaluation.submittedAt) });
const eventType = (type) => ({
  "invitation.accepted": "invitationAccepted", "invitation.declined": "invitationDeclined", "participation.entered": "entered", "participation.left": "left", "participation.removed": "removed",
}[type] || null);

/** Read-only audit projection: dates are emitted only from canonical IssueEvent evidence. */
export const serializeEvaluationParticipation = ({ participations = [], evaluations = [], issueEvents = [] }) => {
  const experts = new Map();
  const add = (user) => { const expertId = id(user); if (expertId && !experts.has(expertId)) experts.set(expertId, { ...identity(user, expertId), participation: null, events: [] }); };
  participations.forEach((entry) => add(entry.expert));
  evaluations.forEach((entry) => add(entry.expert));
  issueEvents.forEach((entry) => add(entry.subjectUser));
  participations.forEach((entry) => { const expertId = id(entry.expert); if (expertId && experts.has(expertId)) experts.get(expertId).participation = entry; });
  issueEvents.forEach((entry) => { const expertId = id(entry.subjectUser); const type = eventType(entry.eventType); if (expertId && type && experts.has(expertId)) experts.get(expertId).events.push(entry); });
  const phases = (stage) => [...new Set(evaluations.filter((entry) => entry.stage === stage && Number.isInteger(entry.consensusPhase)).map((entry) => entry.consensusPhase))].sort((a, b) => a - b);
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
        criteriaWeighting: { submissions: evaluations.filter((evaluation) => id(evaluation.expert) === entry.expertId && evaluation.stage === "criteriaWeighting").map(submission) },
        alternativeEvaluation: { submissions: evaluations.filter((evaluation) => id(evaluation.expert) === entry.expertId && evaluation.stage === "alternativeEvaluation").map(submission) },
        participationEvents: events,
      };
    }).sort((left, right) => left.name.localeCompare(right.name) || left.expertId.localeCompare(right.expertId)),
  };
};

export default serializeEvaluationParticipation;
