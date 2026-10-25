import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { alpha } from "@mui/material/styles";
import { getParameterValueByStructureKey } from "../../../../modelParameters/context";
import { decisionMatrixSurface } from "../../../shared/styles/decisionMatrixSurface.styles.js";
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
        "& .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "transparent",
        },
        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: "secondary.main",
          borderWidth: 1,
        },
        "& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline, & .MuiOutlinedInput-root.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: "error.main",
          borderWidth: 1,
        },
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
          sx={() => ({
            position: "sticky",
            left: 0,
            zIndex: 1,
            // Keep the sticky criterion column opaque while the table scrolls.
            bgcolor: decisionMatrixSurface.headerBackground,
            borderRight: decisionMatrixSurface.cellBorder,
            borderBottom: decisionMatrixSurface.cellBorder,
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
              sx={() => ({
                minWidth: { xs: 130, md: 165 },
                py: 0.45,
                bgcolor: decisionMatrixSurface.cellBackground,
                borderRight: decisionMatrixSurface.cellBorder,
                borderBottom: decisionMatrixSurface.cellBorder,
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
          sx={() => ({
            position: "sticky",
            top: 0,
            left: 0,
            zIndex: 3,
            bgcolor: decisionMatrixSurface.headerBackground,
            borderRight: decisionMatrixSurface.cellBorder,
            borderBottom: decisionMatrixSurface.cellBorder,
            minWidth: { xs: 115, md: 190 },
            py: 0.6,
          })}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Criterion</Typography>
        </TableCell>
        {activeBoundaries.map((boundary) => (
          <TableCell
            key={boundary.upperCategory.categoryId}
            sx={() => ({
              position: "sticky",
              top: 0,
              zIndex: 2,
              bgcolor: decisionMatrixSurface.headerBackground,
              borderRight: decisionMatrixSurface.cellBorder,
              borderBottom: decisionMatrixSurface.cellBorder,
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
        bgcolor: decisionMatrixSurface.cellBackground,
        border: `1px solid ${alpha(theme.palette.common.white, 0.075)}`,
        borderRadius: 1,
        "& tbody .MuiTableRow-root:hover .MuiTableCell-root": {
          bgcolor: decisionMatrixSurface.cellBackground,
        },
        "& tbody .MuiTableCell-root:first-of-type": {
          bgcolor: decisionMatrixSurface.headerBackground,
          fontWeight: 800,
        },
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
  const [confirmOutdatedRemoval, setConfirmOutdatedRemoval] = useState(false);
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

  const liveCriterionIds = new Set(leafCriteria.map((criterion) => criterion.id));
  const staleCriterionValueCount = normalized.profiles.reduce((count, profile) =>
    count + Object.keys(profile.valuesByCriterionId || {}).filter((id) => !liveCriterionIds.has(id)).length, 0);
  const hasOutdatedReferences = staleProfiles.length > 0 || staleCriterionValueCount > 0;
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
  const removeOutdatedReferences = () => {
    const retainedCategoryIds = new Set();
    const profiles = normalized.profiles
      .filter((profile) => {
        if (!expectedCategoryIds.has(profile.categoryId) || retainedCategoryIds.has(profile.categoryId)) return false;
        retainedCategoryIds.add(profile.categoryId);
        return true;
      })
      .map((profile) => ({
        ...profile,
        valuesByCriterionId: Object.fromEntries(
          Object.entries(profile.valuesByCriterionId || {}).filter(([criterionId]) => liveCriterionIds.has(criterionId))
        ),
      }));
    onChange({ profiles });
    setConfirmOutdatedRemoval(false);
  };
  const profileOrderIssue = showValidation
    ? issues.find((issue) => issue.kind === "profile-order" || (issue.kind !== "field" && issue.kind !== "stale-profile" && issue.kind !== "stale-criterion" && !issue.criterionId))
    : null;
  const hasFieldIssues = issues.some((issue) => issue.kind === "field");

  return (
    <Stack spacing={0.65} sx={{ minWidth: 0 }}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Classification references</Typography>
        <Tooltip title="Each column is one complete reference between adjacent categories. Discrete criteria can use values between domain steps.">
          <IconButton size="small" aria-label="About classification references">
            <InfoOutlinedIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
        {hasOutdatedReferences && !disabled ? (
          <Tooltip title="Remove references tied to categories or criteria that no longer exist">
            <IconButton
              size="small"
              color="secondary"
              aria-label="Review outdated classification references"
              onClick={() => setConfirmOutdatedRemoval(true)}
            >
              <DeleteOutlineRoundedIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        ) : null}
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

      {profileOrderIssue ? (
        <Typography variant="caption" color="error" role="alert">{profileOrderIssue.message}</Typography>
      ) : null}

      {showValidation && hasOutdatedReferences ? (
        <Typography variant="caption" color="error" role="alert">
          Review outdated references before continuing.
        </Typography>
      ) : null}

      {showValidation && !profileOrderIssue && !hasOutdatedReferences && !hasFieldIssues && (error || validationError) ? (
        <Typography variant="caption" color="error" role="alert">{error || validationError}</Typography>
      ) : null}

      <Dialog
        open={confirmOutdatedRemoval}
        onClose={() => setConfirmOutdatedRemoval(false)}
        aria-labelledby="outdated-classification-references-title"
      >
        <DialogTitle id="outdated-classification-references-title">Remove outdated references?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Removed categories, removed criteria, and duplicate references will be deleted. The remaining references will be kept.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setConfirmOutdatedRemoval(false)}>Keep references</Button>
          <Button variant="outlined" color="secondary" size="small" onClick={removeOutdatedReferences}>
            Remove outdated references
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default BoundaryProfilesParameterField;
