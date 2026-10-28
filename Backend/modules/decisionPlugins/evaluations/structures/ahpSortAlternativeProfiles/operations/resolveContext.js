import { createBadRequestError } from "../../../../../../utils/common/errors.js";
import { toIdString } from "../../../../../../utils/common/ids.js";
import { normalizeAHPSortProfilesConfiguration } from "../../../../shared/ahpSortProfiles.js";

const resolveEntities = ({ source, contextField }) => {
  if (!Array.isArray(source) || source.length === 0) {
    throw createBadRequestError(`${contextField} must be a non-empty array`, {
      field: contextField,
    });
  }

  const seenIds = new Set();
  return source.map((entity, index) => {
    const id = toIdString(entity?.id ?? entity?._id);
    const name = typeof entity?.name === "string" ? entity.name.trim() : "";
    if (!id || !name || seenIds.has(id)) {
      throw createBadRequestError(
        `${contextField}[${index}] must contain a unique ID and a non-empty name`,
        { field: `${contextField}[${index}]` }
      );
    }
    seenIds.add(id);
    return { id, name, index };
  });
};

export const resolveAHPSortAlternativeProfilesContext = ({ decisionContext }) => {
  const alternatives = resolveEntities({
    source: decisionContext?.alternatives,
    contextField: "decisionContext.alternatives",
  });
  const criteria = resolveEntities({
    source: decisionContext?.leafCriteria,
    contextField: "decisionContext.leafCriteria",
  });
  const modelParameters = decisionContext?.modelParameters;
  const profileConfiguration = normalizeAHPSortProfilesConfiguration({
    value: modelParameters?.ahpSortProfiles,
    categories: modelParameters?.orderedCategories,
  });
  if (profileConfiguration.error) {
    throw createBadRequestError(
      `decisionContext.modelParameters.ahpSortProfiles ${profileConfiguration.error}`,
      { field: "decisionContext.modelParameters.ahpSortProfiles" }
    );
  }

  const profiles = profileConfiguration.value.profiles.map((profile, index) => ({
    ...profile,
    index,
  }));
  const profileIndexById = new Map(
    profiles.map((profile) => [profile.profileId, profile.index])
  );

  return {
    alternatives,
    criteria,
    profiles,
    profileMode: profileConfiguration.value.mode,
    tiePolicy: profileConfiguration.value.tiePolicy ?? null,
    profileIndexById,
  };
};
