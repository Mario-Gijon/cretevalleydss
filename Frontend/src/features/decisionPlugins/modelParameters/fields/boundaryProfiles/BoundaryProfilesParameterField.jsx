import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { getParameterValueByStructureKey } from "../../../../modelParameters/context";
import {
  getBoundaryProfilesValidationIssues,
  normalizeBoundaryProfilesValue,
  reconcileBoundaryProfiles,
  validateBoundaryProfilesValue,
} from "./boundaryProfilesValues.js";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const getCategories = (parameterContext) => {
  const categories = getParameterValueByStructureKey(parameterContext, "orderedCategories");
  return Array.isArray(categories) ? categories : [];
};

const categoryName = (category, categories) => {
  const label = typeof category?.label === "string" ? category.label.trim() : "";
  if (!label) return "Unnamed category";
  if (categories.filter((item) => item?.label?.trim() === label).length < 2) return label;
  return `${label} (category ${categories.findIndex((item) => item?.categoryId === category?.categoryId) + 1})`;
};

const boundaryName = (lowerCategory, upperCategory, categories) =>
  `${categoryName(lowerCategory, categories)} → ${categoryName(upperCategory, categories)}`;

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

const removeProfileValue = (profiles, profileId, criterionId) => ({
  profiles: profiles.map((profile) => {
    if (profile.profileId !== profileId) return profile;
    const valuesByCriterionId = { ...(profile.valuesByCriterionId || {}) };
    delete valuesByCriterionId[criterionId];
    return { ...profile, valuesByCriterionId };
  }),
});

const isProfileComplete = (profile, criteria) => criteria.length > 0 && criteria.every((criterion) => {
  const raw = profile?.valuesByCriterionId?.[criterion.id];
  if (raw === "" || raw === null || raw === undefined) return false;
  const number = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(number);
});

const displayValue = (value) => value === null || value === undefined || value === "" ? "—" : String(value);

const BoundaryCriterionField = ({
  profile,
  criterion,
  criterionIndex,
  parameter,
  parameterContext,
  boundary,
  disabled,
  touched,
  error,
  onValueChange,
  onTouch,
}) => {
  const restrictions = parameter?.restrictions || {};
  const domain = parameterContext?.criterionDomainsById?.[criterion.id];
  const min = Number.isFinite(restrictions.min) ? restrictions.min : domain?.definition?.min;
  const max = Number.isFinite(restrictions.max) ? restrictions.max : domain?.definition?.max;
  const criterionName = criterion.name?.trim() || `Criterion ${criterionIndex + 1}`;
  const preference = criterion.type === "benefit" ? "Benefit" : criterion.type === "cost" ? "Cost" : "Preference not set";
  const range = Number.isFinite(min) && Number.isFinite(max) ? `Range: ${min} to ${max}` : "Numeric reference value";

  return (
    <Box sx={{ minWidth: 0, p: 0.8, border: 1, borderColor: "divider", borderRadius: 1 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.35, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 750, minWidth: 0, overflowWrap: "anywhere" }}>
          {criterionName}
        </Typography>
        <Chip size="small" variant="outlined" color="secondary" label={preference} />
      </Stack>
      <TextField
        type="number"
        label="Reference value"
        size="small"
        color="secondary"
        fullWidth
        value={valueFor(profile, criterion.id)}
        onChange={(event) => {
          onTouch();
          onValueChange(criterion.id, event.target.value);
        }}
        onBlur={onTouch}
        disabled={disabled}
        error={Boolean(touched && error)}
        helperText={touched && error ? error : range}
        inputProps={{
          "aria-label": `${criterionName} (${preference}) in ${boundary}`,
          ...(Number.isFinite(min) ? { min } : {}),
          ...(Number.isFinite(max) ? { max } : {}),
          step: "any",
        }}
        sx={{ "& .MuiFormHelperText-root": { mx: 0 } }}
      />
    </Box>
  );
};

const BoundaryProfileCard = ({
  profile,
  lowerCategory,
  upperCategory,
  categories,
  criteria,
  parameter,
  parameterContext,
  disabled,
  showValidation,
  touchedCells,
  issues,
  onValueChange,
  onTouch,
  expandedByDefault,
}) => {
  const title = boundaryName(lowerCategory, upperCategory, categories);
  const currentCriterionIds = new Set(criteria.map((criterion) => criterion.id));
  const staleCriterionIds = Object.keys(profile.valuesByCriterionId || {})
    .filter((criterionId) => !currentCriterionIds.has(criterionId));
  const criterionById = new Map(criteria.map((criterion) => [criterion.id, criterion]));
  const profileIssues = issues.filter((issue) => issue.profileId === profile.profileId);
  const hasTouchedCell = showValidation || criteria.some((criterion) => touchedCells.has(`${profile.profileId}:${criterion.id}`));
  const visibleProfileIssue = profileIssues.find((issue) => showValidation || issue.kind !== "field" ||
    touchedCells.has(`${profile.profileId}:${issue.criterionId}`));

  return (
    <Accordion
      disableGutters
      elevation={0}
      defaultExpanded={expandedByDefault}
      sx={{ border: 1, borderColor: "divider", borderRadius: "12px !important", "&:before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} aria-label={`${title} category boundary`}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.25, sm: 1 }} alignItems={{ sm: "center" }} sx={{ minWidth: 0, width: "100%" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 850, minWidth: 0, overflowWrap: "anywhere" }}>{title}</Typography>
          <Chip
            size="small"
            variant="outlined"
            color={isProfileComplete(profile, criteria) && staleCriterionIds.length === 0 && profileIssues.length === 0 ? "success" : "warning"}
            label={isProfileComplete(profile, criteria) && staleCriterionIds.length === 0 && profileIssues.length === 0 ? "Ready" : "Needs values"}
            sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
          />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Set one reference value for each criterion.
          </Typography>
          {criteria.length ? (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" }, gap: 0.8 }}>
              {criteria.map((criterion, criterionIndex) => {
                const issue = issues.find((item) =>
                  item.profileId === profile.profileId && item.criterionId === criterion.id
                );
                return (
                  <BoundaryCriterionField
                    key={criterion.id}
                    profile={profile}
                    criterion={criterion}
                    criterionIndex={criterionIndex}
                    parameter={parameter}
                    parameterContext={parameterContext}
                    boundary={title}
                    disabled={disabled}
                    touched={showValidation || touchedCells.has(`${profile.profileId}:${criterion.id}`)}
                    error={issue?.message || ""}
                    onValueChange={onValueChange}
                    onTouch={() => onTouch(profile.profileId, criterion.id)}
                  />
                );
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">Add leaf criteria before setting category boundaries.</Typography>
          )}
          {staleCriterionIds.length ? (
            <Alert severity="warning" icon={false} sx={{ py: 0.25 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption">
                  {staleCriterionIds.length} saved value{staleCriterionIds.length === 1 ? "" : "s"} belong to a criterion no longer in this Issue. Review and remove each one to continue.
                </Typography>
                {staleCriterionIds.map((criterionId, index) => (
                  <Stack key={criterionId} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Typography variant="caption" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                      {criterionById.get(criterionId)?.name || `Saved value ${index + 1}`} · {displayValue(profile.valuesByCriterionId[criterionId])}
                    </Typography>
                    {!disabled ? (
                      <Button size="small" color="secondary" onClick={() => onValueChange(criterionId, undefined)}>
                        Remove saved value
                      </Button>
                    ) : null}
                  </Stack>
                ))}
              </Stack>
            </Alert>
          ) : null}
          {hasTouchedCell && visibleProfileIssue?.kind !== "field" ? (
            <Typography variant="caption" color="error" role="alert">{visibleProfileIssue?.message}</Typography>
          ) : null}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export const BoundaryProfilesParameterField = ({ parameter, value, onChange, error = "", disabled = false, parameterContext, showValidation = false }) => {
  const categories = getCategories(parameterContext);
  const leafCriteria = Array.isArray(parameterContext?.leafCriteria) ? parameterContext.leafCriteria : [];
  const normalized = useMemo(() => normalizeBoundaryProfilesValue(parameter, value), [parameter, value]);
  const [reviewNotice, setReviewNotice] = useState("");
  const [touchedCells, setTouchedCells] = useState(() => new Set());
  const categoryIdsKey = categories.map((category) => category?.categoryId || "").join("\u001f");
  const criterionIdsKey = leafCriteria.map((criterion) => criterion?.id || "").join("\u001f");

  useEffect(() => {
    const result = reconcileBoundaryProfiles({ value, categories, leafCriteria });
    if (result.changed) onChange(result.value);
    setReviewNotice(result.staleCount > 0
      ? "A saved boundary no longer matches the current categories. Review it below before continuing."
      : "");
    // The normalized value is included so newly entered values also receive current criteria.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryIdsKey, criterionIdsKey, normalized, onChange]);

  const issues = getBoundaryProfilesValidationIssues(parameter, normalized, parameterContext);
  const validationError = validateBoundaryProfilesValue(parameter, normalized, parameterContext);
  const profilesByCategory = new Map();
  const staleProfiles = [];
  const expectedCategoryIds = new Set(categories.slice(1).map((category) => category?.categoryId));
  normalized.profiles.forEach((profile) => {
    if (!expectedCategoryIds.has(profile.categoryId) || profilesByCategory.has(profile.categoryId)) {
      staleProfiles.push(profile);
      return;
    }
    profilesByCategory.set(profile.categoryId, profile);
  });

  const touchCell = (profileId, criterionId) => setTouchedCells((previous) => {
    const next = new Set(previous);
    next.add(`${profileId}:${criterionId}`);
    return next;
  });
  const updateValue = (profileId, criterionId, nextValue) => {
    if (nextValue === undefined) {
      onChange(removeProfileValue(normalized.profiles, profileId, criterionId));
      return;
    }
    onChange(updateProfileValue(normalized.profiles, profileId, criterionId, nextValue));
  };
  const removeProfile = (profileId) => onChange({
    profiles: normalized.profiles.filter((profile) => profile.profileId !== profileId),
  });

  return (
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 800 }}>Category boundaries</Typography>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ m: 0 }}>
          Set a reference profile between each pair of categories.
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ m: 0 }}>
          Benefit: higher values are preferred. Cost: lower values are preferred. Discrete-domain profiles may use values between steps.
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ m: 0 }}>
          Each boundary is used as one reference profile across all criteria.
        </Typography>
      </Box>

      {categories.length < 2 ? (
        <Typography variant="body2" color="text.secondary">Add at least two categories to define a boundary.</Typography>
      ) : null}

      {categories.slice(1).map((category, index) => {
        const lowerCategory = categories[index];
        const profile = profilesByCategory.get(category?.categoryId);
        if (!profile) {
          return (
            <Box key={category?.categoryId || `category-${index}`}>
              <Alert severity="warning" icon={false} sx={{ py: 0.25 }}>
                The {boundaryName(lowerCategory, category, categories)} reference profile is being prepared.
              </Alert>
            </Box>
          );
        }
        return (
          <BoundaryProfileCard
            key={category?.categoryId || `category-${index}`}
            profile={profile}
            lowerCategory={lowerCategory}
            upperCategory={category}
            categories={categories}
            criteria={leafCriteria}
            parameter={parameter}
            parameterContext={parameterContext}
            disabled={disabled}
            showValidation={showValidation}
            touchedCells={touchedCells}
            issues={issues}
            onValueChange={(criterionId, nextValue) => updateValue(profile.profileId, criterionId, nextValue)}
            onTouch={touchCell}
            expandedByDefault={categories.length <= 4}
          />
        );
      })}

      {staleProfiles.length ? (
        <Stack spacing={0.75}>
          <Alert severity="warning" icon={false}>
            {reviewNotice || "A saved boundary no longer matches the current categories. Review it before continuing."}
          </Alert>
          {staleProfiles.map((profile, index) => (
            <Stack
              key={profile.profileId || `stale-${index}`}
              direction={{ xs: "column", sm: "row" }}
              spacing={0.75}
              alignItems={{ sm: "center" }}
              justifyContent="space-between"
              sx={{ p: 1, border: 1, borderColor: "warning.light", borderRadius: 1.5 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>Saved boundary needs review</Typography>
                <Typography variant="caption" color="text.secondary">
                  {Object.entries(profile.valuesByCriterionId || {}).map(([criterionId, profileValue], valueIndex) => {
                    const criterion = leafCriteria.find((item) => item.id === criterionId);
                    return `${criterion?.name || `Saved value ${valueIndex + 1}`}: ${displayValue(profileValue)}`;
                  }).join(" · ") || "No reference values"}
                </Typography>
              </Box>
              {!disabled ? (
                <Button
                  size="small"
                  color="secondary"
                  variant="outlined"
                  startIcon={<DeleteOutlineRoundedIcon />}
                  onClick={() => removeProfile(profile.profileId)}
                >
                  Remove saved boundary
                </Button>
              ) : null}
            </Stack>
          ))}
        </Stack>
      ) : null}
      {(touchedCells.size > 0 || showValidation) && error && validationError ? (
        <Typography variant="caption" color="error" role="alert">{validationError}</Typography>
      ) : null}
    </Stack>
  );
};

export default BoundaryProfilesParameterField;
