const asArray = (value) => (Array.isArray(value) ? value : []);

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const safeText = (value, fallback = "—") => {
  if (isNonEmptyString(value)) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
};

const safeIdentifier = (value) =>
  typeof value === "string" || (typeof value === "number" && Number.isFinite(value))
    ? String(value)
    : null;

const safePerson = (person) => ({
  id: safeIdentifier(person?.id),
  name: safeText(person?.name, ""),
  email: isNonEmptyString(person?.email) ? person.email : null,
});

const participantLabel = (participant) => {
  const person = participant?.expert || participant;
  const name = safeText(person?.name, "Unknown participant");
  const email = isNonEmptyString(person?.email) ? person.email : null;
  return email ? `${name} (${email})` : name;
};

const formatTechnicalLabel = (value) => {
  if (!isNonEmptyString(value)) return "—";

  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const dateTimestamp = (value) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const phaseNumber = (value) => {
  const phase = Number(value);
  return Number.isFinite(phase) ? phase : -1;
};

const sortPhaseResults = (left, right) => {
  const phaseDifference = phaseNumber(right?.phase) - phaseNumber(left?.phase);
  if (phaseDifference !== 0) return phaseDifference;

  return (
    dateTimestamp(right?.updatedAt || right?.createdAt) -
    dateTimestamp(left?.updatedAt || left?.createdAt)
  );
};

const buildCriteriaTree = ({
  nodes,
  rootIds,
  finalWeights,
  expressionDomains,
}) => {
  const canonicalNodes = asArray(nodes);
  const domainById = new Map(
    asArray(expressionDomains).map((domain) => [domain?.id, domain])
  );
  const byId = new Map(
    canonicalNodes
      .filter((node) => node?.id !== null && node?.id !== undefined && node.id !== "")
      .map((node) => [node.id, node])
  );
  const emittedIds = new Set();

  const visit = (id, path = new Set()) => {
    if (id === null || id === undefined || id === "" || path.has(id) || emittedIds.has(id)) return null;

    const node = byId.get(id);
    if (!node) return null;

    emittedIds.add(id);
    const nextPath = new Set(path);
    nextPath.add(id);

    return {
      id: node.id,
      name: safeText(node.name, "Unnamed criterion"),
      description: safeText(node.description, ""),
      type: isNonEmptyString(node.type) ? node.type : null,
      isLeaf: node.isLeaf === true,
      parentId: node.parentId || null,
      position: node.position ?? null,
      weight:
        finalWeights?.byCriterionId &&
        Object.prototype.hasOwnProperty.call(
          finalWeights.byCriterionId,
          node.id
        )
          ? finalWeights.byCriterionId[node.id]
          : null,
      expressionDomainId: node.expressionDomainId || null,
      expressionDomain:
        domainById.get(node.expressionDomainId) || null,
      children: asArray(node.childIds)
        .map((childId) => visit(childId, nextPath))
        .filter(Boolean),
    };
  };

  const rootSet = new Set(asArray(rootIds));
  const orphanRootIds = canonicalNodes
    .filter(
      (node) =>
        node?.id &&
        !rootSet.has(node.id) &&
        (!node.parentId || !byId.has(node.parentId))
    )
    .map((node) => node.id);

  return [...asArray(rootIds), ...orphanRootIds, ...canonicalNodes.map((node) => node?.id)]
    .map((id) => visit(id))
    .filter(Boolean);
};

const buildDomainSummaries = (domains, criteriaNodes) => {
  const criterionNamesByDomainId = new Map();

  asArray(criteriaNodes).forEach((criterion) => {
    if (!criterion?.expressionDomainId) return;

    const current =
      criterionNamesByDomainId.get(criterion.expressionDomainId) || [];
    current.push(safeText(criterion.name, "Unnamed criterion"));
    criterionNamesByDomainId.set(criterion.expressionDomainId, current);
  });

  return asArray(domains).map((domain) => ({
    id: domain?.id || null,
    name: safeText(domain?.name, "Unnamed domain"),
    typeKey: isNonEmptyString(domain?.typeKey) ? domain.typeKey : null,
    typeLabel: formatTechnicalLabel(domain?.typeKey),
    definition: domain?.definition ?? null,
    criterionNames: criterionNamesByDomainId.get(domain?.id) || [],
  }));
};

const buildParticipantSummary = (participants, participantHistory, usesExpertWeights) => {
  const currentByExpertId = new Map(
    asArray(participants).map((participant) => [safeIdentifier(participant?.expert?.id), participant])
  );
  const historyRecords = asArray(participantHistory?.records);
  const historySummary = participantHistory?.summary;
  if (historyRecords.length || historySummary) {
    const records = historyRecords.map((record) => ({
      id: safeIdentifier(record?.expert?.id),
      expertId: safeIdentifier(record?.expert?.id),
      name: safeText(record?.expert?.name, "Unknown participant"),
      email: isNonEmptyString(record?.expert?.email) ? record.expert.email : null,
      university: isNonEmptyString(record?.expert?.university) ? record.expert.university : null,
      participated: record?.participated === true,
      participationKey: record?.participationKey === "participated" ? "participated" : "notParticipated",
      current: currentByExpertId.has(safeIdentifier(record?.expert?.id)),
      weight: currentByExpertId.has(safeIdentifier(record?.expert?.id))
        ? (Number.isFinite(currentByExpertId.get(safeIdentifier(record?.expert?.id))?.currentWeight)
          ? currentByExpertId.get(safeIdentifier(record?.expert?.id)).currentWeight
          : null)
        : null,
    }));
    const total = Number.isInteger(historySummary?.total) ? historySummary.total : records.length;
    const participated = Number.isInteger(historySummary?.participated) ? historySummary.participated : records.filter((record) => record.participated).length;
    const notParticipated = Number.isInteger(historySummary?.notParticipated) ? historySummary.notParticipated : total - participated;
    return {
      records, total, participated, notParticipated,
      participatedPercentage: Number.isInteger(historySummary?.participatedPercentage) ? historySummary.participatedPercentage : total ? Math.round((participated / total) * 100) : null,
      usesExpertWeights,
      chart: { participated, notParticipated, total },
      currentCount: records.filter((record) => record.current).length,
      removedCount: records.filter((record) => !record.current).length,
    };
  }
  const records = asArray(participants).map((participant) => {
    const status = isNonEmptyString(participant?.invitationStatus)
      ? participant.invitationStatus
      : "unknown";
    const accepted = status === "accepted";
    const completed = participant?.evaluationCompleted === true;

    return {
      id: safeIdentifier(participant?.id) || safeIdentifier(participant?.expert?.id),
      expertId: safeIdentifier(participant?.expert?.id),
      current: true,
      name: safeText(participant?.expert?.name, "Unknown participant"),
      email: isNonEmptyString(participant?.expert?.email) ? participant.expert.email : null,
      university: isNonEmptyString(participant?.expert?.university) ? participant.expert.university : null,
      invitationStatus: status,
      evaluationCompleted: completed,
      weightsCompleted: participant?.weightsCompleted === true,
      currentWeight: participant?.currentWeight ?? null,
      entryStage: participant?.entryStage || null,
      entryPhase: participant?.entryPhase ?? null,
      joinedAt: participant?.joinedAt || null,
      accepted,
      completed,
      participated: completed,
      participationKey: completed ? "participated" : "notParticipated",
      weight: Number.isFinite(participant?.currentWeight) ? participant.currentWeight : null,
    };
  });

  const accepted = records.filter((participant) => participant.accepted);
  const completedAccepted = accepted.filter(
    (participant) => participant.completed
  );
  const acceptedIncomplete = accepted.filter(
    (participant) => !participant.completed
  );
  const pending = records.filter(
    (participant) => participant.invitationStatus === "pending"
  );
  const declined = records.filter(
    (participant) => participant.invitationStatus === "declined"
  );

  return {
    records,
    total: records.length,
    accepted: accepted.length,
    completed: completedAccepted.length,
    acceptedIncomplete: acceptedIncomplete.length,
    pending: pending.length,
    declined: declined.length,
    completionPercentage:
      accepted.length > 0
        ? Math.round((completedAccepted.length / accepted.length) * 100)
        : null,
    participated: completedAccepted.length,
    notParticipated: records.length - completedAccepted.length,
    participatedPercentage: accepted.length > 0 ? Math.round((completedAccepted.length / accepted.length) * 100) : null,
    usesExpertWeights,
    chart: {
      participated: completedAccepted.length,
      notParticipated: records.length - completedAccepted.length,
      total: records.length,
    },
    currentCount: records.length,
    removedCount: 0,
  };
};

export const buildOverviewData = (payload) => {
  const lifecycle = payload?.lifecycle || {};
  const consensus = payload?.consensus || {};
  const participants = asArray(payload?.participants);
  const criteria = payload?.criteria || {};
  const criteriaNodes = asArray(criteria.nodes);
  const finalWeights =
    criteria?.finalWeights || { source: null, byCriterionId: {} };
  const expressionDomains = asArray(payload?.expressionDomains);
  const usesExpertWeights = payload?.models?.base?.capabilities?.usesExpertWeights === true;
  const participation = buildParticipantSummary(participants, payload?.participantHistory, usesExpertWeights);
  const criteriaTree = buildCriteriaTree({
    nodes: criteriaNodes,
    rootIds: criteria.rootIds,
    finalWeights,
    expressionDomains,
  });
  const domainSummaries = buildDomainSummaries(
    expressionDomains,
    criteriaNodes
  );
  const alternativeResults = asArray(payload?.phaseResults)
    .filter((result) => result?.stage === "alternativeEvaluation")
    .sort(sortPhaseResults);
  const latestAlternativeResult = alternativeResults[0] || null;
  const baseModel = payload?.models?.base || null;
  const weightingModel = payload?.models?.criteriaWeighting || null;
  const configuration = payload?.configuration || {};

  const issue = {
    id: safeIdentifier(payload?.issue?.id),
    name: safeText(payload?.issue?.name, ""),
    description: safeText(payload?.issue?.description, ""),
    owner: safePerson(payload?.issue?.owner),
    creator: safePerson(payload?.issue?.creator),
    lifecycle,
  };

  const detailedConfiguration = {
    baseModel: {
      id: safeIdentifier(baseModel?.id),
      name: safeText(baseModel?.name),
    },
    consensus: {
      enabled: consensus.enabled === true,
      supported:
        consensus.modelSupportsConsensus ??
        configuration?.consensus?.supported ??
        null,
      simulated:
        consensus.simulated ??
        configuration?.consensus?.simulated ??
        null,
      threshold:
        consensus.threshold ??
        configuration?.consensus?.threshold ??
        null,
      maxPhases:
        consensus.maxPhases ??
        configuration?.consensus?.maxPhases ??
        null,
    },
    alternativeEvaluation: {
      structureKey:
        configuration?.alternativeEvaluation?.structureKey || null,
      structureLabel: formatTechnicalLabel(
        configuration?.alternativeEvaluation?.structureKey
      ),
    },
    criteriaWeighting: {
      required:
        configuration?.criteriaWeighting?.required === true,
      source: isNonEmptyString(configuration?.criteriaWeighting?.source) ? configuration.criteriaWeighting.source : null,
      sourceLabel: formatTechnicalLabel(
        configuration?.criteriaWeighting?.source
      ),
      structureKey:
        isNonEmptyString(configuration?.criteriaWeighting?.structureKey) ? configuration.criteriaWeighting.structureKey : null,
      structureLabel: formatTechnicalLabel(
        configuration?.criteriaWeighting?.structureKey
      ),
      modelId:
        safeIdentifier(configuration?.criteriaWeighting?.modelId) ||
        safeIdentifier(weightingModel?.id),
      modelName: isNonEmptyString(weightingModel?.name) ? weightingModel.name : null,
      level: configuration?.criteriaWeighting?.level || null,
    },
    domainCount: expressionDomains.length,
    assignedDomainCriteriaCount: criteriaNodes.filter(
      (criterion) => Boolean(criterion?.expressionDomainId)
    ).length,
    domains: domainSummaries,
  };

  return {
    issue,
    general: {
      name: issue.name,
      owner:
        issue.owner.name || issue.owner.email || "—",
      model: safeText(baseModel?.name),
      creationDate: lifecycle.creationDate ?? lifecycle.createdAt ?? null,
      closureDate: lifecycle.closureDate ?? lifecycle.finishedAt ?? null,
    },
    description: issue.description,
    configuration: detailedConfiguration,
    alternatives: asArray(payload?.alternatives).map((alternative) => ({
      id: safeIdentifier(alternative?.id) || safeIdentifier(alternative?._id),
      name: safeText(alternative?.name, "Unnamed alternative"),
      description: safeText(alternative?.description, ""),
      position:
        typeof alternative?.position === "number" || isNonEmptyString(alternative?.position)
          ? alternative.position
          : null,
    })),
    criteria: criteriaTree,
    criteriaHierarchy: criteria,
    finalCriteriaWeights: finalWeights,
    expressionDomains,
    domainSummaries,
    participants: participation.records,
    participation,
    experts: {
      total: participants.length,
      participated: participation.records.filter((participant) => participant.participated).map(participantLabel),
      notAccepted: participation.records.filter((participant) => !participant.participated).map(participantLabel),
    },
    counts: {
      alternatives: asArray(payload?.alternatives).length,
      criteria: criteriaNodes.length,
      leafCriteria: criteriaNodes.filter((node) => node?.isLeaf).length,
      participants: participation.total,
      expressionDomains: expressionDomains.length,
    },
    consensus: consensus.enabled
      ? {
          threshold: consensus.threshold ?? null,
          maxPhases: consensus.maxPhases ?? null,
          reachedPhaseLabel: consensus.reachedPhase ?? "—",
          finalizationReason: consensus.finalizationReason ?? null,
          finalMeasure:
            alternativeResults[0]?.consensusMeasure ?? null,
        }
      : null,
    evidence: {
      resultId: safeIdentifier(latestAlternativeResult?.id),
      storedAt:
        latestAlternativeResult?.createdAt ||
        latestAlternativeResult?.updatedAt ||
        null,
      phase: latestAlternativeResult?.phase ?? null,
      executedBy:
        issue.creator.name ||
        issue.owner.name ||
        issue.creator.email ||
        issue.owner.email ||
        "—",
      executionMode: "Base",
      contractVersion:
        payload?.executionMetadata?.contractVersion ?? null,
      generatedAt:
        payload?.executionMetadata?.generatedAt ?? null,
    },
  };
};

export const buildOverviewPreview = (data) => ({
  id: data.issue.id,
  name: data.issue.name,
  description: data.description,
  owner: data.general.owner,
  ownerEmail: data.issue.owner.email || null,
  baseModelName: data.general.model,
  creationDate: data.general.creationDate,
  closureDate: data.general.closureDate,
  lifecycleStage:
    data.issue.lifecycle?.active === false ? "Finished" : "Active",
  consensusEnabled: Boolean(data.consensus),
  alternativesCount: data.counts.alternatives,
  criteriaCount: data.counts.criteria,
  participantsCount: data.counts.participants,
  acceptedParticipantsCount: data.participation.participated,
  participantSummaryLabel: `${data.participation.participated} participated · ${data.participation.currentCount} current${data.participation.removedCount ? ` · ${data.participation.removedCount} removed` : ""}`,
  completedAlternativeEvaluationsCount: data.participation.participated,
  alternatives: data.alternatives.map(({ id, name }) => ({ id, name })),
  leafCriteria: (() => {
    const leaves = [];
    const visit = (criteria) => criteria.forEach((criterion) => {
      if (criterion.isLeaf) leaves.push({ id: criterion.id, name: criterion.name });
      visit(criterion.children || []);
    });
    visit(data.criteria || []);
    return leaves;
  })(),
});

export default buildOverviewData;
