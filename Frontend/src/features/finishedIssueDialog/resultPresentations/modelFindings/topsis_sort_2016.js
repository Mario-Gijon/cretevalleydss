const asArray = (value) => Array.isArray(value) ? value : [];
const nonEmptyString = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// Closeness values are persisted as IEEE-754 doubles in [0, 1]. Four machine
// epsilons cover rounding in the two subtractions and the final comparison;
// larger differences remain distinct instead of becoming arbitrary ties.
const areNumericallyTied = (left, right) => Math.abs(left - right)
  <= 4 * Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right));

const readModelParameters = (execution) => execution?.modelParameters
  || execution?.model?.effectiveParameters
  || execution?.model?.configuredParameters
  || {};

const hasExactKeys = (record, expectedIds) => {
  const actual = Object.keys(record).sort();
  const expected = [...expectedIds].sort();
  return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
};

const readTopsisSortBoundaryEvidence = (result, execution) => {
  const diagnostics = execution?.standardizedOutput?.diagnostics;
  const alternativeCloseness = diagnostics?.closeness_by_alternative_id;
  const profileCloseness = diagnostics?.closeness_by_profile_id;
  const categoriesByOrder = [...result.categories].sort((left, right) => left.order - right.order);
  const rawProfiles = readModelParameters(execution)?.boundaryProfiles?.profiles;

  if (!isRecord(diagnostics) || !isRecord(alternativeCloseness) || !isRecord(profileCloseness)
    || !Array.isArray(rawProfiles) || categoriesByOrder.length < 2
    || rawProfiles.length !== categoriesByOrder.length - 1) return null;

  const categoryByAlternativeId = new Map();
  for (const category of categoriesByOrder) {
    for (const alternative of asArray(category.alternatives)) {
      categoryByAlternativeId.set(alternative.id, { alternative, category });
    }
  }
  const alternativeIds = [...categoryByAlternativeId.keys()];
  const profilesByOrder = new Map();
  for (const profile of rawProfiles) {
    const profileId = nonEmptyString(profile?.profileId);
    const categoryId = nonEmptyString(profile?.categoryId);
    const categoryOrder = categoriesByOrder.find((category) => category.id === categoryId)?.order;
    if (!profileId || !categoryId || !Number.isInteger(categoryOrder) || categoryOrder < 1 || profilesByOrder.has(categoryOrder)) return null;
    profilesByOrder.set(categoryOrder, { id: profileId, categoryOrder });
  }

  const expectedProfileOrders = categoriesByOrder.slice(1).map(({ order }) => order);
  if (expectedProfileOrders.some((order) => !profilesByOrder.has(order))) return null;
  const profileIds = expectedProfileOrders.map((order) => profilesByOrder.get(order).id);
  if (new Set(profileIds).size !== profileIds.length) return null;
  if (!hasExactKeys(alternativeCloseness, alternativeIds) || !hasExactKeys(profileCloseness, profileIds)) return null;

  const coefficient = (record, id) => {
    const value = record[id];
    return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
  };
  const alternatives = alternativeIds.map((id) => ({
    ...categoryByAlternativeId.get(id),
    value: coefficient(alternativeCloseness, id),
  }));
  const profiles = expectedProfileOrders.map((order) => ({
    ...profilesByOrder.get(order),
    lower: categoriesByOrder.find((category) => category.order === order - 1),
    upper: categoriesByOrder.find((category) => category.order === order),
    value: coefficient(profileCloseness, profilesByOrder.get(order).id),
  }));
  if (alternatives.some(({ value }) => value === null)
    || profiles.some(({ lower, upper, value }) => !lower || !upper || value === null)) return null;

  // Eq. (8) requires ordered limiting profiles and strict intervals. Refuse
  // stale or inconsistent diagnostics rather than describing a false boundary.
  if (profiles.some((profile, index) => index > 0 && profile.value <= profiles[index - 1].value)) return null;
  for (const { value, category } of alternatives) {
    if (profiles.some((profile) => value === profile.value)) return null;
    let intervalOrder = null;
    if (value < profiles[0].value) intervalOrder = 0;
    else if (value > profiles.at(-1).value) intervalOrder = categoriesByOrder.length - 1;
    else {
      for (let index = 1; index < profiles.length; index += 1) {
        if (profiles[index - 1].value < value && value < profiles[index].value) {
          intervalOrder = index;
          break;
        }
      }
    }
    if (intervalOrder === null || intervalOrder !== category.order) return null;
  }

  return { alternatives, categoriesByOrder, profiles };
};

const readClosestBoundaries = (result, execution) => {
  const evidence = readTopsisSortBoundaryEvidence(result, execution);
  if (!evidence) return null;
  const { alternatives, profiles } = evidence;
  let minimumDifference = Number.POSITIVE_INFINITY;
  for (const { value } of alternatives) {
    for (const profile of profiles) minimumDifference = Math.min(minimumDifference, Math.abs(value - profile.value));
  }
  if (!Number.isFinite(minimumDifference)) return null;

  const closest = [];
  for (const entry of alternatives) {
    for (const profile of profiles) {
      const difference = Math.abs(entry.value - profile.value);
      if (areNumericallyTied(difference, minimumDifference)) {
        closest.push({
          alternative: entry.alternative,
          category: entry.category,
          lower: profile.lower,
          upper: profile.upper,
        });
      }
    }
  }
  return closest;
};

/**
 * Return the strict closeness interval for each category only when the
 * selected execution has complete, ordered profile evidence consistent with
 * its stored assignments. Missing or stale diagnostics produce no intervals.
 */
export const buildTopsisSortCategoryIntervals = (result, execution) => {
  const evidence = readTopsisSortBoundaryEvidence(result, execution);
  if (!evidence) return null;

  const { categoriesByOrder, profiles } = evidence;
  const profileByCategoryOrder = new Map(profiles.map((profile) => [profile.categoryOrder, profile]));
  const highestOrder = categoriesByOrder.at(-1)?.order;
  if (!Number.isInteger(highestOrder)) return null;

  return new Map(categoriesByOrder.map((category) => {
    const lower = category.order === 0 ? null : profileByCategoryOrder.get(category.order);
    const upper = category.order === highestOrder ? null : profileByCategoryOrder.get(category.order + 1);
    if ((category.order > 0 && !lower) || (category.order < highestOrder && !upper)) return [category.id, null];
    return [category.id, {
      lower: lower?.value ?? null,
      upper: upper?.value ?? null,
    }];
  }));
};

const joinNatural = (items) => {
  if (items.length < 2) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
};

const nameAlternatives = (alternatives) => {
  const names = alternatives.slice(0, 3).map(({ name }) => name);
  if (alternatives.length > 3) names.push("others");
  return joinNatural(names);
};

const buildMostFavorableFinding = (category) => {
  if (category.alternatives.length === 1) {
    return {
      kind: "most_favorable_classification",
      title: "Most favorable classification",
      headline: category.label,
      text: `${category.alternatives[0].name} received the most favorable classification in this evaluation, placing it in the ${category.label} category.`,
    };
  }
  return {
    kind: "most_favorable_classification",
    title: "Most favorable classification",
    headline: category.label,
    text: `${nameAlternatives(category.alternatives)} received the most favorable classification in this evaluation, placing them in the ${category.label} category.`,
  };
};

const buildLeastFavorableFinding = (category) => {
  const subject = nameAlternatives(category.alternatives);
  const verb = category.alternatives.length === 1 ? "was" : "were";
  return {
    kind: "least_favorable_classification",
    title: "Least favorable classification",
    headline: category.label,
    text: `At the other end, ${subject} ${verb} placed in the ${category.label} category, receiving the least favorable classification in this evaluation.`,
  };
};

const describeBoundary = ({ lower, upper }) => `the dividing line between ${lower.label} and ${upper.label}`;

const groupClosestByAlternative = (closest) => {
  const groups = new Map();
  for (const entry of closest) {
    const group = groups.get(entry.alternative.id) || { alternative: entry.alternative, category: entry.category, boundaries: [] };
    group.boundaries.push(entry);
    groups.set(entry.alternative.id, group);
  }
  return [...groups.values()];
};

const describeAlternativeBoundaries = (group) => {
  const descriptions = group.boundaries.slice(0, 2).map(describeBoundary);
  if (group.boundaries.length === 1) {
    return `${group.alternative.name}, classified as ${group.category.label}, is closest to ${descriptions[0]}`;
  }
  const suffix = group.boundaries.length > descriptions.length ? ", among other category boundaries" : "";
  return `${group.alternative.name}, classified as ${group.category.label}, is equally close to ${joinNatural(descriptions)}${suffix}`;
};

const buildClosestBoundaryFinding = (closest) => {
  const groups = groupClosestByAlternative(closest);
  if (groups.length === 1) {
    const [group] = groups;
    const boundaries = group.boundaries.slice(0, 2).map(describeBoundary);
    const more = group.boundaries.length > boundaries.length ? ", among other category boundaries" : "";
    const boundaryText = group.boundaries.length === 1
      ? boundaries[0]
      : `${joinNatural(boundaries)}${more}`;
    const relation = group.boundaries.length === 1 ? "is closest to" : "is equally close to";
    return {
      kind: "closest_boundary",
      title: "Closest category boundary",
      headline: group.boundaries.length === 1
        ? `${group.boundaries[0].lower.label} / ${group.boundaries[0].upper.label}`
        : "Equally close to multiple boundaries",
      text: `Among the evaluated alternatives, ${group.alternative.name} was classified as ${group.category.label} and ${relation} ${boundaryText}.`,
    };
  }

  const descriptions = groups.slice(0, 2).map(describeAlternativeBoundaries);
  const more = groups.length > descriptions.length ? ", among others," : "";
  return {
    kind: "closest_boundary",
    title: "Closest category boundary",
    headline: "Several results share the closest proximity",
    text: `${joinNatural(descriptions)}${more}. These alternatives share the closest proximity to category boundaries.`,
  };
};

export const buildTopsisSort2016Findings = (result, execution) => {
  if (!result?.available) return [];
  const nonEmptyCategories = result.categories.filter((category) => category.alternatives.length > 0);
  if (!nonEmptyCategories.length) return [];

  const mostFavorable = nonEmptyCategories[0];
  const leastFavorable = nonEmptyCategories.at(-1);
  if (mostFavorable.id === leastFavorable.id) {
    const text = result.assignmentCount === 1
      ? `${mostFavorable.alternatives[0].name} was placed in the ${mostFavorable.label} category; a single alternative does not establish category differences.`
      : `All evaluated alternatives share the ${mostFavorable.label} category, so this evaluation does not establish category differences among them.`;
    return [{
      kind: "most_favorable_classification",
      title: "Most favorable classification",
      headline: mostFavorable.label,
      text,
    }];
  }

  const findings = [buildMostFavorableFinding(mostFavorable)];
  const closest = readClosestBoundaries(result, execution);
  if (closest) findings.push(buildClosestBoundaryFinding(closest));
  findings.push(buildLeastFavorableFinding(leastFavorable));
  return findings;
};

export const isTopsisSort2016Execution = (execution) => {
  const apiModelKey = [
    execution?.modelSpecificOutput?.apiModelKey,
    execution?.model?.technical?.apiModelKey,
    execution?.model?.apiModelKey,
  ].find((value) => nonEmptyString(value));
  return apiModelKey === "topsis_sort_2016";
};

export default buildTopsisSort2016Findings;
