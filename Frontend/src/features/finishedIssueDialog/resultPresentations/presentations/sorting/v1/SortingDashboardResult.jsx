import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import {
  sortingResultGridSx,
  topsisSortCategoryBodySx,
  topsisSortCategoryCardSx,
  topsisSortResultGridSx,
} from "./sortingResultGrid.styles.js";

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
  const closenessLabel = typeof alternative.closeness === "number" ? alternative.closeness.toFixed(4) : "—";
  const position = typeof alternative.relativePosition === "number" ? alternative.relativePosition : null;
  const accessibleLabel = [
    alternative.name,
    `Relative closeness ${closenessLabel}`,
    alternative.proximity,
  ].filter(Boolean).join(", ");

  return (
    <Box
      component="li"
      aria-label={accessibleLabel}
      sx={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        columnGap: 1,
        rowGap: 0.35,
        minWidth: 0,
        px: 0.7,
        py: 0.45,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.42)}`,
        "&:last-of-type": { borderBottom: 0 },
      }}
    >
      <Typography variant="body2" title={alternative.name} sx={{ minWidth: 0, fontWeight: 550, overflowWrap: "anywhere", lineHeight: 1.25 }}>
        {alternative.name}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        aria-label={`Relative closeness ${closenessLabel}`}
        sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
      >
        {closenessLabel}
      </Typography>
      {position !== null && (
        <Box
          role="img"
          aria-label={`Position within category: ${Math.round(position * 100)}%`}
          sx={{
            gridColumn: "1 / -1",
            position: "relative",
            height: 5,
            borderRadius: 99,
            bgcolor: alpha(theme.palette.secondary.main, 0.18),
            overflow: "visible",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: `${position * 100}%`,
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "secondary.light",
              border: `2px solid ${theme.palette.background.paper}`,
              boxShadow: `0 0 0 1px ${alpha(theme.palette.secondary.light, 0.5)}`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </Box>
      )}
      {alternative.proximity && (
        <Chip
          size="small"
          label={alternative.proximity}
          sx={{
            gridColumn: "1 / -1",
            justifySelf: "start",
            maxWidth: "100%",
            height: 20,
            color: "text.secondary",
            bgcolor: alpha(theme.palette.secondary.main, 0.08),
            "& .MuiChip-label": { px: 0.75, fontSize: "0.68rem", lineHeight: 1.1, whiteSpace: "nowrap" },
          }}
        />
      )}
    </Box>
  );
};

const TopsisSortDashboardResult = ({ result, theme }) => (
  <Box role="list" aria-label="Final sorting by category" sx={topsisSortResultGridSx}>
    {result.categories.map((category) => {
      const alternatives = [...category.alternatives].sort((left, right) => {
        const leftValue = left.relativePosition ?? left.closeness ?? Number.NEGATIVE_INFINITY;
        const rightValue = right.relativePosition ?? right.closeness ?? Number.NEGATIVE_INFINITY;
        return rightValue - leftValue || left.name.localeCompare(right.name);
      });
      return (
        <Box
          key={category.id}
          role="listitem"
          aria-label={`${category.label}: ${alternatives.length} ${alternatives.length === 1 ? "alternative" : "alternatives"}`}
          sx={{
            ...topsisSortCategoryCardSx,
            p: { xs: 1, sm: 1.2 },
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.55),
          }}
        >
          <CategoryHeader category={category} theme={theme} compact />
          {alternatives.length ? (
            <Box component="ul" aria-label={`${category.label} alternatives`} data-testid="topsis-sort-category-body" sx={{ ...topsisSortCategoryBodySx, listStyle: "none", p: 0, m: 0 }}>
              {alternatives.map((alternative) => (
                <TopsisSortAlternativeRow key={alternative.id} alternative={alternative} theme={theme} />
              ))}
            </Box>
          ) : (
            <Box sx={{ ...topsisSortCategoryBodySx, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography variant="caption" color="text.secondary" sx={{ px: 0.8, py: 0.25, textAlign: "center" }}>
                No alternatives in this category.
              </Typography>
            </Box>
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
