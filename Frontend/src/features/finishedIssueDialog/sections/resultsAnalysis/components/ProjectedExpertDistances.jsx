import { Box, Stack, Typography } from "@mui/material";
import { buildProjectedExpertDistances } from "../logic/buildProjectedExpertDistances.js";

const ProjectedExpertDistances = ({ projections = [] }) => {
  const available = projections
    .map((projection) => ({
      projection,
      rows: buildProjectedExpertDistances(projection),
    }))
    .filter((entry) => entry.rows.length);
  if (!available.length)
    return (
      <Typography variant="body2" color="text.secondary">
        No stored expert–collective analytical projection is available for the
        selected executions.
      </Typography>
    );
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          md: `repeat(${Math.min(available.length, 3)}, minmax(0, 1fr))`,
        },
        gap: 1.4,
        alignItems: "start",
      }}
    >
      {available.map(({ projection, rows }) => {
        const max = rows.at(-1)?.distance || 1;
        return (
          <Box key={projection.key} sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 900, mb: 0.8, color: projection.color }}
            >
              {projection.displayLabel}
            </Typography>
            <Stack spacing={0.65}>
              {rows.map((row) => (
                <Box
                  key={row.identity}
                  tabIndex={0}
                  aria-label={`${row.label}: Projected distance ${row.distance.toFixed(3)}${row.closest ? ". Closest" : ""}`}
                  sx={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(90px, 1fr) minmax(44px, 1.25fr) auto",
                    alignItems: "center",
                    gap: 0.7,
                    p: 0.7,
                    borderRadius: 1.5,
                    bgcolor: row.closest
                      ? "rgba(39,213,228,0.09)"
                      : "rgba(255,255,255,0.02)",
                  }}
                >
                  <Typography
                    variant="body2"
                    noWrap
                    title={row.label}
                    sx={{ fontWeight: row.closest ? 850 : 700 }}
                  >
                    {row.label}
                  </Typography>
                  <Box
                    sx={{
                      height: 6,
                      borderRadius: 99,
                      bgcolor: "rgba(255,255,255,0.1)",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        width: `${max ? (row.distance / max) * 100 : 0}%`,
                        height: "100%",
                        bgcolor: projection.color || "secondary.main",
                        borderRadius: 99,
                      }}
                    />
                  </Box>
                  <Stack direction="row" spacing={0.55} alignItems="center">
                    <Typography
                      variant="caption"
                      sx={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {row.distance.toFixed(3)}
                    </Typography>
                    {row.closest ? (
                      <Typography variant="caption" color="secondary.light">
                        Closest
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
};
export default ProjectedExpertDistances;
