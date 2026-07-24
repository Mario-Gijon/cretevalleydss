const asArray = (value) => (Array.isArray(value) ? value : []);

const unique = (values) => [...new Set(values)];

const payloadFor = (entry) =>
  entry?.displayPayload ?? entry?.rawPayload ?? null;

const formatTechnicalLabel = (value) => {
  if (typeof value !== "string" || !value.trim()) return "—";

  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const stagePhases = (payload, stage) =>
  unique(
    [
      ...asArray(payload?.evaluations?.individual),
      ...asArray(payload?.evaluations?.collective),
    ]
      .filter(
        (entry) => entry?.stage === stage && Number.isInteger(entry?.phase)
      )
      .map((entry) => entry.phase)
  ).sort((left, right) => left - right);

const defaultPhase = (phases, selected) =>
  phases.includes(selected) ? selected : phases.at(-1) ?? null;

const stageHasEvidence = (payload, stage) =>
  [
    ...asArray(payload?.evaluations?.individual),
    ...asArray(payload?.evaluations?.collective),
  ].some((entry) => entry?.stage === stage);

const contextFor = ({ payload, stage, phase, individual, collective }) => {
  const contexts = asArray(payload?.evaluations?.contexts);
  const contextId = individual?.contextId || collective?.contextId || null;

  return contexts.find((entry) => entry?.id === contextId) ||
    contexts.find(
      (entry) => entry?.stage === stage && entry?.phase === phase
    ) ||
    null;
};

const participantFor = (payload, expertId) =>
  asArray(payload?.participants).find(
    (participant) => participant?.expert?.id === expertId
  ) || null;

const expertOptionsFor = ({ payload, criteriaPhase, alternativePhase }) => {
  const records = asArray(payload?.evaluations?.individual).filter(
    (entry) =>
      (entry?.stage === "criteriaWeighting" && entry?.phase === criteriaPhase) ||
      (entry?.stage === "alternativeEvaluation" && entry?.phase === alternativePhase)
  );
  const participantOrder = new Map(
    asArray(payload?.participants).map((participant, index) => [
      participant?.expert?.id,
      index,
    ])
  );

  return unique(records.map((entry) => entry?.expertId).filter(Boolean))
    .map((id) => {
      const participant = participantFor(payload, id);
      const name = participant?.expert?.name || "Unknown participant";
      const email = participant?.expert?.email || null;

      return {
        id,
        label: email ? `${name} (${email})` : name,
        order: participantOrder.get(id) ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .sort(
      (left, right) =>
        left.order - right.order || left.label.localeCompare(right.label) ||
        left.id.localeCompare(right.id)
    )
    .map((option) => ({ id: option.id, label: option.label }));
};

const stageDataFor = ({ payload, stage, phase, selectedExpertId }) => {
  const available = stageHasEvidence(payload, stage);
  if (!available) {
    return {
      stage,
      available: false,
      selectedPhase: null,
      individual: null,
      collective: null,
      submittedAt: null,
      hasSelectedExpertSubmission: false,
      canShowCollective: false,
      renderer: null,
    };
  }

  const individuals = asArray(payload?.evaluations?.individual).filter(
    (entry) => entry?.stage === stage && entry?.phase === phase
  );
  const collective = asArray(payload?.evaluations?.collective).find(
    (entry) => entry?.stage === stage && entry?.phase === phase
  ) || null;
  const individual = individuals.find(
    (entry) => entry?.expertId === selectedExpertId
  ) || null;
  const context = contextFor({ payload, stage, phase, individual, collective });

  return {
    stage,
    available: true,
    selectedPhase: phase,
    individual: individual
      ? { ...individual, payload: payloadFor(individual) }
      : null,
    collective: collective
      ? { ...collective, payload: payloadFor(collective) }
      : null,
    submittedAt: individual?.submittedAt || null,
    hasSelectedExpertSubmission: Boolean(individual),
    canShowCollective: Boolean(collective),
    renderer:
      context && (individual || collective)
        ? {
            stage,
            structureKey: context.structureKey,
            decisionContext: context.decisionContext,
            evaluation: individual ? payloadFor(individual) : null,
            collectiveEvaluation: collective ? payloadFor(collective) : null,
            readOnly: true,
          }
        : null,
  };
};

const criterionDomainRows = (payload) => {
  const domainsById = new Map(
    asArray(payload?.expressionDomains).map((domain) => [domain?.id, domain])
  );

  return asArray(payload?.criteria?.nodes)
    .filter((criterion) => criterion?.isLeaf === true)
    .map((criterion) => {
      const domain = domainsById.get(criterion?.expressionDomainId) || null;

      return {
        criterionId: criterion?.id || null,
        name: criterion?.name || "Unnamed criterion",
        criterionType: criterion?.type || null,
        criterionTypeLabel:
          criterion?.type === "benefit"
            ? "Benefit"
            : criterion?.type === "cost"
              ? "Cost"
              : null,
        domainName: domain?.name || "—",
        domainTypeLabel: formatTechnicalLabel(domain?.typeKey),
        domainDefinition: domain?.definition ?? null,
      };
    });
};

const participationRows = ({ payload, criteriaStage, alternativeStage }) => {
  const criteriaByExpert = new Map(
    asArray(payload?.evaluations?.individual)
      .filter(
        (entry) =>
          entry?.stage === "criteriaWeighting" &&
          entry?.phase === criteriaStage.selectedPhase
      )
      .map((entry) => [entry.expertId, entry])
  );
  const alternativeByExpert = new Map(
    asArray(payload?.evaluations?.individual)
      .filter(
        (entry) =>
          entry?.stage === "alternativeEvaluation" &&
          entry?.phase === alternativeStage.selectedPhase
      )
      .map((entry) => [entry.expertId, entry])
  );

  return unique([...criteriaByExpert.keys(), ...alternativeByExpert.keys()]).map(
    (expertId) => {
      const participant = participantFor(payload, expertId);
      const criteria = criteriaByExpert.get(expertId) || null;
      const alternative = alternativeByExpert.get(expertId) || null;
      const currentlyRemoved =
        participant?.invitationStatus === "declined" ||
        participant?.invitationStatus === "removed" ||
        participant?.invitationStatus === "expelled";

      return {
        expertId,
        name: participant?.expert?.name || "Unknown participant",
        email: participant?.expert?.email || null,
        currentlyRemoved,
        criteriaWeighting: criteria
          ? { submittedAt: criteria.submittedAt || null, completed: criteria.completed === true }
          : null,
        alternativeEvaluation: alternative
          ? { submittedAt: alternative.submittedAt || null, completed: alternative.completed === true }
          : null,
        submittedBoth: Boolean(criteria && alternative),
      };
    }
  );
};

const participationSummary = (rows, hasCriteriaWeighting) => ({
  both: hasCriteriaWeighting ? rows.filter((row) => row.submittedBoth).length : 0,
  criteriaOnly: hasCriteriaWeighting
    ? rows.filter((row) => row.criteriaWeighting && !row.alternativeEvaluation).length
    : 0,
  alternativeOnly: rows.filter(
    (row) => !row.criteriaWeighting && row.alternativeEvaluation
  ).length,
  total: rows.length,
});

const latestEvidence = (payload, alternativePhase) =>
  asArray(payload?.phaseResults)
    .filter(
      (result) =>
        result?.stage === "alternativeEvaluation" && result?.phase === alternativePhase
    )
    .sort(
      (left, right) =>
        new Date(right?.updatedAt || right?.createdAt || 0).getTime() -
        new Date(left?.updatedAt || left?.createdAt || 0).getTime()
    )[0] || null;

const selectionFor = ({ payload, selectedPhase, selectedExpertId }) => {
  const consensusEnabled = payload?.consensus?.enabled === true;
  const alternativePhase = defaultPhase(
    stagePhases(payload, "alternativeEvaluation"),
    consensusEnabled ? selectedPhase : null
  );
  const criteriaPhase = stagePhases(payload, "criteriaWeighting").at(-1) ?? null;
  const expertOptions = expertOptionsFor({
    payload,
    criteriaPhase,
    alternativePhase,
  });

  return {
    consensusEnabled,
    alternativePhase,
    criteriaPhase,
    expertOptions,
    selectedExpertId: expertOptions.some((option) => option.id === selectedExpertId)
      ? selectedExpertId
      : expertOptions[0]?.id ?? null,
  };
};

export const resolveEvaluationsWorkspaceSelection = ({
  payload,
  selectedPhase,
  selectedExpertId,
}) => {
  const selection = selectionFor({
    payload,
    selectedPhase,
    selectedExpertId,
  });
  const criteria = stageDataFor({
    payload,
    stage: "criteriaWeighting",
    phase: selection.criteriaPhase,
    selectedExpertId: selection.selectedExpertId,
  });
  const alternative = stageDataFor({
    payload,
    stage: "alternativeEvaluation",
    phase: selection.alternativePhase,
    selectedExpertId: selection.selectedExpertId,
  });

  return {
    selectedExpertId: selection.selectedExpertId,
    canShowCollective: criteria.canShowCollective || alternative.canShowCollective,
  };
};

export const buildEvaluationsWorkspaceData = ({ payload, selection, selectedPhase = null }) => {
  const resolved = selectionFor({
    payload,
    selectedPhase,
    selectedExpertId: selection?.selectedExpertId,
  });
  const criteriaWeighting = stageDataFor({
    payload,
    stage: "criteriaWeighting",
    phase: resolved.criteriaPhase,
    selectedExpertId: resolved.selectedExpertId,
  });
  const alternativeEvaluation = stageDataFor({
    payload,
    stage: "alternativeEvaluation",
    phase: resolved.alternativePhase,
    selectedExpertId: resolved.selectedExpertId,
  });
  const participants = participationRows({
    payload,
    criteriaStage: criteriaWeighting,
    alternativeStage: alternativeEvaluation,
  });
  const evidence = latestEvidence(payload, resolved.alternativePhase);

  return {
    consensus: {
      enabled: resolved.consensusEnabled,
      availablePhases: resolved.consensusEnabled
        ? stagePhases(payload, "alternativeEvaluation")
        : [],
      selectedPhase: resolved.consensusEnabled ? resolved.alternativePhase : null,
    },
    expertOptions: resolved.expertOptions,
    selectedExpertId: resolved.selectedExpertId,
    canShowCollective:
      criteriaWeighting.canShowCollective || alternativeEvaluation.canShowCollective,
    criteriaWeighting: {
      ...criteriaWeighting,
      title: "Criteria weighting",
      subtitle: "Weights assigned to criteria by the selected expert.",
      emptySubmissionMessage: "This expert did not submit a criteria-weighting evaluation.",
    },
    alternativeEvaluation: {
      ...alternativeEvaluation,
      title: "Alternative evaluation",
      subtitle: "Performance of alternatives on each criterion.",
      emptySubmissionMessage: "This expert did not submit an alternative evaluation in this context.",
    },
    domains: criterionDomainRows(payload),
    participation: {
      rows: participants,
      summary: participationSummary(participants, criteriaWeighting.available),
    },
    evidence: {
      resultId: evidence?.id || null,
      storedAt: evidence?.updatedAt || evidence?.createdAt || null,
      createdBy:
        payload?.issue?.creator?.name || payload?.issue?.owner?.name ||
        payload?.issue?.creator?.email || payload?.issue?.owner?.email || "—",
      executionLabel: `Base · ${payload?.models?.base?.name || "—"}`,
      phase: resolved.consensusEnabled ? resolved.alternativePhase : null,
    },
    empty: !criteriaWeighting.available && !alternativeEvaluation.available,
  };
};

export default buildEvaluationsWorkspaceData;
