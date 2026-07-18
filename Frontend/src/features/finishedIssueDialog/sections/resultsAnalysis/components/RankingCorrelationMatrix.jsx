import { Box, Stack, Tooltip, Typography } from "@mui/material";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";

import { comparisonDetailPanelSx, correlationCellSx, correlationMatrixSx, correlationMatrixViewportSx } from "../resultsAnalysis.styles.js";

const RankingCorrelationMatrix = ({ correlations }) => {
  if (!correlations.available) {
    return (
      <Box sx={comparisonDetailPanelSx}>
        <Typography variant="h6" component="h2">
          Ranking correlations
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
          {correlations.reason}
        </Typography>
      </Box>
    );
  }

  const cellByKey = new Map(
    correlations.cells.map((cell) => [
      `${cell.rowKey}::${cell.columnKey}`,
      cell,
    ])
  );

  return (
    <Box sx={comparisonDetailPanelSx}>
      <Stack direction="row" spacing={1} alignItems="center">
        <GridViewRoundedIcon sx={{ color: "secondary.light" }} />
        <Box>
          <Typography variant="h6" component="h2">
            Ranking correlations
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Spearman rank correlation between complete rankings (−1 to 1).
          </Typography>
        </Box>
      </Stack>

      <Box sx={correlationMatrixViewportSx}>
        <Box sx={correlationMatrixSx(correlations.executions.length)}>
          <Box />
          {correlations.executions.map((execution) => (
            <Typography
              variant="caption"
              key={`head-${execution.key}`}
              noWrap
              title={execution.label}
              sx={{
                px: 1,
                py: 0.9,
                textAlign: "center",
                fontWeight: "fontWeightBold",
              }}
            >
              {execution.label}
            </Typography>
          ))}
          {correlations.executions.flatMap((row) => [
            <Stack
              key={`row-${row.key}`}
              direction="row"
              spacing={0.65}
              alignItems="center"
              sx={{ px: 1, py: 1 }}
            >
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  bgcolor: row.color,
                }}
              />
              <Typography variant="caption" noWrap title={row.label}>
                {row.label}
              </Typography>
            </Stack>,
            ...correlations.executions.map((column) => {
              const cell = cellByKey.get(`${row.key}::${column.key}`);
              const title =
                cell?.value === null
                  ? "Correlation unavailable"
                  : `Spearman correlation: ${cell?.formattedValue ?? "—"}`;

              return (
                <Tooltip key={`${row.key}-${column.key}`} title={title}>
                  <Box
                    sx={{
                      display: "grid",
                      placeItems: "center",
                      minHeight: 48,
                      border: "1px solid",
                      borderRadius: 1,
                      typography: "body2",
                      fontWeight: "fontWeightBold",
                      transition: "border-color 160ms ease, background-color 160ms ease",
                      ...correlationCellSx(cell?.value),
                      "&:hover": {
                        borderColor: "rgba(255,255,255,0.82)",
                        bgcolor: "rgba(255,255,255,0.065)",
                      },
                    }}
                  >
                    {cell?.formattedValue ?? "—"}
                  </Box>
                </Tooltip>
              );
            }),
          ])}
        </Box>
      </Box>

      <Typography variant="caption" sx={{ mt: 0.8, color: "text.secondary" }}>
        1 means identical ordering, 0 means no monotonic rank agreement, and −1
        means exact reverse ordering.
      </Typography>
    </Box>
  );
};

export default RankingCorrelationMatrix;
