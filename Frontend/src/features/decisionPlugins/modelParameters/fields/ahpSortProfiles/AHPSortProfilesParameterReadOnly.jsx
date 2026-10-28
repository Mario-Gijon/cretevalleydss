import { Box, Chip, Stack, Typography } from "@mui/material";
import { getParameterValueByStructureKey } from "../../../../modelParameters/context";
import { describeAHPSortProfileForDisplay } from "./ahpSortProfilesValues.js";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export const AHPSortProfilesParameterReadOnly = ({ value, parameterContext }) => {
  if (!isObject(value) || (value.mode !== "limiting" && value.mode !== "central")) {
    return <Typography variant="body2" color="text.secondary">No AHPSort I profile method is configured.</Typography>;
  }

  const categoriesValue = getParameterValueByStructureKey(parameterContext, "orderedCategories");
  const categories = Array.isArray(categoriesValue) ? [...categoriesValue] : [];
  categories.sort((left, right) => (left?.order ?? 0) - (right?.order ?? 0));
  const profiles = Array.isArray(value.profiles) ? value.profiles : [];
  const expected = value.mode === "central"
    ? categories.map((category) => ({ categoryId: category?.categoryId }))
    : categories.slice(1).map((category, index) => ({
        lowerCategoryId: categories[index]?.categoryId,
        upperCategoryId: category?.categoryId,
      }));
  const matchedProfiles = new Set();
  const rows = expected.map((association, index) => {
    const profile = profiles.find((item) => Object.entries(association).every(([key, id]) => item?.[key] === id));
    if (profile) matchedProfiles.add(profile);
    return {
      key: profile?.profileId || `${value.mode}-${index}`,
      label: describeAHPSortProfileForDisplay(value.mode, association, categories),
      configured: Boolean(profile?.profileId),
    };
  });
  profiles.forEach((profile, index) => {
    if (profile && matchedProfiles.has(profile)) return;
    rows.push({
      key: profile?.profileId || `unmatched-${index}`,
      label: describeAHPSortProfileForDisplay(value.mode, profile, categories),
      configured: false,
    });
  });

  return (
    <Stack spacing={0.9}>
      <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
        <Chip
          size="small"
          variant="outlined"
          color="secondary"
          label={value.mode === "limiting" ? "Limiting profiles" : "Central profiles"}
        />
        {value.mode === "central" ? (
          <Typography variant="body2" color="text.secondary">
            Equal-distance preference: {value.tiePolicy === "optimistic"
              ? "more preferred category"
              : value.tiePolicy === "pessimistic"
                ? "less preferred category"
                : "needs review"}
          </Typography>
        ) : null}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {value.mode === "limiting"
          ? "One profile between each pair of neighboring categories."
          : "One representative profile for each category."}
      </Typography>
      {rows.length ? (
        <Stack component="ul" role="list" aria-label="AHPSort I profiles in preference order" spacing={0} sx={{ listStyle: "none", m: 0, p: 0 }}>
          {rows.map((row) => (
            <Box key={row.key} component="li" role="listitem" sx={{ py: 0.55, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="body2" color={row.configured ? "text.primary" : "text.secondary"}>
                {row.label}
                {!row.configured ? " · needs review" : ""}
              </Typography>
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">No profiles configured.</Typography>
      )}
    </Stack>
  );
};

export default AHPSortProfilesParameterReadOnly;
