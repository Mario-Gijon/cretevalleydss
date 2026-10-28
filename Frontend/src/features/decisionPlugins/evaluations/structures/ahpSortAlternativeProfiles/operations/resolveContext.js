const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const resolveEntities = ({ value, label }) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must contain at least one item.`);
  }

  const seenIds = new Set();
  return value.map((entity, index) => {
    const id = normalizeText(entity?.id ?? entity?._id);
    const name = normalizeText(entity?.name);
    if (!isRecord(entity) || !id || !name || seenIds.has(id)) {
      throw new Error(`${label} item ${index + 1} must have a unique ID and name.`);
    }
    seenIds.add(id);
    return { id, name, index };
  });
};

const orderedCategories = (value) => {
  if (!Array.isArray(value) || value.length < 2) {
    throw new Error("AHPSort I requires at least two ordered categories.");
  }

  const seenIds = new Set();
  const categories = value.map((category, index) => {
    const id = normalizeText(category?.categoryId);
    const label = normalizeText(category?.label);
    if (!isRecord(category) || !id || !label || seenIds.has(id)) {
      throw new Error("Each category must have a unique ID and a name.");
    }
    seenIds.add(id);
    return {
      id,
      label,
      order: Number.isInteger(category.order) ? category.order : index,
      sourceIndex: index,
    };
  });

  categories.sort((left, right) => left.order - right.order || left.sourceIndex - right.sourceIndex);
  if (new Set(categories.map(({ order }) => order)).size !== categories.length) {
    throw new Error("Categories must have a unique preference order.");
  }
  if (categories.some(({ order }, index) => order !== index)) {
    throw new Error("Categories must follow their configured preference order.");
  }
  return categories;
};

const requireExactKeys = (value, keys) =>
  isRecord(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));

const categoryLabel = (category, categories) => {
  const duplicateCount = categories.filter(({ label }) => label === category.label).length;
  return duplicateCount > 1
    ? `${category.label} (category ${categories.indexOf(category) + 1})`
    : category.label;
};

export const resolveAHPSortAlternativeProfilesContext = ({ decisionContext }) => {
  if (!isRecord(decisionContext)) {
    throw new Error("AHPSort I decision context is unavailable.");
  }

  const alternatives = resolveEntities({
    value: decisionContext.alternatives,
    label: "Alternatives",
  });
  const criteria = resolveEntities({
    value: decisionContext.leafCriteria,
    label: "Leaf criteria",
  });
  const modelParameters = decisionContext.modelParameters;
  if (!isRecord(modelParameters)) {
    throw new Error("AHPSort I model parameters are unavailable.");
  }
  const categories = orderedCategories(modelParameters.orderedCategories);
  const configuration = modelParameters.ahpSortProfiles;
  if (!isRecord(configuration) || !["limiting", "central"].includes(configuration.mode)) {
    throw new Error("Choose valid AHPSort I category profiles before evaluating.");
  }
  const configurationFields = configuration.mode === "central"
    ? ["mode", "profiles", "tiePolicy"]
    : ["mode", "profiles"];
  if (
    Object.keys(configuration).length !== configurationFields.length ||
    configurationFields.some((field) => !Object.hasOwn(configuration, field))
  ) {
    throw new Error("Review the configured AHPSort I profile method.");
  }
  if (!Array.isArray(configuration.profiles)) {
    throw new Error("AHPSort I category profiles are incomplete.");
  }
  if (
    configuration.mode === "central" &&
    !["optimistic", "pessimistic"].includes(configuration.tiePolicy)
  ) {
    throw new Error("The central profile tie preference is incomplete.");
  }

  const profilesByAssociation = new Map();
  const profileIds = new Set();
  const expected = configuration.mode === "central"
    ? categories.map((category) => ({ category }))
    : categories.slice(1).map((upper, index) => ({ lower: categories[index], upper }));

  configuration.profiles.forEach((profile, index) => {
    const fields = configuration.mode === "central"
      ? ["profileId", "categoryId"]
      : ["profileId", "lowerCategoryId", "upperCategoryId"];
    const profileId = normalizeText(profile?.profileId);
    if (!requireExactKeys(profile, fields) || !profileId || profileIds.has(profileId)) {
      throw new Error(`AHPSort I profile ${index + 1} is invalid or duplicated.`);
    }
    profileIds.add(profileId);

    let association;
    let categoryDescription;
    if (configuration.mode === "central") {
      const category = categories.find(({ id }) => id === normalizeText(profile.categoryId));
      if (!category) throw new Error(`Central profile ${index + 1} has an unknown category.`);
      association = category.id;
      categoryDescription = `${categoryLabel(category, categories)} center`;
    } else {
      const lowerIndex = categories.findIndex(({ id }) => id === normalizeText(profile.lowerCategoryId));
      const upperIndex = categories.findIndex(({ id }) => id === normalizeText(profile.upperCategoryId));
      if (lowerIndex < 0 || upperIndex !== lowerIndex + 1) {
        throw new Error(`Limiting profile ${index + 1} must separate neighboring categories.`);
      }
      association = JSON.stringify([categories[lowerIndex].id, categories[upperIndex].id]);
      categoryDescription = `${categoryLabel(categories[lowerIndex], categories)} → ${categoryLabel(categories[upperIndex], categories)}`;
    }

    if (profilesByAssociation.has(association)) {
      throw new Error("Each category reference must have exactly one profile.");
    }
    profilesByAssociation.set(association, {
      profileId,
      label: categoryDescription,
      index,
    });
  });

  const profiles = expected.map((item, index) => {
    const association = configuration.mode === "central"
      ? item.category.id
      : JSON.stringify([item.lower.id, item.upper.id]);
    const profile = profilesByAssociation.get(association);
    if (!profile) {
      throw new Error("Configure one profile for each category reference before evaluating.");
    }
    return { ...profile, index };
  });
  if (profiles.length !== configuration.profiles.length) {
    throw new Error("Remove profiles that do not match the selected category method.");
  }

  return {
    alternatives,
    criteria,
    categories,
    profiles,
    profileMode: configuration.mode,
    tiePolicy: configuration.tiePolicy ?? null,
  };
};
