import {
  Box,
  Chip,
  Typography,
} from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { ExpressionDomainPreview } from "../../../../createIssue/expressionDomains/components/ExpressionDomainPreview.jsx";

import {
  evaluationsPanelHeaderSx,
  evaluationsPanelSx,
} from "../evaluations.styles";

const definitionSummary = (definition) => {
  if (!definition || typeof definition !== "object") return null;
  if (typeof definition.min === "number" && typeof definition.max === "number") {
    return `${definition.min} – ${definition.max}`;
  }
  if (Array.isArray(definition.labels)) return `${definition.labels.length} labels`;
  if (Array.isArray(definition.values)) return `${definition.values.length} values`;
  return null;
};

const ExpressionDomainsPanel = ({ domains }) => (
  <Box sx={evaluationsPanelSx}>
    <Box sx={evaluationsPanelHeaderSx}>
      <TuneRoundedIcon sx={{ color: "secondary.light", fontSize: 21 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" component="h2">
          Expression domains by criterion
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
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
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" }, gap: 1 }} aria-label="Expression domains by criterion">
            {domains.map((item) => {
              const metadata = [
                item.domainTypeLabel,
                definitionSummary(item.domainDefinition),
              ]
                .filter((value) => value && value !== "—")
                .join(" · ");

              return <Box key={item.criterionId} sx={{ minWidth: 0, p: 1, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, bgcolor: "rgba(3,10,17,0.26)" }}>
                    <Typography variant="body2" noWrap title={item.name} sx={{ fontWeight: "fontWeightBold" }}>
                      {item.name}
                    </Typography>
                    {item.criterionTypeLabel ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        color={item.criterionType === "cost" ? "error" : "success"}
                        label={item.criterionTypeLabel}
                        sx={{ height: 23, fontWeight: "fontWeightBold" }}
                      />
                    ) : "—"}
                    <Typography variant="body2" noWrap title={item.domainName} sx={{ color: "secondary.light", fontWeight: "fontWeightBold" }}>
                      {item.domainName}
                    </Typography>
                    <Typography variant="caption" noWrap title={metadata || "—"} sx={{ color: "text.secondary" }}>
                      {metadata || "—"}
                    </Typography>
                    {item.domain ? <Box sx={{ mt: 0.8, minWidth: 0 }}><ExpressionDomainPreview domain={item.domain} /></Box> : null}
              </Box>;
            })}
      </Box>
    ) : (
      <Typography variant="body2" color="text.secondary">
        No criterion domain assignments are available.
      </Typography>
    )}
  </Box>
);

export default ExpressionDomainsPanel;
