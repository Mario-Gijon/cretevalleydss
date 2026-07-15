const asArray = (value) => (Array.isArray(value) ? value : []);

const byPhase = (items, stage, phase) =>
  asArray(items).filter((item) => item?.stage === stage && item?.phase === phase);

const payloadFor = (entry) => entry?.displayPayload ?? entry?.rawPayload ?? null;

const stageLabel = (stage) =>
  stage === "criteriaWeighting" ? "Criteria weighting" : "Alternative evaluation";

const valueLabel = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value.toFixed(4)).toString();
  }
  if (typeof value === "string" || typeof value === "boolean") return String(value);
  return "—";
};

const buildMatrixPreview = ({ context, payload }) => {
  if (context?.structureKey !== "alternativeCriteriaMatrix" || !payload) return null;
  const alternatives = asArray(context?.serializedContext?.alternatives).slice(0, 3);
  const criteria = asArray(context?.serializedContext?.leafCriteria).slice(0, 3);
  if (!alternatives.length || !criteria.length || typeof payload !== "object") return null;

  return {
    alternatives: alternatives.map((alternative) => ({ id: alternative?.id, name: alternative?.name || "—" })),
    criteria: criteria.map((criterion) => ({ id: criterion?.id, name: criterion?.name || "—" })),
    rows: alternatives.map((alternative) => ({
      id: alternative?.id,
      name: alternative?.name || "—",
      values: criteria.map((criterion) => {
        const cell = payload?.[alternative?.id]?.[criterion?.id];
        return valueLabel(cell?.value ?? cell);
      }),
    })),
    hasMoreAlternatives: asArray(context?.serializedContext?.alternatives).length > alternatives.length,
    hasMoreCriteria: asArray(context?.serializedContext?.leafCriteria).length > criteria.length,
  };
};

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
    completedExpertCount: individuals.filter((entry) => entry?.completed === true).length,
    collective: collective ? { ...collective, payload: payloadFor(collective) } : null,
    selectedSerializedContext: context?.serializedContext || null,
    structureKey: context?.structureKey || individual?.structureKey || null,
    expertWeightSnapshot: phaseResult?.expertWeightSnapshot || [],
    finalCriteriaWeights: payload?.criteria?.finalWeights || null,
    leafCriteria: asArray(payload?.criteria?.nodes)
      .filter((criterion) => criterion?.isLeaf)
      .map((criterion) => ({ id: criterion?.id, name: criterion?.name || "—" })),
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
  stage: data.selectedStage,
  stageLabel: stageLabel(data.selectedStage),
  phase: data.selectedPhase,
  expertsCount: data.expertOptions.length,
  completedExpertsCount: data.completedExpertCount,
  phaseLabel: data.selectedPhase === null ? "—" : `Phase ${data.selectedPhase}`,
  structure: data.structureKey || null,
  hasCollective: data.canShowCollective === true,
  finalCriteriaWeights: data.finalCriteriaWeights?.byCriterionId || {},
  criteria: data.leafCriteria,
  matrix: buildMatrixPreview({
    context: { structureKey: data.structureKey, serializedContext: data.renderer?.evaluationContext },
    payload: data.showCollective ? data.collective?.payload : data.individual?.payload,
  }),
});

export default buildEvaluationsData;
