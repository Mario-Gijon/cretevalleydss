const asArray = (value) => (Array.isArray(value) ? value : []);
const key = (value) => (value === null || value === undefined ? "" : String(value));

export const resolveFinishedExpertIdentity = (payload, expertId) => {
  const id = key(expertId);
  const historical = asArray(payload?.evaluations?.participation?.experts).find(
    (expert) => key(expert?.expertId ?? expert?.id) === id
  );
  const current = asArray(payload?.participants).find(
    (participant) => key(participant?.expert?.id) === id
  );
  const source = historical || current?.expert || null;
  return {
    id: expertId,
    name: source?.name || "Unknown participant",
    email: source?.email || null,
    university: source?.university || null,
  };
};

export default resolveFinishedExpertIdentity;
