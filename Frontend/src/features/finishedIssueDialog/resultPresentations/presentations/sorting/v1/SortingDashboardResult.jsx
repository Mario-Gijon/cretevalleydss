import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  sortingResultGridSx,
  topsisSortCategoryGroupSx,
  topsisSortCategorySx,
  topsisSortResultGridSx,
} from "./sortingResultGrid.styles.js";

const isValidCloseness = (value) => typeof value === "number"
  && Number.isFinite(value)
  && value >= 0
  && value <= 1;
const toScalePercent = (value) => `${Number((value * 100).toPrecision(12))}%`;

const CategoryHeader = ({ category }) => (
  <Box sx={{ minWidth: 0, pr: { md: 1.5 } }}>
    <Typography variant="subtitle1" title={category.label} sx={{ minWidth: 0, fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>
      {category.label}
    </Typography>
    {formatClosenessInterval(category.closenessInterval) && (
      <Typography
        variant="caption"
        aria-label="Closeness interval"
        data-testid="topsis-sort-closeness-interval"
        sx={{ display: "block", mt: 0.35, color: "text.secondary", fontVariantNumeric: "tabular-nums", lineHeight: 1.35, overflowWrap: "anywhere" }}
      >
        {formatClosenessInterval(category.closenessInterval)}
      </Typography>
    )}
  </Box>
);

const formatClosenessInterval = (interval) => {
  if (!interval) return null;
  if (interval.lower === null && isValidCloseness(interval.upper)) {
    return `Closeness < ${interval.upper.toFixed(4)}`;
  }
  if (isValidCloseness(interval.lower) && interval.upper === null) {
    return `Closeness > ${interval.lower.toFixed(4)}`;
  }
  if (isValidCloseness(interval.lower) && isValidCloseness(interval.upper)) {
    return `${interval.lower.toFixed(4)} < Closeness < ${interval.upper.toFixed(4)}`;
  }
  return null;
};

const TopsisSortAlternativeScale = ({ alternative, interval, theme }) => (
  <Box
    data-testid="topsis-sort-closeness-scale"
    data-closeness={alternative.closeness}
    aria-hidden="true"
    sx={{ position: "relative", height: 12, mx: 0.45, overflow: "visible" }}
  >
    <Box
      sx={{
        position: "absolute",
        top: "50%",
        left: 0,
        right: 0,
        height: "1px",
        transform: "translateY(-50%)",
        bgcolor: alpha(theme.palette.secondary.main, 0.34),
      }}
    />
    {[interval?.lower, interval?.upper]
      .filter(isValidCloseness)
      .map((boundary) => (
        <Box
          key={boundary}
          data-testid="topsis-sort-boundary-marker"
          data-boundary-value={boundary}
          aria-hidden="true"
          style={{ left: toScalePercent(boundary) }}
          sx={{
            position: "absolute",
            top: 1,
            height: 10,
            borderLeft: `1px dashed ${alpha(theme.palette.text.secondary, 0.8)}`,
            transform: "translateX(-50%)",
          }}
        />
      ))}
    <Box
      data-testid="topsis-sort-closeness-point"
      data-closeness-value={alternative.closeness}
      aria-hidden="true"
      style={{ left: toScalePercent(alternative.closeness) }}
      sx={{
        position: "absolute",
        top: "50%",
        width: 7,
        height: 7,
        borderRadius: "50%",
        bgcolor: "secondary.main",
        transform: "translate(-50%, -50%)",
      }}
    />
  </Box>
);

const TopsisSortAlternativeRow = ({ alternative, interval, theme }) => {
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
      {closeness !== null && <TopsisSortAlternativeScale alternative={{ ...alternative, closeness }} interval={interval} theme={theme} />}
    </Box>
  );
};

const TopsisSortDashboardResult = ({ result, theme }) => (
  <Box role="list" aria-label="Final sorting by category" data-testid="topsis-sort-category-list" sx={topsisSortResultGridSx}>
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
          component="section"
          role="listitem"
          aria-label={category.label}
          data-testid="topsis-sort-category"
          sx={{ ...topsisSortCategorySx, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.42)}` }}
        >
          <CategoryHeader category={category} />
          {alternatives.length ? (
            <Box component="ul" aria-label={`${category.label} alternatives`} data-testid="topsis-sort-category-body" sx={topsisSortCategoryGroupSx}>
              {alternatives.map((alternative) => (
                <TopsisSortAlternativeRow key={alternative.id} alternative={alternative} interval={category.closenessInterval} theme={theme} />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, alignSelf: { md: "center" }, py: 0.3, fontSize: "0.82rem" }}>
              No alternatives assigned
            </Typography>
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
