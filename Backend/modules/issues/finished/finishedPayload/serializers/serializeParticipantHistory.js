import { toRequiredId } from "./serializers.shared.js";

const finite = (value) => typeof value === "number" && Number.isFinite(value);
const idOf = (value) => {
  try {
    return toRequiredId(value, "participant-history expert");
  } catch {
    return null;
  }
};

const identityOf = (user, id) => ({
  id,
  name: user?.name ?? null,
  email: user?.email ?? null,
  university: user?.university ?? null,
});

const newerSnapshot = (current, candidate) => {
  if (!current) return candidate;
  const currentPhase = Number(current.result?.consensusPhase) || 0;
  const candidatePhase = Number(candidate.result?.consensusPhase) || 0;
  if (candidatePhase !== currentPhase) return candidatePhase > currentPhase ? candidate : current;
  return String(candidate.result?.updatedAt || candidate.result?.createdAt || "") >= String(current.result?.updatedAt || current.result?.createdAt || "")
    ? candidate
    : current;
};

/** A deliberately binary, reason-free record of every expert retained by finished evidence. */
export const serializeParticipantHistory = ({ participations, exitUsers, evaluations, phaseResults }) => {
  const experts = new Map();
  const add = (user) => {
    const id = idOf(user);
    if (!id) return;
    const existing = experts.get(id);
    experts.set(id, existing || { expert: identityOf(user, id), participation: null });
  };

  participations.forEach((entry) => add(entry.expert));
  // Finished-visibility records are hidden and must not create history records.
  exitUsers.filter((entry) => entry.hidden !== true).forEach((entry) => add(entry.user));
  evaluations.forEach((entry) => add(entry.expert));
  phaseResults.forEach((result) => (Array.isArray(result.expertWeights) ? result.expertWeights : []).forEach((entry) => add(entry.expert)));

  participations.forEach((entry) => {
    const id = idOf(entry.expert);
    if (id && experts.has(id)) experts.get(id).participation = entry;
  });

  const completedIds = new Set(
    evaluations.filter((entry) => entry.completed === true).map((entry) => idOf(entry.expert)).filter(Boolean)
  );
  const snapshots = new Map();
  phaseResults.forEach((result) => (Array.isArray(result.expertWeights) ? result.expertWeights : []).forEach((entry) => {
    const id = idOf(entry.expert);
    if (id && finite(entry.weight)) snapshots.set(id, newerSnapshot(snapshots.get(id), { result, weight: entry.weight }));
  }));

  const records = [...experts.entries()].map(([id, entry]) => {
    const participated = completedIds.has(id);
    const currentWeight = entry.participation?.weight;
    const snapshotWeight = snapshots.get(id)?.weight;
    return {
      expert: entry.expert,
      participated,
      participationKey: participated ? "participated" : "notParticipated",
      weight: participated ? (finite(currentWeight) ? currentWeight : finite(snapshotWeight) ? snapshotWeight : null) : null,
    };
  }).sort((left, right) => left.expert.id.localeCompare(right.expert.id));
  const participated = records.filter((record) => record.participated).length;
  const total = records.length;
  return {
    records,
    summary: {
      total,
      participated,
      notParticipated: total - participated,
      participatedPercentage: total ? Math.round((participated / total) * 100) : null,
    },
  };
};
