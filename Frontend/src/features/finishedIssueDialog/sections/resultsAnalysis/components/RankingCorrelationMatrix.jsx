import { Box, Stack, Tooltip, Typography } from "@mui/material";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";

import { correlationMatrixViewportSx, resultsPanelSx } from "../resultsAnalysis.styles.js";

const backgroundFor = (value) => {
  if (typeof value !== "number") return "rgba(255,255,255,0.035)";
  if (value >= 0.75) return "rgba(111, 220, 104, 0.45)";
  if (value >= 0.25) return "rgba(39, 213, 228, 0.30)";
  if (value > -0.25) return "rgba(255,255,255,0.09)";
  return "rgba(169, 96, 232, 0.34)";
};

const RankingCorrelationMatrix = ({ correlations }) => {
  if (!correlations.available) {
    return (
      <Box sx={resultsPanelSx}>
        <Typography component="h2" sx={{ fontSize: 18, fontWeight: 950 }}>
          Ranking correlations
        </Typography>
        <Typography sx={{ mt: 1, color: "text.secondary", fontSize: 12 }}>
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
    <Box sx={resultsPanelSx}>
      <Stack direction="row" spacing={1} alignItems="center">
        <GridViewRoundedIcon sx={{ color: "secondary.light" }} />
        <Box>
          <Typography component="h2" sx={{ fontSize: 18, fontWeight: 950 }}>
            Ranking correlations
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 11.5 }}>
            Spearman rank correlation between complete rankings (−1 to 1).
          </Typography>
        </Box>
      </Stack>

      <Box sx={correlationMatrixViewportSx}>
        <Box
          sx={{
            minWidth: 620,
            display: "grid",
            gridTemplateColumns: `220px repeat(${correlations.executions.length}, minmax(130px, 1fr))`,
            mt: 1.1,
          }}
        >
          <Box />
          {correlations.executions.map((execution) => (
            <Typography
              key={`head-${execution.key}`}
              noWrap
              title={execution.label}
              sx={{
                px: 1,
                py: 0.9,
                textAlign: "center",
                fontSize: 11.5,
                fontWeight: 900,
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
              <Typography noWrap title={row.label} sx={{ fontSize: 11.5 }}>
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
                      minHeight: 44,
                      border: "1px solid rgba(255,255,255,0.08)",
                      bgcolor: backgroundFor(cell?.value),
                      fontSize: 12.5,
                      fontWeight: 900,
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

      <Typography sx={{ mt: 0.8, color: "text.secondary", fontSize: 10.5 }}>
        1 means identical ordering, 0 means no monotonic rank agreement, and −1
        means exact reverse ordering.
      </Typography>
    </Box>
  );
};

export default RankingCorrelationMatrix;
