import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  sortingFinalCategoryAlternativesSx,
  sortingFinalCategorySx,
  sortingFinalResultSx,
} from "./sortingResultGrid.styles.js";

const isValidRelativeCloseness = (value) => typeof value === "number"
  && Number.isFinite(value)
  && value >= 0
  && value <= 1;

const toScalePercent = (value) => `${Number((value * 100).toPrecision(12))}%`;

const CategoryHeader = ({ category }) => {
  const count = category.alternatives.length;
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1, minWidth: 0 }}>
      <Typography variant="subtitle1" title={category.label} sx={{ minWidth: 0, fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>
        {category.label}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ flex: "0 0 auto", whiteSpace: "nowrap" }}>
        {count} {count === 1 ? "alternative" : "alternatives"}
      </Typography>
    </Box>
  );
};

const RelativeClosenessScale = ({ alternative, range, theme }) => (
  <Box
    data-testid="sorting-relative-closeness-scale"
    data-relative-closeness={alternative.relativeCloseness}
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
    {[range?.lower, range?.upper]
      .filter(isValidRelativeCloseness)
      .map((boundary) => (
        <Box
          key={boundary}
          data-testid="sorting-relative-closeness-boundary"
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
      data-testid="sorting-relative-closeness-point"
      data-relative-closeness-value={alternative.relativeCloseness}
      aria-hidden="true"
      style={{ left: toScalePercent(alternative.relativeCloseness) }}
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

const SortingAlternativeRow = ({ alternative, range, theme, showRelativeCloseness }) => {
  const closeness = showRelativeCloseness && isValidRelativeCloseness(alternative.relativeCloseness)
    ? alternative.relativeCloseness
    : null;
  const closenessLabel = closeness === null ? null : closeness.toFixed(4);
  const accessibleLabel = closenessLabel
    ? `${alternative.name}, Relative closeness ${closenessLabel}`
    : alternative.name;

  return (
    <Box
      component="li"
      aria-label={accessibleLabel}
      data-testid="sorting-final-alternative"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: closenessLabel === null ? 0 : 0.55,
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
        <RelativeClosenessScale
          alternative={{ ...alternative, relativeCloseness: closeness }}
          range={range}
          theme={theme}
        />
      )}
    </Box>
  );
};

const SortingDashboardResult = ({ result }) => {
  const theme = useTheme();
  const showRelativeCloseness = result.metric?.key === "relativeCloseness";

  return (
    <Box
      role="list"
      aria-label="Final sorting by category"
      data-testid="sorting-final-result"
      sx={sortingFinalResultSx}
    >
      {result.categories.map((category) => {
        const alternatives = category.alternatives
          .map((alternative, index) => ({ alternative, index }))
          .sort((left, right) => {
            const leftValue = showRelativeCloseness && isValidRelativeCloseness(left.alternative.relativeCloseness)
              ? left.alternative.relativeCloseness
              : null;
            const rightValue = showRelativeCloseness && isValidRelativeCloseness(right.alternative.relativeCloseness)
              ? right.alternative.relativeCloseness
              : null;
            if (leftValue !== null && rightValue !== null && leftValue !== rightValue) return rightValue - leftValue;
            if ((leftValue !== null) !== (rightValue !== null)) return leftValue !== null ? -1 : 1;
            return left.index - right.index;
          })
          .map(({ alternative }) => alternative);

        return (
          <Box
            key={category.id}
            component="section"
            role="listitem"
            aria-label={`${category.label}: ${alternatives.length} ${alternatives.length === 1 ? "alternative" : "alternatives"}`}
            data-testid="sorting-final-category"
            sx={{ ...sortingFinalCategorySx, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.42)}` }}
          >
            <CategoryHeader category={{ ...category, alternatives }} />
            {alternatives.length ? (
              <Box component="ul" aria-label={`${category.label} alternatives`} data-testid="sorting-final-category-body" sx={sortingFinalCategoryAlternativesSx}>
                {alternatives.map((alternative) => (
                  <SortingAlternativeRow
                    key={alternative.id}
                    alternative={alternative}
                    range={category.relativeClosenessRange}
                    theme={theme}
                    showRelativeCloseness={showRelativeCloseness}
                  />
                ))}
              </Box>
            ) : (
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.65}
                aria-label="No alternatives in this category"
                data-testid="sorting-final-empty-category"
                sx={{ minWidth: 0, alignSelf: { md: "center" }, py: 0.3, color: "text.secondary" }}
              >
                <InboxOutlinedIcon
                  aria-hidden="true"
                  data-testid="sorting-final-empty-category-icon"
                  sx={{ flex: "0 0 auto", fontSize: 17, color: (currentTheme) => alpha(currentTheme.palette.secondary.light, 0.68) }}
                />
                <Typography variant="body2" sx={{ minWidth: 0, fontSize: "0.8rem", lineHeight: 1.35 }}>
                  No alternatives in this category
                </Typography>
              </Stack>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default SortingDashboardResult;
