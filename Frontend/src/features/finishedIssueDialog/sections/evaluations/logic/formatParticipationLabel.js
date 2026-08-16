export const formatParticipationLabel = ({
  criteriaCompleted = 0,
  alternativeCompleted = 0,
  hasCriteriaWeighting = true,
  events = [],
}) => {
  const completed = criteriaCompleted + alternativeCompleted;
  const irregular = events.filter((event) => ["entered", "left", "removed"].includes(event?.type));
  const left = irregular.findLast((event) => event.type === "left" || event.type === "removed");
  const entered = irregular.filter((event) => event.type === "entered");
  if (left) return `Left after ${left.phase === 0 ? "Initial" : `Round ${left.phase}`}`;
  if (entered.length > 1) return "Re-entered";
  if (entered[0] && entered[0].phase > 0) return `Joined · Round ${entered[0].phase}`;
  if (hasCriteriaWeighting) {
    if (criteriaCompleted > 0 && alternativeCompleted > 0) return "Full process";
    if (criteriaCompleted > 0) return "Criteria only";
    if (alternativeCompleted > 0) return "Alternatives only";
  } else if (alternativeCompleted > 0) {
    return "Full process";
  }
  return completed > 0 ? "Full process" : "No submissions";
};

export default formatParticipationLabel;
