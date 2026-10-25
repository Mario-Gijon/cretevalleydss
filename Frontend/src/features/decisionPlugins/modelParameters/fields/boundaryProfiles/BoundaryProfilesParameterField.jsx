import { useEffect, useId, useMemo, useState } from "react";
import {
  Box,
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
import { decisionMatrixSurface } from "../../../shared/styles/decisionMatrixSurface.styles.js";
import {
  getBoundaryCriterionSetupIssue,
  getBoundaryProfileCellValidation,
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
const categoryDisplayName = (category, categories) => {
  const label = category?.label?.trim() || "Category";
  const duplicateCount = categories.filter((item) => item?.label?.trim() === label).length;
  if (duplicateCount < 2) return label;
  const position = categories.findIndex((item) => item?.categoryId === category?.categoryId) + 1;
  return `${label} (${position})`;
};
const boundaryName = (lower, upper, categories) =>
  `${categoryDisplayName(lower, categories)} → ${categoryDisplayName(upper, categories)}`;
const valueFor = (profile, criterionId) => {
  const value = profile?.valuesByCriterionId?.[criterionId];
  return value === null || value === undefined ? "" : String(value);
};

const NUMERIC_DRAFT_PATTERN = /^-?(?:\d+(?:\.\d*)?|\.\d*)?$/;
const visuallyHiddenSx = {
  position: "absolute",
  width: "1px",
  height: "1px",
  p: 0,
  m: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const conciseFieldIssue = (issue) => {
  if (!issue) return "";
  if (issue.kind === "order") return "Check the category order.";
  if (/^Enter a value for/.test(issue.message)) return "Required.";
  if (/^Enter a numeric value for/.test(issue.message)) return "Enter a valid number.";
  if (/must be between/.test(issue.message)) return "Outside the allowed range.";
  return "Review this value.";
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
  const { setupIssue } = getRange(parameter, criterion, parameterContext);
  const criterionName = criterion.name?.trim() || `Criterion ${criterionIndex + 1}`;
  const hasSetupIssue = Boolean(setupIssue);
  const currentValue = valueFor(profile, criterion.id);
  const [draftText, setDraftText] = useState(currentValue);
  const [draftError, setDraftError] = useState("");
  const [hasInvalidDraft, setHasInvalidDraft] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const descriptionId = useId();
  const showFieldIssue = !hasSetupIssue && (
    Boolean(draftError) || (!isEditing && touched && Boolean(issue))
  );
  const fieldDescription = draftError || issue?.message || "";
  const shortIssue = draftError
    ? draftError === "Use numbers only."
      ? draftError
      : conciseFieldIssue({ kind: "field", message: draftError })
    : conciseFieldIssue(issue);

  useEffect(() => {
    if (isEditing || hasInvalidDraft) return;
    setDraftText(currentValue);
    setDraftError("");
  }, [currentValue, hasInvalidDraft, isEditing]);

  const handleBlur = () => {
    onTouch();
    setIsEditing(false);
    const validation = getBoundaryProfileCellValidation(
      parameter,
      criterion,
      draftText,
      parameterContext
    );
    if (validation.kind === null) {
      onValueChange(criterion.id, validation.value);
      setDraftText(String(validation.value));
      setDraftError("");
      setHasInvalidDraft(false);
    } else {
      const message = validation.kind === "required"
        ? `Enter a value for ${criterionName} in the ${boundary} boundary.`
        : validation.kind === "numeric"
          ? `Enter a numeric value for ${criterionName} in the ${boundary} boundary.`
          : validation.message;
      onValueChange(criterion.id, "");
      setDraftError(message);
      setHasInvalidDraft(true);
      if (validation.kind === "required") {
        setDraftText("");
      }
    }
  };

  const handleChange = (nextValue) => {
    if (!NUMERIC_DRAFT_PATTERN.test(nextValue)) {
      setDraftError("Use numbers only.");
      return;
    }
    setDraftText(nextValue);
    setDraftError("");
  };

  const handleFocus = () => {
    setIsEditing(true);
    setDraftError("");
  };

  return (
    <Box sx={{ position: "relative", minWidth: 0 }}>
      <Tooltip title={showFieldIssue ? shortIssue : ""} describeChild placement="top" enterDelay={300}>
        <TextField
          type="text"
          size="small"
          color="secondary"
          fullWidth
          value={draftText}
          onFocus={handleFocus}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={handleBlur}
          disabled={disabled || hasSetupIssue}
          error={showFieldIssue}
          inputProps={{
            "aria-label": `${criterionName} reference in ${boundary}`,
            "aria-invalid": showFieldIssue || undefined,
            "aria-describedby": showFieldIssue ? descriptionId : undefined,
            inputMode: "decimal",
            autoComplete: "off",
          }}
          sx={{
            minWidth: { xs: 96, md: 105 },
            "& .MuiInputBase-input": { py: 0.65 },
            "& .MuiOutlinedInput-root": {
              minHeight: 36,
              bgcolor: decisionMatrixSurface.inputBackground,
              "& .MuiOutlinedInput-notchedOutline": { border: decisionMatrixSurface.inputBorder },
              "&:hover .MuiOutlinedInput-notchedOutline": { border: decisionMatrixSurface.inputHoverBorder },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "secondary.main", borderWidth: 1 },
              "&.Mui-error .MuiOutlinedInput-notchedOutline, &.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "error.main",
                borderWidth: 1,
              },
              "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.01)" },
              "&.Mui-disabled .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.08)" },
            },
          }}
        />
      </Tooltip>
      {showFieldIssue && fieldDescription ? (
        <Box id={descriptionId} component="span" sx={visuallyHiddenSx}>
          {fieldDescription}
        </Box>
      ) : null}
    </Box>
  );
};

const BoundaryTable = ({
  criteria,
  boundaries,
  categories,
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
  const criterionColumnWidth = isMobileViewport ? 130 : 190;
  const boundaryColumnWidth = isMobileViewport ? 160 : 190;

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
            width: criterionColumnWidth,
            minWidth: criterionColumnWidth,
            maxWidth: criterionColumnWidth,
            py: 0.5,
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
                width: boundaryColumnWidth,
                minWidth: boundaryColumnWidth,
                maxWidth: boundaryColumnWidth,
                py: 0.4,
                bgcolor: decisionMatrixSurface.cellBackground,
                borderRight: decisionMatrixSurface.cellBorder,
                borderBottom: decisionMatrixSurface.cellBorder,
              })}
            >
              {profile ? (
                <BoundaryValueField
                  key={`${profile.profileId}:${criterion.id}:${boundary.lowerCategory.categoryId}:${boundary.upperCategory.categoryId}`}
                  profile={profile}
                  criterion={criterion}
                  criterionIndex={criterionIndex}
                  boundary={boundaryName(boundary.lowerCategory, boundary.upperCategory, categories)}
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
            width: criterionColumnWidth,
            minWidth: criterionColumnWidth,
            maxWidth: criterionColumnWidth,
            py: 0.55,
          })}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Criterion</Typography>
        </TableCell>
        {activeBoundaries.map((boundary) => {
          const label = boundaryName(boundary.lowerCategory, boundary.upperCategory, categories);
          return (
            <TableCell
              key={boundary.upperCategory.categoryId}
              scope="col"
              aria-label={label}
              sx={() => ({
                position: "sticky",
                top: 0,
                zIndex: 2,
                bgcolor: decisionMatrixSurface.headerBackground,
                borderRight: decisionMatrixSurface.cellBorder,
                borderBottom: decisionMatrixSurface.cellBorder,
                width: boundaryColumnWidth,
                minWidth: boundaryColumnWidth,
                maxWidth: boundaryColumnWidth,
                py: 0.55,
              })}
            >
              {isMobileViewport ? (
                <Typography
                  variant="caption"
                  aria-label={label}
                  sx={{ display: "block", fontWeight: 700, whiteSpace: "normal", overflowWrap: "anywhere" }}
                >
                  {label}
                </Typography>
              ) : (
                <Tooltip title={label} placement="top" enterDelay={350}>
                  <Typography
                    component="span"
                    tabIndex={0}
                    aria-label={label}
                    variant="caption"
                    sx={{ display: "block", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}
                  >
                    {label}
                  </Typography>
                </Tooltip>
              )}
            </TableCell>
          );
        })}
      </TableRow>
    </TableHead>
  );

  const renderTable = (activeBoundaries) => (
    <TableContainer
      sx={(theme) => ({
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        maxHeight: { xs: 440, md: 520 },
        overflow: "auto",
        bgcolor: decisionMatrixSurface.cellBackground,
        border: `1px solid ${alpha(theme.palette.common.white, 0.075)}`,
        borderRadius: 1,
        "& tbody .MuiTableRow-root:hover .MuiTableCell-root": {
          bgcolor: decisionMatrixSurface.cellBackground,
        },
        "& tbody .MuiTableRow-root > th[scope='row']": {
          bgcolor: decisionMatrixSurface.headerBackground,
          fontWeight: 800,
        },
      })}
    >
      <Table
        size="small"
        stickyHeader
        aria-label="Classification reference values"
        sx={{
          tableLayout: "fixed",
          width: "100%",
          minWidth: criterionColumnWidth + boundaryColumnWidth * activeBoundaries.length,
        }}
      >
        {renderHeader(activeBoundaries)}
        <TableBody>{renderRows(activeBoundaries)}</TableBody>
      </Table>
    </TableContainer>
  );

  const activeBoundaries = isMobileViewport && selectedBoundary ? [selectedBoundary] : boundaries;
  return renderTable(activeBoundaries);
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
  const expectedCategoryIds = new Set(categories.slice(1).map((category) => category?.categoryId));
  normalized.profiles.forEach((profile) => {
    if (!expectedCategoryIds.has(profile.categoryId) || profilesByCategory.has(profile.categoryId)) {
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
  const profileOrderIssue = showValidation
    ? issues.find((issue) => issue.kind === "profile-order" || (issue.kind !== "field" && issue.kind !== "stale-profile" && issue.kind !== "stale-criterion" && !issue.criterionId))
    : null;
  const hasCellIssues = issues.some((issue) => issue.kind === "field" || issue.kind === "order");
  const actionableCellIssueCount = issues.filter((issue) => issue.kind === "field" || issue.kind === "order")
    .filter((issue) => {
      const criterion = leafCriteria.find((item) => item?.id === issue.criterionId);
      return criterion && !getRange(parameter, criterion, parameterContext).setupIssue;
    }).length;

  return (
    <Stack spacing={0.65} sx={{ minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={0.5}
        sx={{ minWidth: 0 }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>Classification references</Typography>
          <Tooltip title="Each column is one complete reference between adjacent categories. Discrete criteria can use values between domain steps.">
            <IconButton size="small" aria-label="About classification references">
              <InfoOutlinedIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {categories.length < 2 ? (
        <Typography variant="caption" color="text.secondary">Add at least two categories to set their references.</Typography>
      ) : null}
      {!leafCriteria.length ? (
        <Typography variant="caption" color="text.secondary">Add criteria to set classification references.</Typography>
      ) : null}

      {boundaries.length > 1 ? (
        <FormControl size="small" sx={{ display: { xs: "block", md: "none" }, width: "100%", minWidth: 0 }}>
          <Select
            value={selectedBoundary?.upperCategory?.categoryId || ""}
            onChange={(event) => setSelectedBoundaryCategoryId(event.target.value)}
            color="secondary"
            inputProps={{ "aria-label": "Classification reference" }}
            sx={{
              "& .MuiSelect-select": { minWidth: 0, whiteSpace: "normal", overflowWrap: "anywhere", py: 0.8 },
            }}
            MenuProps={{
              PaperProps: { sx: { maxWidth: "calc(100vw - 32px)" } },
            }}
          >
            {boundaries.map((boundary) => (
              <MenuItem
                key={boundary.upperCategory.categoryId}
                value={boundary.upperCategory.categoryId}
                sx={{ whiteSpace: "normal", overflowWrap: "anywhere" }}
              >
                {boundaryName(boundary.lowerCategory, boundary.upperCategory, categories)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : boundaries.length === 1 ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "block", md: "none" } }}>
          {boundaryName(boundaries[0].lowerCategory, boundaries[0].upperCategory, categories)}
        </Typography>
      ) : null}

      {boundaries.length && leafCriteria.length ? (
        <BoundaryTable
          criteria={leafCriteria}
          boundaries={boundaries}
          categories={categories}
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

      {showValidation && actionableCellIssueCount > 0 ? (
        <Typography variant="caption" color="error.main" role="status">
          Review the {actionableCellIssueCount} highlighted reference {actionableCellIssueCount === 1 ? "cell" : "cells"}.
        </Typography>
      ) : null}

      {profileOrderIssue ? (
        <Typography variant="caption" color="error" role="alert">{profileOrderIssue.message}</Typography>
      ) : null}

      {showValidation && !profileOrderIssue && !hasCellIssues && (error || validationError) ? (
        <Typography variant="caption" color="error" role="alert">{error || validationError}</Typography>
      ) : null}
    </Stack>
  );
};

export default BoundaryProfilesParameterField;
