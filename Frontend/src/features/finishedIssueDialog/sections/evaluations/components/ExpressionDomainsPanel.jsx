import {
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import {
  evaluationsPanelSx,
  evaluationsPanelHeaderSx,
  evaluationsScrollableSx,
  expressionDomainRowSx,
} from "../evaluations.styles";

const safeDefinitionSummary = (definition) => {
  if (!definition || typeof definition !== "object") return null;

  const min =
    typeof definition.min === "number" ? definition.min : null;
  const max =
    typeof definition.max === "number" ? definition.max : null;

  if (min !== null && max !== null) return `${min} – ${max}`;

  if (Array.isArray(definition.labels)) {
    return `${definition.labels.length} labels`;
  }

  if (Array.isArray(definition.values)) {
    return `${definition.values.length} values`;
  }

  return null;
};

const ExpressionDomainsPanel = ({ domains }) => (
  <Box sx={evaluationsPanelSx}>
    <Box sx={evaluationsPanelHeaderSx}>
      <TuneRoundedIcon
        sx={{ color: "secondary.light", fontSize: 21 }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h2" sx={{ fontSize: 16, fontWeight: 950 }}>
          Expression domains by criterion
        </Typography>
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          Stored domains used to express each leaf criterion.
        </Typography>
      </Box>
      <Chip
        size="small"
        variant="outlined"
        color="secondary"
        label={domains.length}
        sx={{ ml: "auto", height: 24, fontWeight: 850 }}
      />
    </Box>

    {domains.length ? (
      <Stack spacing={0.65} sx={evaluationsScrollableSx("domains")}>
        {domains.map((item) => {
          const definitionSummary = safeDefinitionSummary(
            item.domainDefinition
          );

          return (
            <Box key={item.criterionId} sx={expressionDomainRowSx}>
              <Typography
                noWrap
                title={item.name}
                sx={{
                  minWidth: 0,
                  fontSize: 12.5,
                  fontWeight: 850,
                }}
              >
                {item.name}
              </Typography>

              {item.criterionTypeLabel ? (
                <Chip
                  size="small"
                  variant="outlined"
                  color={
                    item.criterionType === "cost"
                      ? "error"
                      : "success"
                  }
                  label={item.criterionTypeLabel}
                  sx={{ height: 23, fontSize: 10.5, fontWeight: 800 }}
                />
              ) : (
                <Box />
              )}

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  noWrap
                  title={item.domainName}
                  sx={{
                    color: "secondary.light",
                    fontSize: 12,
                    fontWeight: 850,
                  }}
                >
                  {item.domainName}
                </Typography>
                <Typography
                  noWrap
                  title={[
                    item.domainTypeLabel,
                    definitionSummary,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  sx={{
                    color: "text.secondary",
                    fontSize: 10.5,
                    fontWeight: 600,
                  }}
                >
                  {[item.domainTypeLabel, definitionSummary]
                    .filter(
                      (value) => value && value !== "—"
                    )
                    .join(" · ") || "—"}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>
    ) : (
      <Typography color="text.secondary" sx={{ fontSize: 12.5 }}>
        No criterion domain assignments are available.
      </Typography>
    )}
  </Box>
);

export default ExpressionDomainsPanel;
