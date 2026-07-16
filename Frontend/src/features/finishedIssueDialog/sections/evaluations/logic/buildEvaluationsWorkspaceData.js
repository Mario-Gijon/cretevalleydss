import { buildEvaluationsData } from "./buildEvaluationsData";

const asArray = (value) => (Array.isArray(value) ? value : []);

const unique = (values) => [...new Set(values)];

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
        (entry) =>
          entry?.stage === stage && Number.isInteger(entry?.phase)
      )
      .map((entry) => entry.phase)
  ).sort((left, right) => left - right);

const defaultPhase = (phases, selected) =>
  phases.includes(selected) ? selected : phases.at(-1) ?? null;

const participantFor = (payload, expertId) =>
  asArray(payload?.participants).find(
    (participant) => participant?.expert?.id === expertId
  ) || null;

const stageRecord = ({
  payload,
  stage,
  phase,
  selectedExpertId,
  showCollective,
}) => {
  const hasEvidence = [
    ...asArray(payload?.evaluations?.individual),
    ...asArray(payload?.evaluations?.collective),
  ].some((entry) => entry?.stage === stage);

  if (!hasEvidence) {
    return {
      selectedStage: stage,
      selectedPhase: null,
      expertOptions: [],
      selectedExpertId: null,
      selectedParticipant: null,
      individual: null,
      collective: null,
      completedExpertCount: 0,
      selectedSerializedContext: null,
      structureKey: null,
      canShowCollective: false,
      renderer: null,
      empty: true,
    };
  }

  return buildEvaluationsData({
    payload,
    selectedStage: stage,
    selectedPhase: phase,
    selectedExpertId,
    showCollective,
  });
};

const criterionDomainRows = (payload) => {
  const domainsById = new Map(
    asArray(payload?.expressionDomains).map((domain) => [
      domain?.id,
      domain,
    ])
  );

  return asArray(payload?.criteria?.nodes)
    .filter((criterion) => criterion?.isLeaf === true)
    .map((criterion) => {
      const domain = domainsById.get(criterion?.expressionDomainId) || null;

      return {
        criterionId: criterion?.id || null,
        name: criterion?.name || "Unnamed criterion",
        description: criterion?.description || "",
        criterionType: criterion?.type || null,
        criterionTypeLabel:
          criterion?.type === "benefit"
            ? "Benefit"
            : criterion?.type === "cost"
              ? "Cost"
              : null,
        domainId: domain?.id || null,
        domainName: domain?.name || "—",
        domainTypeKey: domain?.typeKey || null,
        domainTypeLabel: formatTechnicalLabel(domain?.typeKey),
        domainDefinition: domain?.definition ?? null,
      };
    });
};

const participationRows = ({
  payload,
  criteriaStage,
  alternativeStage,
}) => {
  const criteriaByExpert = new Map(
    asArray(
      criteriaStage?.selectedPhase === null
        ? []
        : payload?.evaluations?.individual
    )
      .filter(
        (entry) =>
          entry?.stage === "criteriaWeighting" &&
          entry?.phase === criteriaStage?.selectedPhase
      )
      .map((entry) => [entry.expertId, entry])
  );

  const alternativeByExpert = new Map(
    asArray(payload?.evaluations?.individual)
      .filter(
        (entry) =>
          entry?.stage === "alternativeEvaluation" &&
          entry?.phase === alternativeStage?.selectedPhase
      )
      .map((entry) => [entry.expertId, entry])
  );

  const expertIds = unique([
    ...criteriaByExpert.keys(),
    ...alternativeByExpert.keys(),
  ]);

  return expertIds.map((expertId) => {
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
      currentInvitationStatus:
        participant?.invitationStatus || null,
      currentlyRemoved,
      criteriaWeighting: criteria
        ? {
            submittedAt: criteria.submittedAt || null,
            completed: criteria.completed === true,
          }
        : null,
      alternativeEvaluation: alternative
        ? {
            submittedAt: alternative.submittedAt || null,
            completed: alternative.completed === true,
          }
        : null,
      submittedBoth: Boolean(criteria && alternative),
    };
  });
};

const participationSummary = (rows, hasCriteriaWeighting) => {
  if (!hasCriteriaWeighting) {
    return {
      both: 0,
      criteriaOnly: 0,
      alternativeOnly: rows.filter(
        (row) => row.alternativeEvaluation
      ).length,
      total: rows.length,
    };
  }

  return {
    both: rows.filter((row) => row.submittedBoth).length,
    criteriaOnly: rows.filter(
      (row) =>
        row.criteriaWeighting && !row.alternativeEvaluation
    ).length,
    alternativeOnly: rows.filter(
      (row) =>
        !row.criteriaWeighting && row.alternativeEvaluation
    ).length,
    total: rows.length,
  };
};

const latestEvidence = (payload, alternativePhase) =>
  asArray(payload?.phaseResults)
    .filter(
      (result) =>
        result?.stage === "alternativeEvaluation" &&
        result?.phase === alternativePhase
    )
    .sort((left, right) => {
      const leftTime = new Date(
        left?.updatedAt || left?.createdAt || 0
      ).getTime();
      const rightTime = new Date(
        right?.updatedAt || right?.createdAt || 0
      ).getTime();
      return rightTime - leftTime;
    })[0] || null;

export const resolveEvaluationsWorkspaceSelection = ({
  payload,
  selectedConsensusPhase,
  selectedCriteriaExpertId,
  selectedAlternativeExpertId,
  showCollective,
}) => {
  const consensusEnabled = payload?.consensus?.enabled === true;
  const alternativePhases = stagePhases(
    payload,
    "alternativeEvaluation"
  );
  const criteriaPhases = stagePhases(payload, "criteriaWeighting");

  const alternativePhase = defaultPhase(
    alternativePhases,
    consensusEnabled ? selectedConsensusPhase : null
  );
  const criteriaPhase = criteriaPhases.at(-1) ?? null;

  const criteriaStage = stageRecord({
    payload,
    stage: "criteriaWeighting",
    phase: criteriaPhase,
    selectedExpertId: selectedCriteriaExpertId,
    showCollective,
  });

  const alternativeStage = stageRecord({
    payload,
    stage: "alternativeEvaluation",
    phase: alternativePhase,
    selectedExpertId: selectedAlternativeExpertId,
    showCollective,
  });

  return {
    selectedConsensusPhase: consensusEnabled
      ? alternativePhase
      : null,
    selectedCriteriaExpertId:
      criteriaStage.selectedExpertId,
    selectedAlternativeExpertId:
      alternativeStage.selectedExpertId,
    canShowCollective:
      criteriaStage.canShowCollective ||
      alternativeStage.canShowCollective,
  };
};

export const buildEvaluationsWorkspaceData = ({
  payload,
  selection,
}) => {
  const consensusEnabled = payload?.consensus?.enabled === true;
  const alternativePhases = stagePhases(
    payload,
    "alternativeEvaluation"
  );
  const criteriaPhases = stagePhases(payload, "criteriaWeighting");

  const selectedAlternativePhase = defaultPhase(
    alternativePhases,
    consensusEnabled
      ? selection?.selectedConsensusPhase
      : null
  );
  const selectedCriteriaPhase = criteriaPhases.at(-1) ?? null;

  const criteriaWeighting = stageRecord({
    payload,
    stage: "criteriaWeighting",
    phase: selectedCriteriaPhase,
    selectedExpertId: selection?.selectedCriteriaExpertId,
    showCollective: selection?.showCollective,
  });

  const alternativeEvaluation = stageRecord({
    payload,
    stage: "alternativeEvaluation",
    phase: selectedAlternativePhase,
    selectedExpertId: selection?.selectedAlternativeExpertId,
    showCollective: selection?.showCollective,
  });

  const hasCriteriaWeighting =
    !criteriaWeighting.empty &&
    Boolean(criteriaWeighting.renderer?.structureKey);

  const hasAlternativeEvaluation =
    !alternativeEvaluation.empty &&
    Boolean(alternativeEvaluation.renderer?.structureKey);

  const participants = participationRows({
    payload,
    criteriaStage: criteriaWeighting,
    alternativeStage: alternativeEvaluation,
  });

  const evidence = latestEvidence(
    payload,
    selectedAlternativePhase
  );

  return {
    consensus: {
      enabled: consensusEnabled,
      availablePhases: consensusEnabled
        ? alternativePhases
        : [],
      selectedPhase: consensusEnabled
        ? selectedAlternativePhase
        : null,
    },
    showCollective: selection?.showCollective === true,
    canShowCollective:
      criteriaWeighting.canShowCollective ||
      alternativeEvaluation.canShowCollective,
    criteriaWeighting: {
      ...criteriaWeighting,
      available: hasCriteriaWeighting,
      title: "Criteria weighting",
      subtitle:
        "Weights assigned to criteria by the selected expert.",
    },
    alternativeEvaluation: {
      ...alternativeEvaluation,
      available: hasAlternativeEvaluation,
      title: "Alternative evaluation",
      subtitle:
        "Performance of alternatives on each criterion.",
    },
    domains: criterionDomainRows(payload),
    participation: {
      rows: participants,
      summary: participationSummary(
        participants,
        hasCriteriaWeighting
      ),
    },
    evidence: {
      resultId: evidence?.id || null,
      storedAt:
        evidence?.updatedAt || evidence?.createdAt || null,
      createdBy:
        payload?.issue?.creator?.name ||
        payload?.issue?.owner?.name ||
        payload?.issue?.creator?.email ||
        payload?.issue?.owner?.email ||
        "—",
      executionLabel: `Base · ${
        payload?.models?.base?.name || "—"
      }`,
      phase: consensusEnabled
        ? selectedAlternativePhase
        : null,
    },
    empty:
      !hasCriteriaWeighting && !hasAlternativeEvaluation,
  };
};

export default buildEvaluationsWorkspaceData;
