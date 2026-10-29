const PROFILE_TOLERANCE = 1e-12;
const CONSISTENCY_REVIEW_THRESHOLD = 0.1;
const AHP_SORT_I_API_MODEL_KEY = "ahp_sort_i";
const LIMITING_ASSIGNMENT_RULE = "ordered_limiting_profiles_equal_goes_to_more_preferred_category";
const CENTRAL_ASSIGNMENT_RULE = "nearest_central_profile_with_explicit_tie_policy";

const asArray = (value) => Array.isArray(value) ? value : [];
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const nonEmptyString = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const isPriority = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const isDistance = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const hasExactKeys = (record, expectedIds) => {
  if (!isRecord(record)) return false;
  const actual = Object.keys(record).sort();
  const expected = [...expectedIds].sort();
  return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
};

const apiModelKeyFor = (execution) => [
  execution?.modelSpecificOutput?.apiModelKey,
  execution?.model?.technical?.apiModelKey,
  execution?.model?.apiModelKey,
].map(nonEmptyString).find(Boolean) || null;

/** Identify AHPSort I from the selected execution's saved model metadata. */
export const isAHPSortIExecution = (execution) => apiModelKeyFor(execution) === AHP_SORT_I_API_MODEL_KEY;

const resolveModelParameters = (execution) => {
  // A scenario's request snapshot is authoritative even when it differs from
  // the Issue's current parameters. Base execution metadata is used only when
  // that per-execution snapshot is absent from the historical payload.
  const requestParameters = execution?.requestSnapshot?.modelParameters;
  if (isRecord(requestParameters)) return requestParameters;
  const savedBaseParameters = execution?.model?.configuredParameters;
  if (isRecord(savedBaseParameters) && (
    Object.hasOwn(savedBaseParameters, "ahpSortProfiles") ||
    Object.hasOwn(savedBaseParameters, "orderedCategories")
  )) return savedBaseParameters;
  return isRecord(execution?.modelParameters) ? execution.modelParameters : {};
};

const resolveCriterionNames = (criteria) => {
  if (Array.isArray(criteria)) {
    return new Map(criteria.flatMap((criterion) => {
      const id = nonEmptyString(criterion?.id);
      const name = nonEmptyString(criterion?.name);
      return id && name ? [[id, name]] : [];
    }));
  }

  const nodes = asArray(criteria?.nodes);
  const nodesById = new Map(nodes.map((node) => [node?.id, node]));
  const labels = new Map();
  const pathFor = (node, visited = new Set()) => {
    if (!node || visited.has(node.id)) return null;
    const name = nonEmptyString(node.name);
    if (!name) return null;
    const nextVisited = new Set(visited).add(node.id);
    const parent = node.parentId ? nodesById.get(node.parentId) : null;
    const parentPath = parent ? pathFor(parent, nextVisited) : null;
    return parentPath ? `${parentPath} / ${name}` : name;
  };
  for (const node of nodes) {
    if (node?.isLeaf !== true) continue;
    const id = nonEmptyString(node.id);
    const label = pathFor(node);
    if (id && label) labels.set(id, label);
  }
  return labels;
};

const resolveProfiles = ({ mode, categories, modelParameters }) => {
  const profileConfiguration = modelParameters?.ahpSortProfiles;
  if (!isRecord(profileConfiguration) || profileConfiguration.mode !== mode || !Array.isArray(profileConfiguration.profiles)) {
    return { profiles: null, reason: "The saved profile configuration is incomplete." };
  }
  const profiles = profileConfiguration.profiles;
  const ids = profiles.map((profile) => nonEmptyString(profile?.profileId));
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    return { profiles: null, reason: "The saved profile configuration is incomplete." };
  }

  if (mode === "limiting") {
    if (profiles.length !== categories.length - 1) {
      return { profiles: null, reason: "The saved profile configuration does not match the stored categories." };
    }
    const normalized = [];
    for (let order = 0; order < categories.length - 1; order += 1) {
      const lower = categories[order];
      const upper = categories[order + 1];
      const matches = profiles.filter((profile) => profile?.lowerCategoryId === lower.id && profile?.upperCategoryId === upper.id);
      if (matches.length !== 1) {
        return { profiles: null, reason: "The saved profile configuration does not match the stored categories." };
      }
      normalized.push({
        id: matches[0].profileId,
        lower,
        upper,
        label: `${lower.label} / ${upper.label}`,
      });
    }
    return { profiles: normalized, reason: null };
  }

  if (profiles.length !== categories.length) {
    return { profiles: null, reason: "The saved profile configuration does not match the stored categories." };
  }
  const normalized = [];
  for (const category of categories) {
    const matches = profiles.filter((profile) => profile?.categoryId === category.id);
    if (matches.length !== 1) {
      return { profiles: null, reason: "The saved profile configuration does not match the stored categories." };
    }
    normalized.push({ id: matches[0].profileId, category, label: category.label });
  }
  const tiePolicy = profileConfiguration.tiePolicy;
  if (tiePolicy !== "optimistic" && tiePolicy !== "pessimistic") {
    return { profiles: null, reason: "The saved central-profile tie policy is unavailable." };
  }
  return { profiles: normalized, tiePolicy, reason: null };
};

const storedCategoriesMatchSnapshot = (categories, modelParameters) => {
  const configured = modelParameters?.orderedCategories;
  if (!Array.isArray(configured)) return true;
  if (configured.length !== categories.length) return false;
  const configuredByOrder = configured.slice().sort((left, right) => left?.order - right?.order);
  return configuredByOrder.every((category, index) =>
    category?.categoryId === categories[index]?.id && category?.label === categories[index]?.label && category?.order === index,
  );
};

const assignmentFor = (result, alternativeId) => {
  for (const category of result.categories) {
    const alternative = category.alternatives.find((entry) => entry.id === alternativeId);
    if (alternative) return { category, alternative };
  }
  return null;
};

const limitingCategoryFor = ({ priority, profiles, profilePriorities, categories }) => {
  for (let index = 0; index < profiles.length; index += 1) {
    const boundary = profilePriorities[profiles[index].id];
    if (boundary - priority > PROFILE_TOLERANCE) return categories[index];
  }
  return categories.at(-1);
};

const validateCentralClassification = ({ classification, assignmentCategory, profiles, profilePriorities, rootTiePolicy, alternativePriority }) => {
  const tiePolicy = classification?.tiePolicy;
  const distances = classification?.centerDistancesByProfileId;
  const profileIds = profiles.map((profile) => profile.id);
  const profilesAreOrdered = profiles.every((profile, index) => index === 0 ||
    profilePriorities[profile.id] - profilePriorities[profiles[index - 1].id] > PROFILE_TOLERANCE);
  if (
    (tiePolicy !== "optimistic" && tiePolicy !== "pessimistic") || tiePolicy !== rootTiePolicy ||
    !profilesAreOrdered ||
    !hasExactKeys(distances, profileIds) || !profileIds.every((id) => isDistance(distances[id]))
  ) return false;

  const selectedId = nonEmptyString(classification?.selectedCenterProfileId);
  const selectedProfile = profiles.find((profile) => profile.id === selectedId);
  if (!selectedProfile || selectedProfile.category.id !== assignmentCategory.id) return false;
  const minDistance = Math.min(...profileIds.map((id) => distances[id]));
  if (profiles.some((profile) => Math.abs(Math.abs(alternativePriority - profilePriorities[profile.id]) - distances[profile.id]) > PROFILE_TOLERANCE)) return false;
  const tied = profiles.filter((profile) => distances[profile.id] - minDistance <= PROFILE_TOLERANCE);
  const expectedSelected = tiePolicy === "optimistic" ? tied.at(-1) : tied[0];
  const storedTiedIds = classification?.tiedCenterProfileIds;
  if (
    expectedSelected?.id !== selectedId ||
    classification?.tieDetected !== (tied.length > 1) ||
    !Array.isArray(storedTiedIds) ||
    storedTiedIds.length !== tied.length ||
    storedTiedIds.some((id, index) => id !== tied[index].id) ||
    !isDistance(classification?.distanceToSelectedCenter) ||
    Math.abs(classification.distanceToSelectedCenter - distances[selectedId]) > PROFILE_TOLERANCE ||
    !isPriority(profilePriorities[selectedId])
  ) return false;
  return true;
};

const buildCriterionEvidence = ({ alternativeId, alternativeName, profiles, diagnostics, criterionNames }) => {
  const localByCriterion = diagnostics.localPrioritiesByCriterion;
  const weights = diagnostics.weightsByCriterion;
  const contributions = diagnostics.weightedContributionsByCriterion;
  if (!isRecord(localByCriterion) || !isRecord(weights) || !isRecord(contributions)) return null;
  const criterionIds = Object.keys(localByCriterion);
  const expectedCriterionIds = [...criterionNames.keys()];
  if (
    !criterionIds.length || !expectedCriterionIds.length ||
    !hasExactKeys(localByCriterion, expectedCriterionIds) ||
    !hasExactKeys(weights, expectedCriterionIds) ||
    !hasExactKeys(contributions, expectedCriterionIds)
  ) return null;

  const rows = [];
  for (const criterionId of criterionIds) {
    const local = localByCriterion[criterionId];
    const contribution = contributions[criterionId];
    const criterionName = criterionNames.get(criterionId);
    const localProfilePriorities = local?.profilesById || local?.centralProfilesById;
    const entityOrder = local?.entityOrder;
    const matrix = local?.pairwiseMatrix;
    const localProfileContributions = contribution?.profilesById || contribution?.centralProfilesById;
    const expectedEntityType = profiles[0]?.category ? "centralProfile" : "profile";
    const orderedProfileEntities = Array.isArray(entityOrder) ? entityOrder.slice(1) : [];
    if (
      !criterionName || !isRecord(local) || !isPriority(weights[criterionId]) ||
      !isPriority(local.alternative) || !isRecord(contribution) ||
      typeof contribution.alternative !== "number" || !Number.isFinite(contribution.alternative) ||
      !hasExactKeys(localProfileContributions, profiles.map((profile) => profile.id)) ||
      !profiles.every((profile) => typeof localProfileContributions[profile.id] === "number" && Number.isFinite(localProfileContributions[profile.id])) ||
      !hasExactKeys(localProfilePriorities, profiles.map((profile) => profile.id)) ||
      !profiles.every((profile) => isPriority(localProfilePriorities[profile.id])) ||
      !Array.isArray(entityOrder) || entityOrder.length !== profiles.length + 1 ||
      entityOrder[0]?.entityType !== "alternative" || entityOrder[0]?.alternativeId !== alternativeId ||
      !hasExactKeys(Object.fromEntries(orderedProfileEntities.map((entity) => [entity?.profileId, true])), profiles.map((profile) => profile.id)) ||
      orderedProfileEntities.some((entity) => entity?.entityType !== expectedEntityType) ||
      !Array.isArray(matrix) || matrix.length !== entityOrder.length ||
      matrix.some((row) => !Array.isArray(row) || row.length !== entityOrder.length || row.some((value) => typeof value !== "number" || !Number.isFinite(value) || value <= 0))
    ) return null;

    const entities = entityOrder.map((entity) => {
      if (entity?.entityType === "alternative" && entity?.alternativeId === alternativeId) {
        return { label: alternativeName };
      }
      const profile = profiles.find((entry) => entry.id === entity?.profileId);
      if (!profile) return null;
      return { label: profile.label };
    });
    if (entities.some((entity) => !entity)) return null;

    const consistency = local.consistency;
    if (
      !isRecord(consistency) ||
      typeof consistency.lambdaMax !== "number" || !Number.isFinite(consistency.lambdaMax) ||
      !["consistent", "review", "not_applicable"].includes(consistency.consistencyStatus) ||
      ![null, undefined].includes(consistency.consistencyIndex) && (typeof consistency.consistencyIndex !== "number" || !Number.isFinite(consistency.consistencyIndex)) ||
      ![null, undefined].includes(consistency.randomIndex) && (typeof consistency.randomIndex !== "number" || !Number.isFinite(consistency.randomIndex)) ||
      ![null, undefined].includes(consistency.consistencyRatio) && (typeof consistency.consistencyRatio !== "number" || !Number.isFinite(consistency.consistencyRatio))
    ) return null;
    const ratioIsApplicable = entityOrder.length > 2;
    if (
      (ratioIsApplicable && (
        typeof consistency.consistencyIndex !== "number" ||
        typeof consistency.randomIndex !== "number" || consistency.randomIndex <= 0 ||
        typeof consistency.consistencyRatio !== "number" || consistency.consistencyRatio < 0 ||
        consistency.consistencyStatus !== (consistency.consistencyRatio > CONSISTENCY_REVIEW_THRESHOLD ? "review" : "consistent")
      )) ||
      (!ratioIsApplicable && (
        consistency.consistencyStatus !== "not_applicable" ||
        consistency.consistencyIndex !== null || consistency.randomIndex !== null || consistency.consistencyRatio !== null
      ))
    ) return null;

    rows.push({
      id: criterionId,
      name: criterionName,
      weight: weights[criterionId],
      alternativeLocalPriority: local.alternative,
      profileLocalPriorities: profiles.map((profile) => ({ label: profile.label, value: localProfilePriorities[profile.id] })),
      weightedContribution: contribution.alternative,
      profileWeightedContributions: profiles.map((profile) => ({ label: profile.label, value: localProfileContributions[profile.id] })),
      consistency,
      matrix: { entities, values: matrix },
    });
  }
  return rows;
};

const formatPriority = (value) => value.toFixed(4);
const joinNatural = (items) => items.length < 2 ? (items[0] || "") : items.length === 2
  ? `${items[0]} and ${items[1]}`
  : `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;

const buildLimitingExplanation = ({ alternativeName, category, categories, profiles, profilePriorities, priority }) => {
  const assignedIndex = categories.findIndex((entry) => entry.id === category.id);
  const matchedBoundaries = profiles.filter((profile) => Math.abs(priority - profilePriorities[profile.id]) <= PROFILE_TOLERANCE);
  const assignedBoundary = matchedBoundaries.filter((profile) => profile.upper.id === category.id);
  if (assignedBoundary.length === 1) {
    const matchedBoundary = assignedBoundary[0];
    const preferredCategory = categories[matchedBoundary.upper.order];
    return {
      tie: true,
      text: `${alternativeName} was assigned to ${preferredCategory.label} because its AHP priority (${formatPriority(priority)}) is within the 1e-12 comparison tolerance of the ${matchedBoundary.label} limiting profile (${formatPriority(profilePriorities[matchedBoundary.id])}); ties go to the more preferred category.`,
    };
  }
  if (matchedBoundaries.length > 1) {
    return {
      tie: true,
      text: `${alternativeName} was assigned to ${category.label} under the ordered limiting-profile rule. Its saved priority is within the comparison tolerance of multiple profiles, so no single profile is identified as decisive.`,
    };
  }
  if (assignedIndex === 0) {
    const profile = profiles[0];
    return { tie: false, text: `${alternativeName} was assigned to ${category.label} because its AHP priority (${formatPriority(priority)}) is below the ${profile.label} limiting profile (${formatPriority(profilePriorities[profile.id])}).` };
  }
  if (assignedIndex === categories.length - 1) {
    const profile = profiles.at(-1);
    return { tie: false, text: `${alternativeName} was assigned to ${category.label} because its AHP priority (${formatPriority(priority)}) reaches or exceeds the ${profile.label} limiting profile (${formatPriority(profilePriorities[profile.id])}).` };
  }
  const lowerProfile = profiles[assignedIndex - 1];
  const upperProfile = profiles[assignedIndex];
  return {
    tie: false,
    text: `${alternativeName} was assigned to ${category.label} because its AHP priority (${formatPriority(priority)}) reaches or exceeds the ${lowerProfile.label} profile (${formatPriority(profilePriorities[lowerProfile.id])}) and remains below the ${upperProfile.label} profile (${formatPriority(profilePriorities[upperProfile.id])}).`,
  };
};

const buildCentralExplanation = ({ alternativeName, category, profiles, profilePriorities, classification, priority }) => {
  const tiedProfiles = classification.tiedCenterProfileIds.map((id) => profiles.find((profile) => profile.id === id));
  if (classification.tieDetected) {
    const tieCategories = tiedProfiles.map((profile) => profile.category.label);
    const tiePolicyDescription = classification.tiePolicy === "optimistic"
      ? "the more preferred category"
      : "the less preferred category";
    return {
      tie: true,
      text: `${alternativeName} was equally close to the ${joinNatural(tieCategories)} centers (distance ${formatPriority(classification.distanceToSelectedCenter)}). The ${classification.tiePolicy} tie policy selected ${category.label}, ${tiePolicyDescription}.`,
    };
  }
  const selected = profiles.find((profile) => profile.id === classification.selectedCenterProfileId);
  const centerPriority = profilePriorities[selected.id];
  return {
    tie: false,
    text: `${alternativeName} was assigned to ${category.label} because its AHP priority (${formatPriority(priority)}) is closest to the ${category.label} center (${formatPriority(centerPriority)}; distance ${formatPriority(classification.distanceToSelectedCenter)}).`,
  };
};

const unavailableAlternative = (status, message, alternative, category) => ({
  status,
  message,
  alternative,
  category,
  explanation: null,
  detailsAvailable: false,
  profilePriorities: [],
  criteria: [],
});

/**
 * Build a presentation-only AHPSort I view model from one selected sorting
 * execution. Persisted assignments remain authoritative; contradictory or
 * incomplete diagnostics never replace or hide the generic sorting result.
 */
export const buildAHPSortIEvidence = ({ result, execution, criteria } = {}) => {
  if (!isAHPSortIExecution(execution)) return null;
  const outputDiagnostics = execution?.standardizedOutput?.diagnostics;
  const alternatives = result?.categories?.flatMap((category) => category.alternatives) || [];
  const base = {
    profileMode: null,
    status: "unavailable",
    unavailableReason: "Detailed AHP evidence is not available for this saved execution.",
    alternativesById: {},
    consistencyWarnings: [],
  };
  const unavailableEntries = (status, message) => Object.fromEntries(alternatives.map((alternative) => {
    const assignment = assignmentFor(result, alternative.id);
    return [alternative.id, unavailableAlternative(status, message, alternative, assignment?.category || null)];
  }));

  if (!isRecord(outputDiagnostics)) {
    return { ...base, alternativesById: unavailableEntries("unavailable", base.unavailableReason) };
  }
  if (outputDiagnostics.modelKey !== AHP_SORT_I_API_MODEL_KEY) {
    const reason = "The saved AHP evidence does not match this model execution.";
    return { ...base, status: "integrity_warning", unavailableReason: reason, alternativesById: unavailableEntries("integrity_warning", reason) };
  }
  const mode = outputDiagnostics.profileMode;
  if (mode !== "limiting" && mode !== "central") {
    const reason = "The saved AHPSort I profile mode is unavailable.";
    return { ...base, status: "integrity_warning", unavailableReason: reason, alternativesById: unavailableEntries("integrity_warning", reason) };
  }

  const categories = asArray(result?.categories).map(({ id, label, order }) => ({ id, label, order }))
    .sort((left, right) => left.order - right.order);
  const modelParameters = resolveModelParameters(execution);
  if (!storedCategoriesMatchSnapshot(categories, modelParameters)) {
    const reason = "The saved category configuration does not match this classification.";
    return { ...base, profileMode: mode, status: "integrity_warning", unavailableReason: reason, alternativesById: unavailableEntries("integrity_warning", reason) };
  }
  const resolvedProfiles = resolveProfiles({ mode, categories, modelParameters });
  if (!resolvedProfiles.profiles) {
    return { ...base, profileMode: mode, unavailableReason: resolvedProfiles.reason, alternativesById: unavailableEntries("unavailable", resolvedProfiles.reason) };
  }
  const profiles = resolvedProfiles.profiles;
  const diagnosticsByAlternative = outputDiagnostics.resultsByAlternativeId;
  if (!isRecord(diagnosticsByAlternative)) {
    return { ...base, profileMode: mode, alternativesById: unavailableEntries("unavailable", base.unavailableReason) };
  }
  const criterionNames = resolveCriterionNames(execution?.requestSnapshot?.context?.criteria ?? criteria);
  const alternativesById = {};
  const consistencyWarnings = [];

  for (const alternative of alternatives) {
    const assignment = assignmentFor(result, alternative.id);
    const diagnostics = diagnosticsByAlternative[alternative.id];
    if (!assignment || !isRecord(diagnostics)) {
      alternativesById[alternative.id] = unavailableAlternative("unavailable", base.unavailableReason, alternative, assignment?.category || null);
      continue;
    }
    if (diagnostics.categoryId !== assignment.category.id) {
      const reason = "The saved AHP diagnostics do not agree with this stored category assignment.";
      alternativesById[alternative.id] = unavailableAlternative("integrity_warning", reason, alternative, assignment.category);
      continue;
    }
    const priority = diagnostics.globalPriority;
    const profilePriorities = diagnostics.profileGlobalPrioritiesById;
    if (!isPriority(priority) || !hasExactKeys(profilePriorities, profiles.map((profile) => profile.id)) || !profiles.every((profile) => isPriority(profilePriorities[profile.id]))) {
      alternativesById[alternative.id] = unavailableAlternative("unavailable", base.unavailableReason, alternative, assignment.category);
      continue;
    }

    const classification = diagnostics.classification;
    const expectedRule = mode === "limiting" ? LIMITING_ASSIGNMENT_RULE : CENTRAL_ASSIGNMENT_RULE;
    if (!isRecord(classification) || classification.rule !== expectedRule) {
      const reason = "The saved AHP classification evidence is incomplete.";
      alternativesById[alternative.id] = unavailableAlternative("unavailable", reason, alternative, assignment.category);
      continue;
    }

    let validClassification = false;
    if (mode === "limiting") {
      const profilesAreOrdered = profiles.every((profile, index) => index === 0 ||
        profilePriorities[profile.id] - profilePriorities[profiles[index - 1].id] > PROFILE_TOLERANCE);
      const expectedCategory = limitingCategoryFor({ priority, profiles, profilePriorities, categories });
      validClassification = profilesAreOrdered && expectedCategory?.id === assignment.category.id;
    } else {
      const rootTiePolicy = outputDiagnostics.tiePolicy;
      validClassification = rootTiePolicy === resolvedProfiles.tiePolicy && validateCentralClassification({
        classification,
        assignmentCategory: assignment.category,
        profiles,
        profilePriorities,
        rootTiePolicy,
        alternativePriority: priority,
      });
    }
    if (!validClassification) {
      const reason = "The saved AHP diagnostics do not agree with this stored category assignment.";
      alternativesById[alternative.id] = unavailableAlternative("integrity_warning", reason, alternative, assignment.category);
      continue;
    }

    const profileEvidence = profiles.map((profile) => ({
      id: profile.id,
      label: mode === "central" ? `${profile.category.label} center` : `${profile.label} boundary`,
      categoryLabel: mode === "central" ? profile.category.label : null,
      priority: profilePriorities[profile.id],
      distance: mode === "central" ? classification.centerDistancesByProfileId[profile.id] : null,
      selected: mode === "central" && classification.selectedCenterProfileId === profile.id,
      tied: mode === "central" && classification.tiedCenterProfileIds.includes(profile.id),
    }));
    const explanation = mode === "limiting"
      ? buildLimitingExplanation({ alternativeName: alternative.name, category: assignment.category, categories, profiles, profilePriorities, priority })
      : buildCentralExplanation({ alternativeName: alternative.name, category: assignment.category, profiles, profilePriorities, classification, priority });
    const criterionEvidence = buildCriterionEvidence({ alternativeId: alternative.id, alternativeName: alternative.name, profiles, diagnostics, criterionNames });
    for (const row of criterionEvidence || []) {
      if (typeof row.consistency.consistencyRatio === "number" && row.consistency.consistencyRatio > CONSISTENCY_REVIEW_THRESHOLD) {
        consistencyWarnings.push({ alternativeId: alternative.id, alternativeName: alternative.name, criterionName: row.name, consistencyRatio: row.consistency.consistencyRatio });
      }
    }
    alternativesById[alternative.id] = {
      status: "available",
      message: null,
      alternative,
      category: assignment.category,
      explanation: explanation.text,
      tieDetected: explanation.tie,
      profileMode: mode,
      globalPriority: priority,
      profilePriorities: profileEvidence,
      tiePolicy: mode === "central" ? classification.tiePolicy : null,
      selectedCenterProfileId: mode === "central" ? classification.selectedCenterProfileId : null,
      criteria: criterionEvidence || [],
      detailsAvailable: Boolean(criterionEvidence),
      detailsUnavailableReason: criterionEvidence ? null : "Detailed local matrices and consistency diagnostics are not available for this result.",
    };
  }

  const anyIntegrityWarning = Object.values(alternativesById).some((entry) => entry.status === "integrity_warning");
  const allUnavailable = Object.values(alternativesById).length > 0 &&
    Object.values(alternativesById).every((entry) => entry.status === "unavailable");
  return {
    profileMode: mode,
    status: anyIntegrityWarning ? "integrity_warning" : allUnavailable ? "unavailable" : "available",
    unavailableReason: anyIntegrityWarning
      ? "Some saved AHP diagnostics do not agree with the stored classifications."
      : allUnavailable
        ? Object.values(alternativesById)[0]?.message || base.unavailableReason
        : null,
    alternativesById,
    consistencyWarnings,
  };
};

const hasExactStringKeys = (record, expected) => isRecord(record) && hasExactKeys(record, expected);
const stableExpertReference = (index) => `Expert ${index + 1}`;

const buildIndividualGroupEvidence = ({ result, execution, criteria, categories, alternatives, individualResults }) => {
  const alternativesById = Object.fromEntries(alternatives.map((alternative) => [alternative.id, null]));
  const evidenceByExpertId = {};
  const issues = [];
  const expectedAlternativeIds = alternatives.map(({ id }) => id);

  for (const expertId of Object.keys(individualResults).sort()) {
    const expertDiagnostics = individualResults[expertId];
    if (
      !isRecord(expertDiagnostics) ||
      expertDiagnostics.modelKey !== AHP_SORT_I_API_MODEL_KEY ||
      !hasExactStringKeys(expertDiagnostics.resultsByAlternativeId, expectedAlternativeIds)
    ) {
      issues.push("Some individual expert classifications are incomplete.");
      continue;
    }

    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const individualCategories = categories.map((category) => ({ ...category, alternatives: [] }));
    const individualCategoryByAlternative = new Map();
    let valid = true;
    for (const alternative of alternatives) {
      const assignment = expertDiagnostics.resultsByAlternativeId[alternative.id];
      const category = categoriesById.get(assignment?.categoryId);
      if (!category) {
        valid = false;
        break;
      }
      individualCategoryByAlternative.set(alternative.id, category.id);
      individualCategories.find((entry) => entry.id === category.id).alternatives.push(alternative);
    }
    if (!valid) {
      issues.push("An expert classification refers to a category that is not configured.");
      continue;
    }

    const individualExecution = {
      ...execution,
      standardizedOutput: {
        ...execution.standardizedOutput,
        diagnostics: expertDiagnostics,
      },
    };
    const individualResult = {
      ...result,
      categories: individualCategories,
      assignmentCount: alternatives.length,
    };
    const evidence = buildAHPSortIEvidence({
      result: individualResult,
      execution: individualExecution,
      criteria,
    });
    if (!evidence || evidence.status !== "available") {
      issues.push("Some individual AHPSort I evidence does not match its expert classification.");
    }
    evidenceByExpertId[expertId] = {
      evidence,
      categoryByAlternativeId: Object.fromEntries(individualCategoryByAlternative),
    };
    for (const alternative of alternatives) {
      alternativesById[alternative.id] ??= {};
      alternativesById[alternative.id][expertId] = evidence?.alternativesById?.[alternative.id] ?? null;
    }
  }

  return { alternativesById, evidenceByExpertId, issues };
};

/**
 * Validate and present persisted GAHPSort group diagnostics without changing
 * sorting assignments or deriving replacement votes. Individual evidence is
 * checked against each expert's own stored category.
 */
export const buildAHPSortIGroupEvidence = ({ result, execution, criteria } = {}) => {
  if (!isAHPSortIExecution(execution)) return null;
  const diagnostics = execution?.standardizedOutput?.diagnostics;
  const isGroupCandidate = diagnostics?.aggregationMethod === "unweighted_plurality_vote" ||
    isRecord(diagnostics?.individualResultsByExpertId) ||
    (Array.isArray(execution?.expertRoster) && execution.expertRoster.length > 1) ||
    isRecord(resolveModelParameters(execution)?.ahpSortGroup) ||
    Object.values(isRecord(diagnostics?.resultsByAlternativeId) ? diagnostics.resultsByAlternativeId : {})
      .some((entry) => isRecord(entry?.votesByCategoryId) || isRecord(entry?.classificationsByExpertId));
  if (!isGroupCandidate) return null;

  const alternatives = result?.categories?.flatMap((category) => category.alternatives) || [];
  const categories = asArray(result?.categories).map(({ id, label, order }) => ({ id, label, order }))
    .sort((left, right) => left.order - right.order);
  const categoryIds = categories.map(({ id }) => id);
  const alternativeIds = alternatives.map(({ id }) => id);
  const individualResults = diagnostics?.individualResultsByExpertId;
  const expertIds = isRecord(individualResults) ? Object.keys(individualResults).sort() : [];
  const messages = [];
  const addIssue = (message) => { if (!messages.includes(message)) messages.push(message); };
  const parameters = resolveModelParameters(execution);

  if (diagnostics?.modelKey !== AHP_SORT_I_API_MODEL_KEY) addIssue("The saved group diagnostics do not match AHPSort I.");
  const groupMethodValid = diagnostics?.aggregationMethod === "unweighted_plurality_vote";
  if (!groupMethodValid) addIssue("The saved group voting method is unavailable or unsupported.");
  if (diagnostics?.profileMode !== "limiting" && diagnostics?.profileMode !== "central") addIssue("The saved AHPSort I profile method is unavailable.");
  if (diagnostics?.profileMode !== parameters?.ahpSortProfiles?.mode) addIssue("The saved profile method does not match this execution's configuration.");
  if (!storedCategoriesMatchSnapshot(categories, parameters)) addIssue("The saved categories do not match this classification.");
  if (diagnostics?.profileMode === "central" && diagnostics?.profileTiePolicy !== parameters?.ahpSortProfiles?.tiePolicy) {
    addIssue("The saved equal-distance preference does not match this execution's diagnostics.");
  }
  if (
    !isRecord(parameters?.ahpSortGroup) ||
    Object.keys(parameters.ahpSortGroup).length !== 1 ||
    parameters.ahpSortGroup.tiePolicy !== diagnostics?.groupTiePolicy
  ) {
    addIssue("The saved group tie preference does not match this execution's diagnostics.");
  }
  if (!isRecord(individualResults) || expertIds.length < 2) addIssue("Complete individual expert classifications are not available.");
  if (expertIds.some((id) => !nonEmptyString(id)) || new Set(expertIds).size !== expertIds.length) {
    addIssue("The saved individual classifications contain invalid expert identifiers.");
  }
  const groupPolicyValid = diagnostics?.groupTiePolicy === "optimistic" || diagnostics?.groupTiePolicy === "pessimistic";
  if (!groupPolicyValid) addIssue("The saved group tie preference is unavailable.");

  const roster = execution?.expertRoster;
  let rosterUsable = Array.isArray(roster) && roster.length > 0 &&
    roster.every((expert) => nonEmptyString(expert?.id)) &&
    new Set(roster.map((expert) => expert.id)).size === roster.length;
  if (!rosterUsable) {
    addIssue("The saved expert roster is unavailable, so historical participation cannot be fully verified.");
  } else if (expertIds.length !== roster.length || expertIds.some((id) => !roster.some((expert) => expert.id === id))) {
    addIssue("The saved individual classifications do not match the experts recorded for this execution.");
    rosterUsable = false;
  }

  const experts = expertIds.map((id, index) => {
    const rosterEntry = rosterUsable ? roster.find((entry) => entry.id === id) : null;
    return {
      id,
      name: nonEmptyString(rosterEntry?.name) || stableExpertReference(index),
    };
  });
  const individualEvidence = isRecord(individualResults)
    ? buildIndividualGroupEvidence({ result, execution, criteria, categories, alternatives, individualResults })
    : { alternativesById: {}, evidenceByExpertId: {}, issues: [] };
  individualEvidence.issues.forEach(addIssue);

  const collectiveDiagnostics = diagnostics?.resultsByAlternativeId;
  if (!hasExactStringKeys(collectiveDiagnostics, alternativeIds)) addIssue("The saved group vote diagnostics do not cover every alternative.");

  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const alternativesById = {};
  for (const alternative of alternatives) {
    const assignment = assignmentFor(result, alternative.id);
    const vote = collectiveDiagnostics?.[alternative.id];
    const classifications = vote?.classificationsByExpertId;
    const voteCounts = vote?.votesByCategoryId;
    let voteValid = groupMethodValid && groupPolicyValid && diagnostics?.modelKey === AHP_SORT_I_API_MODEL_KEY && Boolean(assignment) &&
      nonEmptyString(vote?.categoryId) === assignment?.category.id &&
      nonEmptyString(vote?.selectedCategoryId) === assignment?.category.id &&
      hasExactStringKeys(classifications, expertIds) &&
      hasExactStringKeys(voteCounts, categoryIds);

    let expectedCounts = null;
    let tiedCategoryIds = [];
    let selectedByRule = null;
    let maxCount = 0;
    if (voteValid) {
      expectedCounts = Object.fromEntries(categoryIds.map((id) => [id, 0]));
      for (const id of expertIds) {
        const classifiedCategoryId = classifications[id];
        const individualCategoryId = individualResults?.[id]?.resultsByAlternativeId?.[alternative.id]?.categoryId;
        if (!categoriesById.has(classifiedCategoryId) || classifiedCategoryId !== individualCategoryId) {
          voteValid = false;
          break;
        }
        expectedCounts[classifiedCategoryId] += 1;
      }
      if (voteValid) {
        voteValid = categoryIds.every((id) => Number.isInteger(voteCounts[id]) && voteCounts[id] >= 0 && voteCounts[id] === expectedCounts[id]) &&
          Object.values(voteCounts).reduce((sum, count) => sum + count, 0) === expertIds.length;
      }
      if (voteValid) {
        maxCount = Math.max(...categoryIds.map((id) => voteCounts[id]));
        tiedCategoryIds = categories.filter((category) => voteCounts[category.id] === maxCount).map(({ id }) => id);
        selectedByRule = tiedCategoryIds.length > 1
          ? tiedCategoryIds.at(-1 * (diagnostics.groupTiePolicy === "optimistic" ? 1 : tiedCategoryIds.length))
          : tiedCategoryIds[0];
        const expectedStatus = maxCount === expertIds.length
          ? "unanimous"
          : tiedCategoryIds.length > 1
            ? "tied_plurality"
            : "unique_plurality";
        const expectedTiePolicy = tiedCategoryIds.length > 1 ? diagnostics.groupTiePolicy : null;
        const recordedTies = vote.tiedCategoryIds;
        const expectedRecordedTies = tiedCategoryIds.length > 1 ? tiedCategoryIds : [];
        voteValid = selectedByRule === assignment.category.id &&
          vote.aggregationStatus === expectedStatus &&
          vote.isUnanimous === (expectedStatus === "unanimous") &&
          vote.isUniquePlurality === (tiedCategoryIds.length === 1) &&
          vote.tieDetected === (tiedCategoryIds.length > 1) &&
          Array.isArray(recordedTies) && recordedTies.length === expectedRecordedTies.length &&
          recordedTies.every((id, index) => id === expectedRecordedTies[index]) &&
          (expectedTiePolicy === null ? vote.tiePolicy === null : vote.tiePolicy === expectedTiePolicy);
      }
    }

    if (!voteValid) addIssue(`The saved vote evidence for ${alternative.name} does not agree with its classification.`);
    const countsForDisplay = voteValid
      ? categories.map((category) => ({ id: category.id, label: category.label, count: voteCounts[category.id] }))
      : null;
    alternativesById[alternative.id] = {
      alternativeName: alternative.name,
      category: assignment?.category ?? null,
      voteValid,
      participantCount: expertIds.length,
      votes: countsForDisplay,
      aggregationStatus: voteValid ? vote.aggregationStatus : null,
      isAbsoluteMajority: voteValid && tiedCategoryIds.length === 1 && maxCount > expertIds.length / 2,
      tiedCategoryLabels: voteValid && tiedCategoryIds.length > 1
        ? tiedCategoryIds.map((id) => categoriesById.get(id).label)
        : [],
      tiePolicy: voteValid && tiedCategoryIds.length > 1 ? diagnostics.groupTiePolicy : null,
      individualClassifications: experts.map((expert) => ({
        ...expert,
        category: categoriesById.get(individualEvidence.alternativesById?.[alternative.id]?.[expert.id]?.category?.id ||
          individualEvidence.evidenceByExpertId?.[expert.id]?.categoryByAlternativeId?.[alternative.id]) || null,
        evidence: individualEvidence.alternativesById?.[alternative.id]?.[expert.id] || null,
      })),
    };
  }

  const evidenceStatus = messages.length ? "integrity_warning" : "available";
  return {
    profileMode: diagnostics?.profileMode || null,
    aggregationMethod: diagnostics?.aggregationMethod || null,
    groupTiePolicy: diagnostics?.groupTiePolicy || null,
    status: evidenceStatus,
    unavailableReason: messages.length ? messages.join(" ") : null,
    expertCount: expertIds.length,
    experts,
    alternativesById,
    individualEvidenceByExpertId: individualEvidence.evidenceByExpertId,
  };
};

export const buildAHPSortIFindings = (result) => {
  if (!result?.available) return [];
  const findings = [];
  const groupEvidence = result.ahpSortIGroup;
  if (groupEvidence) {
    const groupAlternatives = Object.values(groupEvidence.alternativesById || {});
    const headlineFor = (entries) => {
      const names = entries.map((entry) => entry.alternativeName).filter(Boolean);
      return names.length > 3
        ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} others`
        : names.join(", ");
    };
    const unanimousCount = groupAlternatives.filter((entry) => entry?.voteValid && entry.aggregationStatus === "unanimous").length;
    const majorityCount = groupAlternatives.filter((entry) => entry?.voteValid && entry.aggregationStatus === "unique_plurality" && entry.isAbsoluteMajority).length;
    const pluralityCount = groupAlternatives.filter((entry) => entry?.voteValid && entry.aggregationStatus === "unique_plurality" && !entry.isAbsoluteMajority).length;
    const tieCount = groupAlternatives.filter((entry) => entry?.voteValid && entry.aggregationStatus === "tied_plurality").length;
    const differingCount = groupAlternatives.filter((entry) => entry?.individualClassifications?.map((item) => item.category?.id).filter(Boolean).filter((id, index, ids) => ids.indexOf(id) === index).length > 1).length;
    const namesBy = (predicate) => groupAlternatives.filter((entry) => entry?.voteValid && predicate(entry));
    if (unanimousCount) findings.push({ kind: "ahpsort_group_unanimous", title: "Unanimous classifications", headline: headlineFor(namesBy((entry) => entry.aggregationStatus === "unanimous")), text: "Every participating expert assigned these alternatives to the same category." });
    if (majorityCount) findings.push({ kind: "ahpsort_group_majority", title: "Absolute majority", headline: headlineFor(namesBy((entry) => entry.aggregationStatus === "unique_plurality" && entry.isAbsoluteMajority)), text: "The selected category received more than half of the expert votes." });
    if (pluralityCount) findings.push({ kind: "ahpsort_group_plurality", title: "Unique plurality", headline: headlineFor(namesBy((entry) => entry.aggregationStatus === "unique_plurality" && !entry.isAbsoluteMajority)), text: "The selected category received more votes than any other category, without an absolute majority." });
    if (tieCount) findings.push({ kind: "ahpsort_group_tie", title: "Group vote tie-break", headline: headlineFor(namesBy((entry) => entry.aggregationStatus === "tied_plurality")), text: `The saved ${groupEvidence.groupTiePolicy} preference resolved ties between categories with the same maximum vote count.` });
    if (differingCount) findings.push({ kind: "ahpsort_group_differences", title: "Different expert classifications", headline: headlineFor(groupAlternatives.filter((entry) => entry?.individualClassifications?.map((item) => item.category?.id).filter(Boolean).filter((id, index, ids) => ids.indexOf(id) === index).length > 1)), text: "Experts assigned these alternatives to different categories." });

    const individualEntries = Object.values(groupEvidence.individualEvidenceByExpertId || {});
    const individualAlternatives = individualEntries.flatMap((entry) => Object.values(entry?.evidence?.alternativesById || {}));
    const individualTies = individualAlternatives.filter((entry) => entry.status === "available" && entry.profileMode === "central" && entry.tieDetected);
    if (individualTies.length) findings.push({
      kind: "ahp_profile_tie",
      title: "Central-profile tie",
      headline: `${individualTies.length} individual ${individualTies.length === 1 ? "classification" : "classifications"}`,
      text: "The saved equal-distance preference was used for these individual classifications.",
    });
    const consistencyWarningCount = individualEntries.reduce((sum, entry) => sum + asArray(entry?.evidence?.consistencyWarnings).length, 0);
    if (consistencyWarningCount) findings.push({
      kind: "ahp_consistency",
      title: "AHP consistency review",
      headline: `${consistencyWarningCount} individual ${consistencyWarningCount === 1 ? "matrix" : "matrices"} above CR 0.10`,
      text: "Reviewing the related judgments may be useful. This warning does not mean a classification is incorrect.",
    });
    return findings;
  }

  const evidence = result.ahpSortI;
  const ties = Object.values(evidence?.alternativesById || {}).filter((entry) =>
    entry.status === "available" && entry.profileMode === "central" && entry.tieDetected,
  );
  if (ties.length) {
    const names = ties.slice(0, 3).map((entry) => entry.alternative.name);
    if (ties.length > 3) names.push("others");
    findings.push({
      kind: "ahp_profile_tie",
      title: "Central-profile tie",
      headline: names.join(", "),
      text: "The saved tie policy was used to choose the assigned category for these alternatives.",
    });
  }
  const warningCount = asArray(evidence?.consistencyWarnings).length;
  if (warningCount) {
    findings.push({
      kind: "ahp_consistency",
      title: "AHP consistency review",
      headline: `${warningCount} local ${warningCount === 1 ? "matrix" : "matrices"} above CR 0.10`,
      text: "Reviewing the related judgments may be useful. This warning does not mean the classification is incorrect.",
    });
  }
  return findings;
};
