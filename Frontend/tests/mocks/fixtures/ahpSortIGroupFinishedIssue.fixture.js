const categories = [
  { categoryId: "cat-bad", label: "Bad", order: 0 },
  { categoryId: "cat-moderate", label: "Moderate", order: 1 },
  { categoryId: "cat-good", label: "Good", order: 2 },
];

const expertClassifications = {
  "expert-a": { spain: "cat-bad", "united-kingdom": "cat-good" },
  "expert-b": { spain: "cat-bad", "united-kingdom": "cat-moderate" },
  "expert-c": { spain: "cat-bad", "united-kingdom": "cat-bad" },
};

Object.assign(expertClassifications["expert-a"], { croatia: "cat-good", norway: "cat-moderate", romania: "cat-moderate" });
Object.assign(expertClassifications["expert-b"], { croatia: "cat-good", norway: "cat-good", romania: "cat-moderate" });
Object.assign(expertClassifications["expert-c"], { croatia: "cat-good", norway: "cat-moderate", romania: "cat-moderate" });

const alternativeNames = [
  { id: "spain", name: "Spain", position: 0 },
  { id: "united-kingdom", name: "United Kingdom", position: 1 },
  { id: "croatia", name: "Croatia", position: 2 },
  { id: "norway", name: "Norway", position: 3 },
  { id: "romania", name: "Romania", position: 4 },
];

const priorityForCategory = {
  "cat-bad": 0.2,
  "cat-moderate": 0.55,
  "cat-good": 0.8,
};

const weightsByExpert = {
  "expert-a@example.test": { "criterion-quality": 0.7, "criterion-cost": 0.3 },
  "expert-b@example.test": { "criterion-quality": 0.4, "criterion-cost": 0.6 },
  "expert-c@example.test": { "criterion-quality": 0.5, "criterion-cost": 0.5 },
};

const collectiveWeights = { "criterion-quality": 0.55, "criterion-cost": 0.45 };

const localEvidence = (alternativeId, priority) => ({
  entityOrder: [
    { entityType: "alternative", alternativeId },
    { entityType: "profile", profileId: "profile-bad-moderate" },
    { entityType: "profile", profileId: "profile-moderate-good" },
  ],
  pairwiseMatrix: [
    [1, 2, 4],
    [0.5, 1, 2],
    [0.25, 0.5, 1],
  ],
  alternative: priority,
  profilesById: {
    "profile-bad-moderate": 0.4,
    "profile-moderate-good": 0.7,
  },
  consistency: {
    lambdaMax: 3,
    consistencyIndex: 0,
    randomIndex: 0.58,
    consistencyRatio: 0,
    consistencyStatus: "consistent",
  },
});

const individualResult = (classifications) => ({
  modelKey: "ahp_sort_i",
  profileMode: "limiting",
  resultsByAlternativeId: Object.fromEntries(Object.entries(classifications).map(([alternativeId, categoryId]) => {
    const priority = priorityForCategory[categoryId];
    const local = localEvidence(alternativeId, priority);
    return [alternativeId, {
      categoryId,
      globalPriority: priority,
      profileGlobalPrioritiesById: {
        "profile-bad-moderate": 0.4,
        "profile-moderate-good": 0.7,
      },
      weightsByCriterion: { "criterion-quality": 1 },
      weightedContributionsByCriterion: {
        "criterion-quality": {
          alternative: priority,
          profilesById: {
            "profile-bad-moderate": 0.4,
            "profile-moderate-good": 0.7,
          },
        },
      },
      localPrioritiesByCriterion: { "criterion-quality": local },
      classification: {
        rule: "ordered_limiting_profiles_equal_goes_to_more_preferred_category",
      },
    }];
  })),
});

const voteFor = (alternativeId, tiePolicy) => {
  const classifications = Object.fromEntries(Object.entries(expertClassifications).map(([expertId, alternatives]) => [expertId, alternatives[alternativeId]]));
  const votesByCategoryId = Object.fromEntries(categories.map(({ categoryId }) => [
    categoryId,
    Object.values(classifications).filter((categoryIdForExpert) => categoryIdForExpert === categoryId).length,
  ]));
  const maximumVotes = Math.max(...Object.values(votesByCategoryId));
  const tiedCategoryIds = categories.filter(({ categoryId }) => votesByCategoryId[categoryId] === maximumVotes).map(({ categoryId }) => categoryId);
  const selectedCategoryId = tiedCategoryIds.length > 1
    ? tiedCategoryIds[tiePolicy === "optimistic" ? tiedCategoryIds.length - 1 : 0]
    : tiedCategoryIds[0];
  const isTied = tiedCategoryIds.length > 1;
  const aggregationStatus = maximumVotes === Object.keys(expertClassifications).length
    ? "unanimous"
    : isTied ? "tied_plurality" : "unique_plurality";
  return {
    categoryId: selectedCategoryId,
    selectedCategoryId,
    votesByCategoryId,
    classificationsByExpertId: classifications,
    aggregationStatus,
    isUnanimous: aggregationStatus === "unanimous",
    isUniquePlurality: !isTied,
    tieDetected: isTied,
    tiedCategoryIds: isTied ? tiedCategoryIds : [],
    tiePolicy: isTied ? tiePolicy : null,
  };
};

const groupDiagnostics = (tiePolicy) => ({
  modelKey: "ahp_sort_i",
  profileMode: "limiting",
  aggregationMethod: "unweighted_plurality_vote",
  groupTiePolicy: tiePolicy,
  individualResultsByExpertId: Object.fromEntries(Object.entries(expertClassifications).map(([expertId, assignments]) => [expertId, individualResult(assignments)])),
  resultsByAlternativeId: Object.fromEntries(alternativeNames.map(({ id }) => [id, voteFor(id, tiePolicy)])),
});

const modelParameters = (tiePolicy) => ({
  orderedCategories: categories.map(({ categoryId, label, order }) => ({ categoryId, label, order })),
  ahpSortProfiles: {
    mode: "limiting",
    profiles: [
      { profileId: "profile-bad-moderate", lowerCategoryId: "cat-bad", upperCategoryId: "cat-moderate" },
      { profileId: "profile-moderate-good", lowerCategoryId: "cat-moderate", upperCategoryId: "cat-good" },
    ],
  },
  ahpSortGroup: { tiePolicy },
});

export const buildAHPSortIGroupFinishedIssueFixture = ({ tiePolicy = "optimistic" } = {}) => ({
  issue: { id: "ahpsort-i-group-issue" },
  lifecycle: { active: false },
  consensus: { enabled: false },
  alternatives: alternativeNames,
  criteria: {
    nodes: [
      { id: "criterion-quality", name: "Quality", isLeaf: true, parentId: null },
      { id: "criterion-cost", name: "Cost", isLeaf: true, parentId: null },
    ],
  },
  participants: [
    { expert: { id: "expert-a", name: "Expert A", email: "expert-a@example.test" }, invitationStatus: "accepted" },
    { expert: { id: "expert-b", name: "Expert B", email: "expert-b@example.test" }, invitationStatus: "accepted" },
    { expert: { id: "expert-c", name: "Expert C", email: "expert-c@example.test" }, invitationStatus: "accepted" },
  ],
  participantHistory: {
    records: [
      { expert: { id: "expert-a", name: "Expert A", email: "expert-a@example.test" } },
      { expert: { id: "expert-b", name: "Expert B", email: "expert-b@example.test" } },
      { expert: { id: "expert-c", name: "Expert C", email: "expert-c@example.test" } },
    ],
  },
  models: {
    base: {
      id: "ahp-sort-model",
      name: "AHPSort I",
      technical: { apiModelKey: "ahp_sort_i" },
      configuredParameters: modelParameters(tiePolicy),
      effectiveParameters: modelParameters(tiePolicy),
    },
    compatible: [],
  },
  phaseResults: [{
    id: "base-alt-phase",
    stage: "alternativeEvaluation",
    phase: 0,
    expertIds: ["expert-a", "expert-b", "expert-c"],
    resultStructureKey: "sorting",
    resultStructureVersion: 1,
    requestSnapshot: { modelParameters: modelParameters(tiePolicy) },
    standardizedOutput: {
      categoryOrderSemantics: "lower-order-is-less-preferred",
      categories,
      assignments: alternativeNames.map(({ id }) => ({ alternativeId: id, categoryId: voteFor(id, tiePolicy).selectedCategoryId })),
      diagnostics: groupDiagnostics(tiePolicy),
    },
    modelSpecificOutput: { apiModelKey: "ahp_sort_i" },
  }],
  evaluations: {
    contexts: [
      { id: "criteriaWeighting:1", stage: "criteriaWeighting", phase: 1, structureKey: "criteriaPairwiseAHP", decisionContext: { structure: { key: "criteriaPairwiseAHP" }, leafCriteria: [{ id: "criterion-quality", name: "Quality" }, { id: "criterion-cost", name: "Cost" }] } },
      { id: "alternativeEvaluation:0", stage: "alternativeEvaluation", phase: 0, structureKey: "ahpSortAlternativeProfiles", decisionContext: { structure: { key: "ahpSortAlternativeProfiles" }, leafCriteria: [{ id: "criterion-quality", name: "Quality" }, { id: "criterion-cost", name: "Cost" }] } },
    ],
    individual: [
      ...["expert-a", "expert-b", "expert-c"].flatMap((expertId, index) => [
        { id: `criteria-${expertId}`, expertId, stage: "criteriaWeighting", phase: 1, completed: true, submittedAt: `2026-01-0${index + 1}T00:00:00.000Z`, rawPayload: { weightsByCriterion: weightsByExpert[`${expertId}@example.test`] }, contextId: "criteriaWeighting:1" },
        { id: `alternative-${expertId}`, expertId, stage: "alternativeEvaluation", phase: 0, completed: true, submittedAt: `2026-01-0${index + 1}T00:00:00.000Z`, rawPayload: { individualSaatyMatrix: true, expertId }, contextId: "alternativeEvaluation:0" },
      ]),
    ],
    collective: [
      { stage: "criteriaWeighting", phase: 1, rawPayload: { weightsByCriterion: collectiveWeights }, displayPayload: { weightsByCriterion: collectiveWeights, expertWeightsByExpert: weightsByExpert, expertDiagnosticsByExpert: { "expert-a@example.test": { consistencyRatio: 0 }, "expert-b@example.test": { consistencyRatio: 0 }, "expert-c@example.test": { consistencyRatio: 0 } } }, contextId: "criteriaWeighting:1" },
      { stage: "alternativeEvaluation", phase: 0, rawPayload: { unavailableSaatyCollective: true }, displayPayload: { unavailableSaatyCollective: true }, contextId: "alternativeEvaluation:0" },
    ],
  },
  expressionDomains: [],
});
