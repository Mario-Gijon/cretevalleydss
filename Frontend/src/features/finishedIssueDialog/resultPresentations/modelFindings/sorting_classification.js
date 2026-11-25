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

const describeEmptyLowerCategories = (categories, configuredCategoryNamesAreUnique) => {
  if (!categories.length) return null;
  const labels = categories.map(({ label }) => label);
  if (categories.length <= 3 && configuredCategoryNamesAreUnique) {
    const categoryNames = joinNatural(labels);
    return categories.length === 1
      ? `No alternatives were assigned to the ${categoryNames} category.`
      : `No alternatives were assigned to the ${categoryNames} categories.`;
  }
  return `No alternatives were assigned to any of the ${categories.length} lower categories.`;
};

const buildLeastFavorableFinding = (category, lowerEmptyCategories, configuredCategories) => {
  const count = category.alternatives.length;
  const alternativeLabel = count === 1 ? "alternative" : "alternatives";
  const categoryContent = count === 1 ? "an alternative" : "evaluated alternatives";
  const lead = lowerEmptyCategories.length
    ? `${category.label} is the lowest category containing ${categoryContent}, with ${count} ${alternativeLabel} assigned.`
    : `${category.label} is the lowest configured category and contains ${count} ${alternativeLabel}.`;
  const configuredCategoryNamesAreUnique = new Set(configuredCategories.map(({ label }) => label)).size === configuredCategories.length;
  const emptyCategoryNote = describeEmptyLowerCategories(lowerEmptyCategories, configuredCategoryNamesAreUnique);
  return {
    kind: "least_favorable_classification",
    title: "Lowest assigned category",
    headline: category.label,
    text: [lead, emptyCategoryNote].filter(Boolean).join(" "),
  };
};

/** Build category-level findings shared by sorting models with ordered categories. */
export const buildSortingClassificationFindings = (result) => {
  if (!result?.available || !Array.isArray(result.categories)) return [];
  const occupied = result.categories.filter((category) => Array.isArray(category.alternatives) && category.alternatives.length > 0);
  if (!occupied.length) return [];

  const mostFavorable = occupied[0];
  const leastFavorable = occupied.at(-1);
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

  const leastFavorableIndex = result.categories.findIndex(({ id }) => id === leastFavorable.id);
  const lowerEmptyCategories = leastFavorableIndex < 0
    ? []
    : result.categories.slice(leastFavorableIndex + 1).filter((category) => category.alternatives.length === 0);
  return [
    buildMostFavorableFinding(mostFavorable),
    buildLeastFavorableFinding(leastFavorable, lowerEmptyCategories, result.categories),
  ];
};
