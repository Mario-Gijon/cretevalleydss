import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";

import {
  evaluationsPanelHeaderSx,
  evaluationsPanelSx,
  evaluationsScrollableSx,
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

const headerCellSx = {
  py: 0.75,
  px: 0.85,
  bgcolor: "rgba(12, 33, 47, 0.98)",
  color: "text.secondary",
  typography: "caption",
  fontWeight: "fontWeightBold",
  textTransform: "uppercase",
  letterSpacing: 0.35,
  whiteSpace: "nowrap",
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
      <TableContainer sx={evaluationsScrollableSx("domains")}>
        <Table size="small" stickyHeader aria-label="Expression domains by criterion" sx={{ minWidth: { xs: 560, md: "100%" } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Criterion</TableCell>
              <TableCell sx={headerCellSx}>Type</TableCell>
              <TableCell sx={headerCellSx}>Expression domain</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {domains.map((item) => {
              const metadata = [
                item.domainTypeLabel,
                definitionSummary(item.domainDefinition),
              ]
                .filter((value) => value && value !== "—")
                .join(" · ");

              return (
                <TableRow key={item.criterionId} hover>
                  <TableCell sx={{ maxWidth: 210, py: 0.7, px: 0.85 }}>
                    <Typography variant="body2" noWrap title={item.name} sx={{ fontWeight: "fontWeightBold" }}>
                      {item.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.7, px: 0.85, whiteSpace: "nowrap" }}>
                    {item.criterionTypeLabel ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        color={item.criterionType === "cost" ? "error" : "success"}
                        label={item.criterionTypeLabel}
                        sx={{ height: 23, fontWeight: "fontWeightBold" }}
                      />
                    ) : "—"}
                  </TableCell>
                  <TableCell sx={{ minWidth: 175, py: 0.7, px: 0.85 }}>
                    <Typography variant="body2" noWrap title={item.domainName} sx={{ color: "secondary.light", fontWeight: "fontWeightBold" }}>
                      {item.domainName}
                    </Typography>
                    <Typography variant="caption" noWrap title={metadata || "—"} sx={{ color: "text.secondary" }}>
                      {metadata || "—"}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    ) : (
      <Typography variant="body2" color="text.secondary">
        No criterion domain assignments are available.
      </Typography>
    )}
  </Box>
);

export default ExpressionDomainsPanel;
