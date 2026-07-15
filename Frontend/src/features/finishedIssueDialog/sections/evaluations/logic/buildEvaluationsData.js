const asArray = (value) => (Array.isArray(value) ? value : []);

const byPhase = (items, stage, phase) =>
  asArray(items).filter((item) => item?.stage === stage && item?.phase === phase);

const payloadFor = (entry) => entry?.displayPayload ?? entry?.rawPayload ?? null;

export const buildEvaluationsData = ({
  payload,
  selectedStage = "alternativeEvaluation",
  selectedPhase = null,
  selectedExpertId = null,
  showCollective = false,
}) => {
  const stages = ["criteriaWeighting", "alternativeEvaluation"].filter((stage) =>
    asArray(payload?.evaluations?.individual).some((entry) => entry?.stage === stage) ||
    asArray(payload?.evaluations?.collective).some((entry) => entry?.stage === stage)
  );
  const stage = stages.includes(selectedStage) ? selectedStage : stages[0] || "alternativeEvaluation";
  const phases = [...new Set([
    ...asArray(payload?.evaluations?.individual),
    ...asArray(payload?.evaluations?.collective),
  ].filter((entry) => entry?.stage === stage && Number.isInteger(entry?.phase)).map((entry) => entry.phase))]
    .sort((left, right) => left - right);
  const phase = phases.includes(selectedPhase) ? selectedPhase : phases.at(-1) ?? null;
  const individuals = byPhase(payload?.evaluations?.individual, stage, phase);
  const expertOptions = individuals.map((entry) => {
    const participant = asArray(payload?.participants).find(
      (item) => item?.expert?.id === entry.expertId
    );
    const name = participant?.expert?.name || "Unknown participant";
    const email = participant?.expert?.email || null;
    return { id: entry.expertId, label: email ? `${name} (${email})` : name };
  });
  const expertId = expertOptions.some((option) => option.id === selectedExpertId)
    ? selectedExpertId
    : expertOptions[0]?.id ?? null;
  const individual = individuals.find((entry) => entry.expertId === expertId) || null;
  const collective = byPhase(payload?.evaluations?.collective, stage, phase)[0] || null;
  const contextId = individual?.contextId || `${stage}:${phase}`;
  const context = asArray(payload?.evaluations?.contexts).find((entry) => entry?.id === contextId) || null;
  const phaseResult = asArray(payload?.phaseResults).find(
    (entry) => entry?.stage === stage && entry?.phase === phase
  ) || null;

  return {
    availableStages: stages,
    selectedStage: stage,
    availablePhases: phases,
    selectedPhase: phase,
    expertOptions,
    selectedExpertId: expertId,
    selectedParticipant: asArray(payload?.participants).find((item) => item?.expert?.id === expertId) || null,
    individual: individual ? { ...individual, payload: payloadFor(individual) } : null,
    collective: collective ? { ...collective, payload: payloadFor(collective) } : null,
    selectedSerializedContext: context?.serializedContext || null,
    structureKey: context?.structureKey || individual?.structureKey || null,
    expertWeightSnapshot: phaseResult?.expertWeightSnapshot || [],
    finalCriteriaWeights: payload?.criteria?.finalWeights || null,
    showCollective: showCollective === true,
    canShowCollective: Boolean(collective),
    renderer: context && (individual || collective) ? {
      stage,
      structureKey: context.structureKey,
      evaluationContext: context.serializedContext,
      backendPayload: individual ? payloadFor(individual) : null,
      collectivePayload: collective ? payloadFor(collective) : null,
      readOnly: true,
    } : null,
    empty: !individuals.length && !collective,
  };
};

export const buildEvaluationsPreview = (data) => ({
  expertsCount: data.expertOptions.length,
  phaseLabel: data.selectedPhase === null ? "—" : `Phase ${data.selectedPhase}`,
  structure: data.structureKey || null,
  hasCollective: data.canShowCollective === true,
});

export default buildEvaluationsData;
