const asArray = (value) => (Array.isArray(value) ? value : []);

const participantLabel = (participant) => {
  const name = participant?.expert?.name || "Unknown participant";
  const email = participant?.expert?.email;
  return email ? `${name} (${email})` : name;
};

const buildTree = (nodes, rootIds) => {
  const byId = new Map(asArray(nodes).map((node) => [node?.id, node]));
  const visit = (id) => {
    const node = byId.get(id);
    if (!node) return null;
    return { ...node, children: asArray(node.childIds).map(visit).filter(Boolean) };
  };
  return asArray(rootIds).map(visit).filter(Boolean);
};

export const buildOverviewData = (payload) => {
  const lifecycle = payload?.lifecycle || {};
  const consensus = payload?.consensus || {};
  const participants = asArray(payload?.participants);
  const accepted = participants.filter((participant) => participant?.invitationStatus === "accepted");
  const notAccepted = participants.filter((participant) => participant?.invitationStatus !== "accepted");
  const criteria = payload?.criteria || {};
  const finalWeights = criteria?.finalWeights || { source: null, byCriterionId: {} };

  return {
    issue: {
      id: payload?.issue?.id || null,
      name: payload?.issue?.name || "",
      description: payload?.issue?.description || "",
      owner: payload?.issue?.owner || null,
      creator: payload?.issue?.creator || null,
      lifecycle,
    },
    general: {
      name: payload?.issue?.name || "",
      owner: payload?.issue?.owner?.name || payload?.issue?.owner?.email || "—",
      model: payload?.models?.base?.name || "—",
      creationDate: lifecycle.creationDate ?? null,
      closureDate: lifecycle.closureDate ?? null,
    },
    description: payload?.issue?.description || "",
    configuration: payload?.configuration || null,
    alternatives: asArray(payload?.alternatives),
    criteria: buildTree(criteria.nodes, criteria.rootIds),
    criteriaHierarchy: criteria,
    finalCriteriaWeights: finalWeights,
    expressionDomains: asArray(payload?.expressionDomains),
    participants: participants.map((participant) => ({
      id: participant?.id || null,
      expertId: participant?.expert?.id || null,
      label: participantLabel(participant),
      invitationStatus: participant?.invitationStatus || null,
      evaluationCompleted: participant?.evaluationCompleted === true,
      weightsCompleted: participant?.weightsCompleted === true,
      currentWeight: participant?.currentWeight ?? null,
    })),
    experts: {
      total: participants.length,
      participated: accepted.map(participantLabel),
      notAccepted: notAccepted.map(participantLabel),
    },
    counts: {
      alternatives: asArray(payload?.alternatives).length,
      criteria: asArray(criteria.nodes).length,
      leafCriteria: asArray(criteria.nodes).filter((node) => node?.isLeaf).length,
      participants: participants.length,
    },
    consensus: consensus.enabled ? {
      threshold: consensus.threshold ?? null,
      maxPhases: consensus.maxPhases ?? null,
      reachedPhaseLabel: consensus.reachedPhase ?? "—",
      finalizationReason: consensus.finalizationReason ?? null,
      finalMeasure: asArray(payload?.phaseResults)
        .filter((result) => result?.stage === "alternativeEvaluation")
        .sort((left, right) => right.phase - left.phase)[0]?.consensusMeasure ?? null,
    } : null,
  };
};

export default buildOverviewData;
