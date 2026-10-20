import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import { sortingResultGridSx } from "./sortingResultGrid.styles.js";

const SortingDashboardResult = ({ result }) => {
  const theme = useTheme();
  return (
    <Box
      role="list"
      aria-label="Final sorting by category"
      sx={sortingResultGridSx}
    >
      {result.categories.map((category) => (
        <Box
          key={category.id}
          role="listitem"
          aria-label={`${category.label}: ${category.alternatives.length} ${category.alternatives.length === 1 ? "alternative" : "alternatives"}`}
          sx={{ minWidth: 0, p: { xs: 1.15, sm: 1.35 }, borderRadius: 2, border: "1px solid rgba(85, 199, 216, 0.18)", bgcolor: alpha(theme.palette.common.white, 0.025) }}
        >
          <Stack direction="row" spacing={0.8} alignItems="flex-start" justifyContent="space-between" sx={{ minWidth: 0, mb: 1 }}>
            <Stack direction="row" spacing={0.7} alignItems="flex-start" sx={{ minWidth: 0 }}>
              <CategoryRoundedIcon sx={{ flex: "0 0 auto", mt: 0.1, fontSize: 18, color: "secondary.light" }} aria-hidden="true" />
              <Typography variant="subtitle1" title={category.label} sx={{ minWidth: 0, fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>
                {category.label}
              </Typography>
            </Stack>
            <Chip size="small" label={category.alternatives.length} aria-label={`${category.alternatives.length} alternatives`} sx={{ flex: "0 0 auto", color: "text.secondary", bgcolor: "rgba(255,255,255,0.055)" }} />
          </Stack>
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
};

export default SortingDashboardResult;
