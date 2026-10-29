import { Box, Stack, Typography } from "@mui/material";
import OrderedCategoriesParameterField from "../orderedCategories/OrderedCategoriesParameterField.jsx";
import AHPSortGroupParameterField from "../ahpSortGroup/AHPSortGroupParameterField.jsx";
import AHPSortTiePreferenceField from "./AHPSortTiePreferenceField.jsx";
import AHPSortProfilesParameterField from "./AHPSortProfilesParameterField.jsx";

export const AHPSortClassificationParameterGroup = ({
  parametersByStructureKey,
  valuesByParameterKey,
  errorsByParameterKey,
  onChange,
  inspectDependencyChange,
  disabled,
  showValidation,
  parameterContext,
}) => {
  const categoriesParameter = parametersByStructureKey.orderedCategories;
  const profilesParameter = parametersByStructureKey.ahpSortProfiles;
  const groupParameter = parametersByStructureKey.ahpSortGroup;
  if (!categoriesParameter || !profilesParameter || !groupParameter) return null;

  const selectedExpertCount = Number.isInteger(parameterContext?.selectedExpertCount)
    ? parameterContext.selectedExpertCount
    : 0;
  const categories = valuesByParameterKey[categoriesParameter.key];
  const profileValue = valuesByParameterKey[profilesParameter.key] || {};
  const groupValue = valuesByParameterKey[groupParameter.key] || {};
  const mode = profileValue.mode === "limiting" || profileValue.mode === "central"
    ? profileValue.mode
    : "";
  const profiles = Array.isArray(profileValue.profiles) ? profileValue.profiles : [];
  const profileError = errorsByParameterKey[profilesParameter.key] || "";
  const distanceTieMissing = mode === "central" &&
    profileValue.tiePolicy !== "optimistic" && profileValue.tiePolicy !== "pessimistic";
  const groupTieMissing = selectedExpertCount >= 2 &&
    groupValue.tiePolicy !== "optimistic" && groupValue.tiePolicy !== "pessimistic";
  const showGroupTie = selectedExpertCount >= 2;
  const showDistanceTie = mode === "central";
  const showBothTiePreferences = showGroupTie && showDistanceTie;

  const updateDistanceTiePolicy = (tiePolicy) => {
    const nextValue = { ...profileValue };
    if (tiePolicy === undefined) delete nextValue.tiePolicy;
    else nextValue.tiePolicy = tiePolicy;
    onChange(profilesParameter, nextValue);
  };

  return (
    <Stack spacing={1.2} sx={{ minWidth: 0 }}>
      {selectedExpertCount >= 2 || mode === "central" ? (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 750, mb: 0.65 }}>Tie preferences</Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: showBothTiePreferences ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
              },
              gap: 1.2,
              minWidth: 0,
            }}
          >
            {showGroupTie ? (
              <AHPSortGroupParameterField
                parameter={groupParameter}
                value={groupValue}
                onChange={(tiePolicyValue) => onChange(groupParameter, tiePolicyValue)}
                error={groupTieMissing ? errorsByParameterKey[groupParameter.key] || "Choose an equal-vote preference for group classification." : ""}
                showValidation={showValidation}
                disabled={disabled}
                parameterContext={parameterContext}
              />
            ) : null}
            {showDistanceTie ? (
              <AHPSortTiePreferenceField
                label="Equal-distance preference"
                info="Choose which category is assigned when an alternative is equally close to two category centers."
                value={profileValue.tiePolicy}
                onChange={updateDistanceTiePolicy}
                error={distanceTieMissing ? profileError || "Choose how equally close category centers should be handled." : ""}
                showValidation={showValidation}
                disabled={disabled}
              />
            ) : null}
          </Box>
        </Box>
      ) : null}

      <AHPSortProfilesParameterField
        parameter={profilesParameter}
        value={valuesByParameterKey[profilesParameter.key]}
        onChange={(nextValue) => onChange(profilesParameter, nextValue)}
        error={distanceTieMissing ? "" : profileError}
        disabled={disabled}
        showValidation={showValidation}
        parameterContext={parameterContext}
      />

      <OrderedCategoriesParameterField
        parameter={categoriesParameter}
        value={categories}
        onChange={(nextValue) => onChange(categoriesParameter, nextValue)}
        error={errorsByParameterKey[categoriesParameter.key] || ""}
        disabled={disabled}
        showValidation={showValidation}
        inspectDependencyChange={(nextValue) => inspectDependencyChange(categoriesParameter, nextValue)}
        infoTooltip="Categories define the names and preference order of the groups. They do not have numeric scores. Experts compare alternatives with their profiles during evaluation."
      />

      {mode ? (
        <Stack spacing={0.2} aria-live="polite" data-testid="ahpsort-profile-summary">
          <Typography variant="caption" color="text.secondary">
            {profiles.length} {mode === "limiting" ? "boundary" : "central"} profile{profiles.length === 1 ? "" : "s"} generated automatically.
          </Typography>
          <Stack direction="row" spacing={0.25} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Comparisons are completed during expert evaluation.
            </Typography>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
};

export default AHPSortClassificationParameterGroup;
