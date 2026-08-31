import { resolveFinishedExpertIdentity } from "./resolveFinishedExpertIdentity";

const asArray = (value) => (Array.isArray(value) ? value : []);

const byPhase = (items, stage, phase) =>
  asArray(items).filter(
    (item) => item?.stage === stage && item?.phase === phase
  );

const payloadFor = (entry) =>
  entry?.displayPayload ?? entry?.rawPayload ?? null;

const expertOptionFor = (payload, entry) => {
  const identity = resolveFinishedExpertIdentity(payload, entry?.expertId);
  const name = identity.name;
  const email = identity.email;

  return {
    id: entry?.expertId,
    label: email ? `${name} (${email})` : name,
  };
};

const contextFor = ({ payload, stage, phase, individual, collective }) => {
  const contexts = asArray(payload?.evaluations?.contexts);
  const contextId = individual?.contextId || collective?.contextId || null;

  return contexts.find((entry) => entry?.id === contextId) || contexts.find(
    (entry) => entry?.stage === stage && entry?.phase === phase
  ) || null;
};

export const buildEvaluationsData = ({
  payload,
  selectedStage = "alternativeEvaluation",
  selectedPhase = null,
  selectedExpertId = null,
  showCollective = false,
}) => {
  const stages = ["criteriaWeighting", "alternativeEvaluation"].filter(
    (stage) =>
      asArray(payload?.evaluations?.individual).some(
        (entry) => entry?.stage === stage
      ) ||
      asArray(payload?.evaluations?.collective).some(
        (entry) => entry?.stage === stage
      )
  );

  const stage = stages.includes(selectedStage)
    ? selectedStage
    : stages[0] || "alternativeEvaluation";

  const phases = [
    ...new Set(
      [
        ...asArray(payload?.evaluations?.individual),
        ...asArray(payload?.evaluations?.collective),
      ]
        .filter(
          (entry) =>
            entry?.stage === stage && Number.isInteger(entry?.phase)
        )
        .map((entry) => entry.phase)
    ),
  ].sort((left, right) => left - right);

  const phase = phases.includes(selectedPhase)
    ? selectedPhase
    : phases.at(-1) ?? null;

  const individuals = byPhase(
    payload?.evaluations?.individual,
    stage,
    phase
  );

  const expertOptions = individuals.map((entry) =>
    expertOptionFor(payload, entry)
  );

  const expertId = expertOptions.some(
    (option) => option.id === selectedExpertId
  )
    ? selectedExpertId
    : expertOptions[0]?.id ?? null;

  const individual =
    individuals.find((entry) => entry.expertId === expertId) || null;

  const collective =
    byPhase(payload?.evaluations?.collective, stage, phase)[0] || null;

  const context = contextFor({
    payload,
    stage,
    phase,
    individual,
    collective,
  });

  const phaseResult =
    asArray(payload?.phaseResults).find(
      (entry) => entry?.stage === stage && entry?.phase === phase
    ) || null;
  const totalIndividualSubmissions = asArray(payload?.evaluations?.individual)
    .filter((entry) => entry?.completed === true)
    .length;

  return {
    availableStages: stages,
    selectedStage: stage,
    availablePhases: phases,
    selectedPhase: phase,
    expertOptions,
    selectedExpertId: expertId,
    selectedParticipant: expertId
      ? resolveFinishedExpertIdentity(payload, expertId)
      : null,
    individual: individual
      ? { ...individual, payload: payloadFor(individual) }
      : null,
    completedExpertCount: individuals.filter(
      (entry) => entry?.completed === true
    ).length,
    collective: collective
      ? { ...collective, payload: payloadFor(collective) }
      : null,
    selectedDecisionContext: context?.decisionContext || null,
    structureKey:
      context?.structureKey || individual?.structureKey || null,
    expertWeightSnapshot: phaseResult?.expertWeightSnapshot || [],
    totalIndividualSubmissions,
    showCollective: showCollective === true,
    canShowCollective: Boolean(collective),
    renderer:
      context && (individual || collective)
        ? {
            stage,
            structureKey: context.structureKey,
            decisionContext: context.decisionContext,
            evaluation: individual
              ? payloadFor(individual)
              : null,
            collectiveEvaluation: collective
              ? payloadFor(collective)
              : null,
            readOnly: true,
          }
        : null,
    empty: !individuals.length && !collective,
  };
};

export const buildEvaluationsPreview = (data) => ({
  stage: data.selectedStage,
  stageLabel:
    data.selectedStage === "criteriaWeighting"
      ? "Criteria weighting"
      : "Alternative evaluation",
  phase: data.selectedPhase,
  phaseLabel:
    data.selectedPhase === null ? "—" : `Phase ${data.selectedPhase}`,
  expertsCount: data.expertOptions.length,
  completedExpertsCount: data.completedExpertCount,
  evaluationsCount: data.totalIndividualSubmissions ?? data.expertOptions.length,
  hasCollective: data.canShowCollective === true,
  showCollective: data.showCollective === true,
  renderer: data.renderer
    ? {
        stage: data.renderer.stage,
        structureKey: data.renderer.structureKey,
        decisionContext: data.renderer.decisionContext,
        evaluation: data.renderer.evaluation,
        collectiveEvaluation: data.renderer.collectiveEvaluation,
        readOnly: true,
      }
    : null,
});

export default buildEvaluationsData;
