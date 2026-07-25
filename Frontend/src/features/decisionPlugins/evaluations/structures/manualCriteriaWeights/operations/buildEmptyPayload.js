export const buildEmptyPayload = ({ criteria }) => ({
  weightsByCriterion: Object.fromEntries(
    criteria.map((criterion) => [criterion.id, ""])
  ),
});
