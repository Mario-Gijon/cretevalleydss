import { Box, Stack, Typography } from "@mui/material";
import { getParameterValueByStructureKey } from "../../../../modelParameters/context";

const categoryLabel = (category) => {
  const label = typeof category?.label === "string" ? category.label.trim() : "";
  return label || category?.categoryId || "Unknown category";
};

const displayValue = (value) => value === null || value === undefined || value === "" ? "—" : String(value);

export const BoundaryProfilesParameterReadOnly = ({ value, parameterContext }) => {
  const profiles = Array.isArray(value?.profiles) ? value.profiles : [];
  const categories = getParameterValueByStructureKey(parameterContext, "orderedCategories");
  const orderedCategories = Array.isArray(categories) ? categories : [];
  const categoryOrder = new Map(orderedCategories.map((category, index) => [category?.categoryId, index]));
  const displayedProfiles = profiles
    .map((profile, index) => ({ profile, index }))
    .sort((left, right) =>
      (categoryOrder.get(left.profile?.categoryId) ?? Number.MAX_SAFE_INTEGER) -
        (categoryOrder.get(right.profile?.categoryId) ?? Number.MAX_SAFE_INTEGER) ||
      left.index - right.index
    )
    .map(({ profile }) => profile);
  const criteriaById = new Map(
    (Array.isArray(parameterContext?.leafCriteria) ? parameterContext.leafCriteria : [])
      .map((criterion) => [criterion?.id, criterion])
  );

  if (!profiles.length) {
    return <Typography variant="body2" color="text.secondary">No boundary profiles configured.</Typography>;
  }

  return (
    <Stack spacing={1}>
      {displayedProfiles.map((profile, index) => {
        const upperCategory = orderedCategories.find((category) => category?.categoryId === profile?.categoryId);
        const upperIndex = orderedCategories.findIndex((category) => category?.categoryId === profile?.categoryId);
        const lowerCategory = upperIndex > 0 ? orderedCategories[upperIndex - 1] : null;
        const values = profile?.valuesByCriterionId && typeof profile.valuesByCriterionId === "object"
          ? profile.valuesByCriterionId
          : {};
        return (
          <Box
            key={profile?.profileId || `${profile?.categoryId || "profile"}-${index}`}
            component="section"
            aria-label={`Boundary profile toward ${categoryLabel(upperCategory)}`}
            sx={{ p: 1, border: 1, borderColor: "divider", borderRadius: 1.5 }}
          >
            <Typography variant="caption" color="text.secondary">
              {lowerCategory
                ? `${categoryLabel(lowerCategory)} → ${categoryLabel(upperCategory)}`
                : `Boundary profile for category ${profile?.categoryId || "(missing category ID)"}`}
            </Typography>
            <Stack spacing={0.45} sx={{ mt: 0.6 }}>
              {Object.entries(values).map(([criterionId, criterionValue]) => {
                const criterion = criteriaById.get(criterionId);
                const name = criterion?.name || `Criterion ${criterionId}`;
                return (
                  <Stack key={criterionId} direction="row" spacing={0.75} justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">{name}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{displayValue(criterionValue)}</Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
};

export default BoundaryProfilesParameterReadOnly;
