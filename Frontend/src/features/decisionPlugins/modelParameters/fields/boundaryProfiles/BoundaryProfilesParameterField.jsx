import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { getParameterValueByStructureKey } from "../../../../modelParameters/context";
import {
  normalizeBoundaryProfilesValue,
  reconcileBoundaryProfiles,
  validateBoundaryProfilesValue,
} from "./boundaryProfilesValues.js";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const getCategories = (parameterContext) => {
  const categories = getParameterValueByStructureKey(parameterContext, "orderedCategories");
  return Array.isArray(categories) ? categories : [];
};

const valueFor = (profile, criterionId) => {
  const value = profile?.valuesByCriterionId?.[criterionId];
  return value === null || value === undefined ? "" : String(value);
};

const updateProfileValue = (profiles, profileId, criterionId, nextValue) => ({
  profiles: profiles.map((profile) => profile.profileId === profileId
    ? {
        ...profile,
        valuesByCriterionId: {
          ...(isObject(profile.valuesByCriterionId) ? profile.valuesByCriterionId : {}),
          [criterionId]: nextValue,
        },
      }
    : profile),
});

const categoryName = (category) => {
  const label = typeof category?.label === "string" ? category.label.trim() : "";
  return label || category?.categoryId || "Unnamed category";
};

const BoundaryProfileCard = ({ profile, lowerCategory, upperCategory, criteria, parameter, parameterContext, disabled, onValueChange }) => {
  const restrictions = parameter?.restrictions || {};
  return (
    <Box
      component="section"
      aria-label={`Boundary profile from ${categoryName(lowerCategory)} to ${categoryName(upperCategory)}`}
      sx={{ p: 1.25, border: 1, borderColor: "divider", borderRadius: 1.5 }}
    >
      <Stack spacing={1}>
        <Box>
          <Typography variant="caption" color="text.secondary">Profile boundary toward</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
            {categoryName(upperCategory)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {categoryName(lowerCategory)} → {categoryName(upperCategory)}
          </Typography>
        </Box>
        <Divider />
        {criteria.length ? criteria.map((criterion) => {
          const domain = parameterContext?.criterionDomainsById?.[criterion.id];
          const min = Number.isFinite(restrictions.min)
            ? restrictions.min
            : domain?.definition?.min;
          const max = Number.isFinite(restrictions.max)
            ? restrictions.max
            : domain?.definition?.max;
          return (
            <TextField
              key={criterion.id}
              type="number"
              label={criterion.name || criterion.id}
              size="small"
              value={valueFor(profile, criterion.id)}
              onChange={(event) => onValueChange(criterion.id, event.target.value)}
              disabled={disabled}
              inputProps={{
                "aria-label": `${categoryName(upperCategory)} boundary for ${criterion.name || criterion.id}`,
                ...(Number.isFinite(min) ? { min } : {}),
                ...(Number.isFinite(max) ? { max } : {}),
                step: "any",
              }}
              helperText={
                domain?.typeKey === "numericDiscrete" && Number.isFinite(domain.definition?.step)
                  ? `Numeric domain step ${domain.definition.step}; boundary values may be intermediate.`
                  : undefined
              }
            />
          );
        }) : (
          <Typography variant="body2" color="text.secondary">No leaf criteria are available.</Typography>
        )}
      </Stack>
    </Box>
  );
};

export const BoundaryProfilesParameterField = ({ parameter, value, onChange, error = "", disabled = false, parameterContext }) => {
  const label = parameter?.label || "Boundary profiles";
  const categories = getCategories(parameterContext);
  const leafCriteria = Array.isArray(parameterContext?.leafCriteria) ? parameterContext.leafCriteria : [];
  const normalized = useMemo(() => normalizeBoundaryProfilesValue(parameter, value), [parameter, value]);
  const [reviewNotice, setReviewNotice] = useState("");
  const categoryIdsKey = categories.map((category) => category?.categoryId || "").join("\u001f");
  const criterionIdsKey = leafCriteria.map((criterion) => criterion?.id || "").join("\u001f");

  useEffect(() => {
    const result = reconcileBoundaryProfiles({
      value,
      categories,
      leafCriteria,
    });
    if (result.changed) onChange(result.value);
    if (result.staleCount > 0) {
      setReviewNotice(
        `${result.staleCount} profile(s) no longer match a current boundary. Review and remove them or restore their category.`
      );
    } else {
      setReviewNotice("");
    }
    // These keys are the semantic dependencies. Value changes are separately reconciled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryIdsKey, criterionIdsKey, normalized, onChange]);

  const profileValidationError = validateBoundaryProfilesValue(parameter, normalized, parameterContext);
  const displayedError = error || profileValidationError;
  const profilesByCategory = new Map(normalized.profiles.map((profile) => [profile.categoryId, profile]));
  const validCategoryIds = new Set(categories.slice(1).map((category) => category?.categoryId));
  const staleProfiles = normalized.profiles.filter((profile) => !validCategoryIds.has(profile.categoryId));

  const removeProfile = (profileId) =>
    onChange({ profiles: normalized.profiles.filter((profile) => profile.profileId !== profileId) });

  return (
    <Stack spacing={1.1}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 800 }}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          Each profile is attached to the category reached when crossing its boundary. Values are set by leaf criterion.
        </Typography>
      </Box>

      {categories.length < 2 ? (
        <Alert severity="info">Add at least two ordered categories to define a boundary.</Alert>
      ) : null}

      {categories.map((category, index) => {
        if (index === 0) {
          return (
            <Box key={category?.categoryId || `category-${index}`} sx={{ px: 1, py: 0.5, borderLeft: 3, borderColor: "secondary.main" }}>
              <Typography variant="caption" color="text.secondary">Least preferred category</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>{categoryName(category)}</Typography>
            </Box>
          );
        }
        const previousCategory = categories[index - 1];
        const profile = profilesByCategory.get(category?.categoryId);
        if (!profile) {
          return (
            <Box key={category?.categoryId || `category-${index}`}>
              <Alert severity="warning">A boundary profile for {categoryName(category)} is being prepared.</Alert>
            </Box>
          );
        }
        return (
          <Stack key={category?.categoryId || `category-${index}`} spacing={0.8}>
            <BoundaryProfileCard
              profile={profile}
              lowerCategory={previousCategory}
              upperCategory={category}
              criteria={leafCriteria}
              parameter={parameter}
              parameterContext={parameterContext}
              disabled={disabled}
              onValueChange={(criterionId, nextValue) => onChange(
                updateProfileValue(normalized.profiles, profile.profileId, criterionId, nextValue)
              )}
            />
            <Box sx={{ px: 1, py: 0.5, borderLeft: 3, borderColor: "secondary.main" }}>
              <Typography variant="caption" color="text.secondary">Category reached at this boundary</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>{categoryName(category)}</Typography>
            </Box>
          </Stack>
        );
      })}

      {staleProfiles.length ? (
        <Stack spacing={0.75}>
          <Alert severity="warning">{reviewNotice || "Some profiles no longer match a current category boundary. Review them before continuing."}</Alert>
          {staleProfiles.map((profile) => (
            <Stack
              key={profile.profileId}
              direction={{ xs: "column", sm: "row" }}
              spacing={0.75}
              alignItems={{ sm: "center" }}
              justifyContent="space-between"
              sx={{ p: 1, border: 1, borderColor: "warning.light", borderRadius: 1.5 }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  Unmatched profile for {categories.find((item) => item?.categoryId === profile.categoryId)
                    ? categoryName(categories.find((item) => item?.categoryId === profile.categoryId))
                    : `removed category ${profile.categoryId || "(missing ID)"}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {Object.entries(profile.valuesByCriterionId || {}).map(([id, profileValue]) => `${id}: ${profileValue}`).join(" · ") || "No values"}
                </Typography>
              </Box>
              {!disabled ? (
                <Button
                  size="small"
                  color="warning"
                  startIcon={<DeleteOutlineRoundedIcon />}
                  onClick={() => removeProfile(profile.profileId)}
                >
                  Remove unmatched profile
                </Button>
              ) : null}
            </Stack>
          ))}
        </Stack>
      ) : null}
      {displayedError ? <Alert severity="error" role="alert">{displayedError}</Alert> : null}
    </Stack>
  );
};

export default BoundaryProfilesParameterField;
