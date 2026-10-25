import { useEffect, useMemo, useState } from "react";
import {
  Button,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { alpha } from "@mui/material/styles";
import { getParameterValueByStructureKey } from "../../../../modelParameters/context";
import {
  getBoundaryCriterionSetupIssue,
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
const boundaryName = (lower, upper) => `${lower?.label?.trim() || "Category"} → ${upper?.label?.trim() || "Category"}`;
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

const getRange = (parameter, criterion, parameterContext) => {
  const restrictions = parameter?.restrictions || {};
  const domain = parameterContext?.criterionDomainsById?.[criterion.id];
  const domainMin = domain?.definition?.min;
  const domainMax = domain?.definition?.max;
  const min = Number.isFinite(domainMin)
    ? Math.max(domainMin, Number.isFinite(restrictions.min) ? restrictions.min : domainMin)
    : restrictions.min;
  const max = Number.isFinite(domainMax)
    ? Math.min(domainMax, Number.isFinite(restrictions.max) ? restrictions.max : domainMax)
    : restrictions.max;
  return {
    domain,
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
    setupIssue: getBoundaryCriterionSetupIssue(criterion, domain, restrictions),
  };
};

const BoundaryValueField = ({
  profile,
  criterion,
  criterionIndex,
  boundary,
  parameter,
  parameterContext,
  touched,
  issue,
  disabled,
  onValueChange,
  onTouch,
}) => {
  const { min, max, setupIssue } = getRange(parameter, criterion, parameterContext);
  const criterionName = criterion.name?.trim() || `Criterion ${criterionIndex + 1}`;
  const hasSetupIssue = Boolean(setupIssue);
  const showFieldIssue = touched && Boolean(issue) && !hasSetupIssue;

  return (
    <TextField
      type="number"
      size="small"
      color="secondary"
      fullWidth
      value={valueFor(profile, criterion.id)}
      onChange={(event) => {
        onTouch();
        onValueChange(criterion.id, event.target.value);
      }}
      onBlur={onTouch}
      disabled={disabled || hasSetupIssue}
      error={showFieldIssue}
      helperText={showFieldIssue ? issue.message : undefined}
      inputProps={{
        "aria-label": `${criterionName} reference in ${boundary}`,
        ...(Number.isFinite(min) ? { min } : {}),
        ...(Number.isFinite(max) ? { max } : {}),
        step: "any",
      }}
      sx={{
        minWidth: { xs: 96, md: 105 },
        "& .MuiInputBase-input": { py: 0.65 },
        "& .MuiFormHelperText-root": { mx: 0, minWidth: 160 },
      }}
    />
  );
};

const BoundaryTable = ({
  criteria,
  boundaries,
  selectedBoundary,
  isMobileViewport,
  parameter,
  parameterContext,
  disabled,
  showValidation,
  touchedCells,
  issues,
  onValueChange,
  onTouch,
}) => {

  const renderRows = (activeBoundaries) => criteria.map((criterion, criterionIndex) => {
    const { setupIssue } = getRange(parameter, criterion, parameterContext);
    const preference = criterion.type === "benefit" ? "Benefit" : criterion.type === "cost" ? "Cost" : "Direction not set";
    const range = getRange(parameter, criterion, parameterContext);
    const rangeText = Number.isFinite(range.min) && Number.isFinite(range.max)
      ? `${range.min}–${range.max}`
      : "Range not set";

    return (
      <TableRow key={criterion.id}>
        <TableCell
          component="th"
          scope="row"
          sx={(theme) => ({
            position: "sticky",
            left: 0,
            zIndex: 1,
            // Keep the sticky criterion column opaque while the table scrolls.
            bgcolor: theme.palette.background.default,
            borderColor: alpha(theme.palette.divider, 0.6),
            minWidth: { xs: 115, md: 190 },
            maxWidth: { xs: 150, md: 250 },
            py: 0.55,
          })}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
            {criterion.name?.trim() || `Criterion ${criterionIndex + 1}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {preference} · {rangeText}
          </Typography>
          {setupIssue ? (
            <Typography variant="caption" color="error" display="block" role="note">
              {setupIssue}
            </Typography>
          ) : null}
        </TableCell>
        {activeBoundaries.map((boundary) => {
          const { profile } = boundary;
          const issue = profile && issues.find((item) =>
            item.profileId === profile.profileId && item.criterionId === criterion.id
          );
          const touched = showValidation || touchedCells.has(`${profile?.profileId}:${criterion.id}`);
          return (
            <TableCell
              key={boundary.upperCategory.categoryId}
              sx={(theme) => ({
                minWidth: { xs: 130, md: 165 },
                py: 0.45,
                borderColor: alpha(theme.palette.divider, 0.6),
              })}
            >
              {profile ? (
                <BoundaryValueField
                  profile={profile}
                  criterion={criterion}
                  criterionIndex={criterionIndex}
                  boundary={boundaryName(boundary.lowerCategory, boundary.upperCategory)}
                  parameter={parameter}
                  parameterContext={parameterContext}
                  touched={touched}
                  issue={issue}
                  disabled={disabled}
                  onValueChange={(criterionId, nextValue) => onValueChange(profile.profileId, criterionId, nextValue)}
                  onTouch={() => onTouch(profile.profileId, criterion.id)}
                />
              ) : (
                <Typography variant="caption" color="text.secondary">Preparing…</Typography>
              )}
            </TableCell>
          );
        })}
      </TableRow>
    );
  });

  const renderHeader = (activeBoundaries) => (
    <TableHead>
      <TableRow>
        <TableCell
          sx={(theme) => ({
            position: "sticky",
            top: 0,
            left: 0,
            zIndex: 3,
            // Sticky headers use solid theme surfaces to prevent text bleed-through.
            bgcolor: theme.palette.background.paper,
            borderColor: alpha(theme.palette.secondary.main, 0.28),
            minWidth: { xs: 115, md: 190 },
            py: 0.6,
          })}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Criterion</Typography>
        </TableCell>
        {activeBoundaries.map((boundary) => (
          <TableCell
            key={boundary.upperCategory.categoryId}
            sx={(theme) => ({
              position: "sticky",
              top: 0,
              zIndex: 2,
              bgcolor: theme.palette.background.paper,
              borderColor: alpha(theme.palette.secondary.main, 0.28),
              minWidth: { xs: 130, md: 145 },
              py: 0.6,
            })}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              {isMobileViewport ? "Reference value" : boundaryName(boundary.lowerCategory, boundary.upperCategory)}
            </Typography>
            {showValidation && boundary.profile ? issues
              .filter((issue) => issue.profileId === boundary.profile.profileId && issue.kind !== "field" && !issue.criterionId)
              .slice(0, 1)
              .map((issue) => (
                <Typography key={issue.message} variant="caption" color="error" display="block" role="alert">
                  {issue.message}
                </Typography>
              )) : null}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );

  const renderTable = (activeBoundaries) => (
    <TableContainer
      sx={(theme) => ({
        width: "100%",
        minWidth: 0,
        maxHeight: { xs: 440, md: 520 },
        overflow: "auto",
        bgcolor: theme.palette.background.default,
        border: 1,
        borderColor: alpha(theme.palette.divider, 0.65),
        borderRadius: 1,
        "& .MuiTableCell-root": { borderColor: alpha(theme.palette.divider, 0.55) },
      })}
    >
      <Table size="small" stickyHeader aria-label="Classification reference values">
        {renderHeader(activeBoundaries)}
        <TableBody>{renderRows(activeBoundaries)}</TableBody>
      </Table>
    </TableContainer>
  );

  return renderTable(isMobileViewport && selectedBoundary ? [selectedBoundary] : boundaries);
};

export const BoundaryProfilesParameterField = ({ parameter, value, onChange, error = "", disabled = false, parameterContext, showValidation = false }) => {
  const categories = getCategories(parameterContext);
  const leafCriteria = Array.isArray(parameterContext?.leafCriteria) ? parameterContext.leafCriteria : [];
  const normalized = useMemo(() => normalizeBoundaryProfilesValue(parameter, value), [parameter, value]);
  const [touchedCells, setTouchedCells] = useState(() => new Set());
  const [selectedBoundaryCategoryId, setSelectedBoundaryCategoryId] = useState("");
  const isMobileViewport = useMediaQuery("(max-width:899.95px)");
  const categoryIdsKey = categories.map((category) => category?.categoryId || "").join("\u001f");
  const criterionIdsKey = leafCriteria.map((criterion) => criterion?.id || "").join("\u001f");

  useEffect(() => {
    const result = reconcileBoundaryProfiles({ value, categories, leafCriteria });
    if (result.changed) onChange(result.value);
    // Reconcile by stable category and criterion IDs, never by table position.
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

  const boundaries = categories.slice(1).map((upperCategory, index) => ({
    lowerCategory: categories[index],
    upperCategory,
    profile: profilesByCategory.get(upperCategory?.categoryId),
  }));
  const selectedBoundary = boundaries.find((boundary) =>
    boundary.upperCategory?.categoryId === selectedBoundaryCategoryId
  ) || boundaries[0] || null;

  const missingValues = boundaries.reduce((count, boundary) => count + leafCriteria.filter((criterion) => {
    const raw = boundary.profile?.valuesByCriterionId?.[criterion.id];
    return raw === "" || raw === null || raw === undefined;
  }).length, 0);
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
  const removeStaleCriterionValue = (profileId, criterionId) =>
    onChange(removeProfileValue(normalized.profiles, profileId, criterionId));
  const profileOrderIssue = showValidation
    ? issues.find((issue) => issue.kind === "profile-order" || (issue.kind !== "field" && issue.kind !== "stale-profile" && issue.kind !== "stale-criterion" && !issue.criterionId))
    : null;

  return (
    <Stack spacing={0.65} sx={{ minWidth: 0 }}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Classification references</Typography>
        <Tooltip title="Each column is one complete reference between adjacent categories. Discrete criteria can use values between domain steps.">
          <IconButton size="small" aria-label="About classification references">
            <InfoOutlinedIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      </Stack>

      {categories.length < 2 ? (
        <Typography variant="caption" color="text.secondary">Add at least two categories to set their references.</Typography>
      ) : null}
      {!leafCriteria.length ? (
        <Typography variant="caption" color="text.secondary">Add criteria to set classification references.</Typography>
      ) : null}

      {boundaries.length > 1 ? (
        <FormControl size="small" sx={{ display: { xs: "block", md: "none" }, maxWidth: "100%" }}>
          <Select
            value={selectedBoundary?.upperCategory?.categoryId || ""}
            onChange={(event) => setSelectedBoundaryCategoryId(event.target.value)}
            color="secondary"
            inputProps={{ "aria-label": "Classification reference" }}
          >
            {boundaries.map((boundary) => (
              <MenuItem key={boundary.upperCategory.categoryId} value={boundary.upperCategory.categoryId}>
                {boundaryName(boundary.lowerCategory, boundary.upperCategory)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : boundaries.length === 1 ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "block", md: "none" } }}>
          {boundaryName(boundaries[0].lowerCategory, boundaries[0].upperCategory)}
        </Typography>
      ) : null}

      {boundaries.length && leafCriteria.length ? (
        <BoundaryTable
          criteria={leafCriteria}
          boundaries={boundaries}
          selectedBoundary={selectedBoundary}
          isMobileViewport={isMobileViewport}
          parameter={parameter}
          parameterContext={parameterContext}
          disabled={disabled}
          showValidation={showValidation}
          touchedCells={touchedCells}
          issues={issues}
          onValueChange={updateValue}
          onTouch={touchCell}
        />
      ) : null}

      {missingValues ? (
        <Typography variant="caption" color="text.secondary" aria-live="polite">
          {missingValues} value{missingValues === 1 ? "" : "s"} to enter
        </Typography>
      ) : null}

      {profileOrderIssue ? (
        <Typography variant="caption" color="error" role="alert">{profileOrderIssue.message}</Typography>
      ) : null}

      {staleProfiles.length ? (
        <Stack spacing={0.25}>
          <Typography variant="caption" color="warning.main">
            {staleProfiles.length} saved reference{staleProfiles.length === 1 ? " needs" : "s need"} review
          </Typography>
          {staleProfiles.map((profile, index) => (
            <Stack key={profile.profileId || `stale-${index}`} direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
                Saved values for {Object.entries(profile.valuesByCriterionId || {}).map(([criterionId, savedValue]) => {
                  const criterion = leafCriteria.find((item) => item.id === criterionId);
                  return `${criterion?.name || "removed criterion"}: ${savedValue === "" ? "blank" : savedValue}`;
                }).join(" · ") || "an unmatched category"}
              </Typography>
              {!disabled ? (
                <Button size="small" color="secondary" onClick={() => removeProfile(profile.profileId)}>
                  Remove
                </Button>
              ) : null}
            </Stack>
          ))}
        </Stack>
      ) : null}

      {normalized.profiles.map((profile) => {
        const staleIds = Object.keys(profile.valuesByCriterionId || {}).filter((criterionId) =>
          !leafCriteria.some((criterion) => criterion.id === criterionId)
        );
        if (!staleIds.length) return null;
        return (
          <Stack key={`stale-values-${profile.profileId}`} direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="caption" color="warning.main" sx={{ flex: 1 }}>
              {staleIds.length} saved value{staleIds.length === 1 ? "" : "s"} for removed criteria
            </Typography>
            {!disabled ? staleIds.map((criterionId) => (
              <Button
                key={criterionId}
                size="small"
                color="secondary"
                onClick={() => removeStaleCriterionValue(profile.profileId, criterionId)}
              >
                Remove saved value
              </Button>
            )) : null}
          </Stack>
        );
      })}

      {showValidation && !missingValues && !staleProfiles.length && !profileOrderIssue && (error || validationError) ? (
        <Typography variant="caption" color="error" role="alert">{error || validationError}</Typography>
      ) : null}
    </Stack>
  );
};

export default BoundaryProfilesParameterField;
