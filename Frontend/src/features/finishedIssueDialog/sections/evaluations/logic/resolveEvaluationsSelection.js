const asArray = (value) => (Array.isArray(value) ? value : []);

export const resolveEvaluationsSelection = ({
  payload,
  selectedStage = "alternativeEvaluation",
  selectedPhase = null,
  selectedExpertId = null,
}) => {
  const records = [...asArray(payload?.evaluations?.individual), ...asArray(payload?.evaluations?.collective)];
  const stages = ["criteriaWeighting", "alternativeEvaluation"].filter((stage) => records.some((record) => record?.stage === stage));
  const stage = stages.includes(selectedStage) ? selectedStage : stages[0] || "alternativeEvaluation";
  const phases = [...new Set(records.filter((record) => record?.stage === stage && Number.isInteger(record?.phase)).map((record) => record.phase))].sort((left, right) => left - right);
  const phase = phases.includes(selectedPhase) ? selectedPhase : phases.at(-1) ?? null;
  const individuals = asArray(payload?.evaluations?.individual).filter((record) => record?.stage === stage && record?.phase === phase);
  const expertId = individuals.some((record) => record?.expertId === selectedExpertId)
    ? selectedExpertId
    : individuals[0]?.expertId ?? null;
  const canShowCollective = asArray(payload?.evaluations?.collective).some((record) => record?.stage === stage && record?.phase === phase);
  return { selectedStage: stage, selectedPhase: phase, selectedExpertId: expertId, canShowCollective };
};

export default resolveEvaluationsSelection;
