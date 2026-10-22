const asArray = (value) => Array.isArray(value) ? value : [];
const nonEmptyString = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const plural = (count, singular, multiple = `${singular}s`) => count === 1 ? singular : multiple;

const readModelParameters = (execution) => execution?.modelParameters
  || execution?.model?.effectiveParameters
  || execution?.model?.configuredParameters
  || {};

const readClosestBoundary = (result, execution) => {
  const diagnostics = execution?.standardizedOutput?.diagnostics;
  const alternativeCloseness = diagnostics?.closeness_by_alternative_id;
  const profileCloseness = diagnostics?.closeness_by_profile_id;
  const categoriesByOrder = [...result.categories].sort((left, right) => left.order - right.order);
  const rawProfiles = readModelParameters(execution)?.boundaryProfiles?.profiles;

  if (!isRecord(diagnostics) || !isRecord(alternativeCloseness) || !isRecord(profileCloseness)
    || !Array.isArray(rawProfiles) || categoriesByOrder.length < 2
    || rawProfiles.length !== categoriesByOrder.length - 1) return null;

  const alternativeById = new Map();
  for (const category of result.categories) {
    for (const alternative of asArray(category.alternatives)) alternativeById.set(alternative.id, alternative);
  }
  const alternativeIds = [...alternativeById.keys()];
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
  const alternatives = alternativeIds.map((id) => ({ alternative: alternativeById.get(id), value: coefficient(alternativeCloseness, id) }));
  const profiles = expectedProfileOrders.map((order) => ({
    profile: profilesByOrder.get(order),
    lower: categoriesByOrder.find((category) => category.order === order - 1),
    upper: categoriesByOrder.find((category) => category.order === order),
    value: coefficient(profileCloseness, profilesByOrder.get(order).id),
  }));
  if (alternatives.some(({ value }) => value === null) || profiles.some(({ lower, upper, value }) => !lower || !upper || value === null)) return null;

  const candidates = alternatives.flatMap(({ alternative, value }) => profiles.map(({ lower, upper, value: profileValue }) => ({
    alternative,
    lowerCategory: lower.label,
    upperCategory: upper.label,
    difference: Math.abs(value - profileValue),
  })));
  if (!candidates.length) return null;
  const smallestDifference = Math.min(...candidates.map(({ difference }) => difference));
  return candidates.filter(({ difference }) => difference === smallestDifference);
};

const hasExactKeys = (record, expectedIds) => {
  const actual = Object.keys(record).sort();
  const expected = [...expectedIds].sort();
  return actual.length === expected.length && actual.every((id, index) => id === expected[index]);
};

const formatDifference = (value) => Number(value.toPrecision(4)).toString();

const buildBoundaryFinding = (result, execution, representedCategories) => {
  if (representedCategories.length < 2) {
    const category = representedCategories[0];
    return {
      kind: "classification_separation",
      title: "Classification separation",
      headline: "No separation between classifications",
      text: `All alternatives were assigned to ${category.label}; there is no represented category boundary to compare.`,
    };
  }

  const closest = readClosestBoundary(result, execution);
  if (!closest) {
    const least = representedCategories.at(-1);
    const most = representedCategories[0];
    return {
      kind: "classification_spread",
      title: "Classification spread",
      headline: `${least.label} to ${most.label}`,
      text: `Assignments span ${representedCategories.length} non-empty categories in the configured preference order.`,
    };
  }

  if (closest.length > 1) {
    return {
      kind: "closest_boundary",
      title: "Closest category boundary",
      headline: `${closest.length} equally close alternatives and boundaries`,
      text: "Proximity to a category boundary; this does not measure uncertainty or sensitivity.",
      boundaryPairs: closest.map(({ alternative, lowerCategory, upperCategory, difference }) => ({
        label: `${alternative.name}: ${lowerCategory} / ${upperCategory} (closeness difference ${formatDifference(difference)})`,
      })),
    };
  }

  const [{ alternative, lowerCategory, upperCategory, difference }] = closest;
  return {
    kind: "closest_boundary",
    title: "Closest category boundary",
    headline: `${lowerCategory} / ${upperCategory}`,
    text: `${alternative.name} is closest to this boundary (closeness difference ${formatDifference(difference)}). This indicates proximity, not uncertainty or sensitivity.`,
  };
};

export const buildTopsisSort2016Findings = (result, execution) => {
  if (!result?.available) return [];
  const nonEmptyCategories = result.categories.filter((category) => category.alternatives.length > 0);
  if (!nonEmptyCategories.length) return [];

  const mostFavorable = nonEmptyCategories[0];
  const leastFavorable = nonEmptyCategories.at(-1);
  const assignedTo = (category) => category.alternatives;
  const mostAlternatives = assignedTo(mostFavorable);
  const leastAlternatives = assignedTo(leastFavorable);

  return [
    {
      kind: "most_favorable_classification",
      title: "Most favorable classification",
      headline: mostFavorable.label,
      text: `${mostAlternatives.length} ${plural(mostAlternatives.length, "alternative", "alternatives")} assigned.`,
      alternatives: mostAlternatives.map(({ id, name }) => ({ id, name })),
    },
    buildBoundaryFinding(result, execution, nonEmptyCategories),
    {
      kind: "least_favorable_classification",
      title: "Least favorable classification",
      headline: leastFavorable.label,
      text: `${leastAlternatives.length} ${plural(leastAlternatives.length, "alternative", "alternatives")} assigned.`,
      alternatives: leastAlternatives.map(({ id, name }) => ({ id, name })),
    },
  ];
};

export default buildTopsisSort2016Findings;
