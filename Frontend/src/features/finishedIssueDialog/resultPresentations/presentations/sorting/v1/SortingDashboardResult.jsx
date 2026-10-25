import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import {
  sortingResultGridSx,
  topsisSortCategoryBodySx,
  topsisSortCategoryCardSx,
  topsisSortResultGridSx,
} from "./sortingResultGrid.styles.js";

const isValidCloseness = (value) => typeof value === "number"
  && Number.isFinite(value)
  && value >= 0
  && value <= 1;

const CategoryHeader = ({ category, theme, compact = false }) => (
  <Stack direction="row" spacing={0.8} alignItems={compact ? "center" : "flex-start"} justifyContent="space-between" sx={{ minWidth: 0, mb: compact ? 0.8 : 1 }}>
    <Stack direction="row" spacing={0.7} alignItems={compact ? "center" : "flex-start"} sx={{ minWidth: 0 }}>
      <CategoryRoundedIcon sx={{ flex: "0 0 auto", mt: compact ? 0 : 0.1, fontSize: 18, color: "secondary.light" }} aria-hidden="true" />
      <Typography variant="subtitle1" title={category.label} sx={{ minWidth: 0, fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>
        {category.label}
      </Typography>
    </Stack>
    <Chip
      size="small"
      label={category.alternatives.length}
      aria-label={`${category.alternatives.length} alternatives`}
      sx={{ flex: "0 0 auto", color: "text.secondary", bgcolor: alpha(theme.palette.common.white, 0.055) }}
    />
  </Stack>
);

const TopsisSortAlternativeRow = ({ alternative, theme }) => {
  const closeness = isValidCloseness(alternative.closeness) ? alternative.closeness : null;
  const closenessLabel = closeness === null ? null : closeness.toFixed(4);
  const accessibleLabel = closenessLabel
    ? `${alternative.name}, Relative closeness ${closenessLabel}`
    : alternative.name;

  return (
    <Box
      component="li"
      aria-label={accessibleLabel}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.55,
        minWidth: 0,
        px: 0.9,
        py: 0.7,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        "&:last-of-type": { borderBottom: 0 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1, minWidth: 0 }}>
        <Typography variant="body2" title={alternative.name} sx={{ minWidth: 0, fontWeight: 550, overflowWrap: "anywhere", lineHeight: 1.3 }}>
          {alternative.name}
        </Typography>
        {closenessLabel !== null && (
          <Typography
            variant="body2"
            color="text.secondary"
            aria-label={`Relative closeness ${closenessLabel}`}
            sx={{ flex: "0 0 auto", fontSize: "0.8rem", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
          >
            {closenessLabel}
          </Typography>
        )}
      </Box>
      {closeness !== null && (
        <Box
          role="meter"
          aria-label="Relative closeness"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={closeness}
          sx={{ height: 6, width: "100%", overflow: "hidden", borderRadius: 99, bgcolor: alpha(theme.palette.common.black, 0.38) }}
        >
          <Box
            data-testid="topsis-sort-closeness-fill"
            aria-hidden="true"
            style={{ width: `${closeness * 100}%` }}
            sx={{ height: "100%", borderRadius: 99, bgcolor: "secondary.main", transition: "width 180ms ease" }}
          />
        </Box>
      )}
    </Box>
  );
};

const TopsisSortDashboardResult = ({ result, theme }) => (
  <Box role="list" aria-label="Final sorting by category" sx={topsisSortResultGridSx}>
    {result.categories.map((category) => {
      const alternatives = category.alternatives
        .map((alternative, index) => ({ alternative, index }))
        .sort((left, right) => {
          const leftClosenessValid = isValidCloseness(left.alternative.closeness);
          const rightClosenessValid = isValidCloseness(right.alternative.closeness);
          if (leftClosenessValid && rightClosenessValid && left.alternative.closeness !== right.alternative.closeness) {
            return right.alternative.closeness - left.alternative.closeness;
          }
          if (leftClosenessValid !== rightClosenessValid) return leftClosenessValid ? -1 : 1;
          return left.index - right.index;
        })
        .map(({ alternative }) => alternative);
      return (
        <Box
          key={category.id}
          role="listitem"
          aria-label={category.label}
          sx={{
            ...topsisSortCategoryCardSx,
            p: { xs: 1, sm: 1.2 },
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.55),
          }}
        >
          <Typography variant="subtitle1" title={category.label} sx={{ mb: 0.75, minWidth: 0, fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>
            {category.label}
          </Typography>
          {alternatives.length ? (
            <Box component="ul" aria-label={`${category.label} alternatives`} data-testid="topsis-sort-category-body" sx={{ ...topsisSortCategoryBodySx, listStyle: "none", p: 0, m: 0 }}>
              {alternatives.map((alternative) => (
                <TopsisSortAlternativeRow key={alternative.id} alternative={alternative} theme={theme} />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No alternatives assigned</Typography>
          )}
        </Box>
      );
    })}
  </Box>
);

const StandardSortingDashboardResult = ({ result, theme }) => (
  <Box role="list" aria-label="Final sorting by category" sx={sortingResultGridSx}>
    {result.categories.map((category) => (
      <Box
        key={category.id}
        role="listitem"
        aria-label={`${category.label}: ${category.alternatives.length} ${category.alternatives.length === 1 ? "alternative" : "alternatives"}`}
        sx={{ minWidth: 0, p: { xs: 1.15, sm: 1.35 }, borderRadius: 2, border: "1px solid rgba(85, 199, 216, 0.18)", bgcolor: alpha(theme.palette.common.white, 0.025) }}
      >
        <CategoryHeader category={category} theme={theme} />
        {category.alternatives.length ? (
          <Stack component="ul" spacing={0.65} sx={{ listStyle: "none", p: 0, m: 0 }}>
            {category.alternatives.map((alternative) => (
              <Stack component="li" key={alternative.id} direction="row" spacing={0.8} alignItems="flex-start" sx={{ minWidth: 0 }}>
                <Box aria-hidden="true" sx={{ width: 5, height: 5, flex: "0 0 5px", mt: "7px", borderRadius: "50%", bgcolor: "secondary.light" }} />
                <Typography variant="body2" title={alternative.name} sx={{ minWidth: 0, overflowWrap: "anywhere", lineHeight: 1.45 }}>
                  {alternative.name}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">No alternatives assigned.</Typography>
        )}
      </Box>
    ))}
  </Box>
);

const SortingDashboardResult = ({ result }) => {
  const theme = useTheme();
  return result.displayMode === "topsis-sort"
    ? <TopsisSortDashboardResult result={result} theme={theme} />
    : <StandardSortingDashboardResult result={result} theme={theme} />;
};

export default SortingDashboardResult;
