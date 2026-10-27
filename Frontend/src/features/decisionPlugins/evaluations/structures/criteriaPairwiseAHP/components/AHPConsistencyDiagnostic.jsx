import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

import { explainDiagnosticTriad } from "../operations/explainDiagnosticTriad.js";

const formatCR = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "—";

const containerSx = {
  minWidth: 0,
  p: { xs: 1.15, sm: 1.5 },
  borderColor: "rgba(255,255,255,0.11)",
  borderRadius: 1.5,
  bgcolor: "rgba(255,255,255,0.018)",
};

const quietAccordionSx = {
  bgcolor: "transparent",
  boxShadow: "none",
  borderTop: "1px solid",
  borderColor: "divider",
  "&::before": { display: "none" },
  "&.Mui-expanded": { my: 0 },
  "& .MuiAccordionSummary-root": { minHeight: 38, px: 0 },
  "& .MuiAccordionSummary-content": { my: 0.75 },
  "& .MuiAccordionDetails-root": { px: 0, pt: 0.25, pb: 0.75 },
};

const AHPConsistencyDiagnostic = ({
  state,
  onCheck,
  selectedTriad,
  selectedTriadIndex = 0,
  onSelectTriad,
}) => {
  const [otherInconsistenciesOpen, setOtherInconsistenciesOpen] = useState(false);
  const statusKey = `${state?.diagnosticKey ?? ""}:${state?.status}:${state?.data?.consistencyRatio ?? ""}`;

  useEffect(() => {
    setOtherInconsistenciesOpen(false);
  }, [statusKey]);

  if (!state || state.status === "disabled") return null;

  const data = state.data;
  const hasResult = state.status === "result" && data;
  const isInconsistent = hasResult && data.consistencyRatio > data.consistencyThreshold;
  const triads = Array.isArray(data?.triads) ? data.triads : [];
  const activeTriad = selectedTriad || triads[0] || null;
  const activeExplanation = activeTriad ? explainDiagnosticTriad(activeTriad) : null;

  return (
    <Paper variant="outlined" sx={containerSx} data-testid="ahp-consistency-diagnostic">
      <Stack spacing={1.1}>
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <InfoOutlinedIcon fontSize="small" color="info" />
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            AHP Consistency
          </Typography>
        </Stack>

        {state.status === "notApplicable" ? (
          <Typography variant="body2" color="text.secondary" role="status">
            CR is not applicable with fewer than three criteria.
          </Typography>
        ) : (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            spacing={0.8}
          >
            <Typography variant="body2" color="text.secondary" role="status">
              {state.status === "incomplete"
                ? "Complete all pairwise comparisons to check consistency."
                : state.status === "ready"
                  ? "Consistency has not been checked for the current comparisons."
                  : state.status === "error"
                    ? "Consistency check unavailable. Please try again."
                    : state.status === "checking"
                      ? "Checking your comparisons…"
                      : ""}
            </Typography>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              disabled={state.status === "incomplete" || state.status === "checking"}
              startIcon={state.status === "checking"
                ? <CircularProgress size={14} color="inherit" thickness={5} />
                : undefined}
              onClick={onCheck}
              sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0 }}
            >
              {state.status === "checking" ? "Checking..." : "Check CR"}
            </Button>
          </Stack>
        )}

        {hasResult ? (
          <>
            <Alert
              severity={isInconsistent ? "warning" : "success"}
              icon={isInconsistent
                ? <WarningAmberOutlinedIcon fontSize="inherit" />
                : <CheckCircleOutlineIcon fontSize="inherit" />}
              sx={{ py: 0.2, alignItems: "center", "& .MuiAlert-message": { py: 0.25, width: "100%" } }}
            >
              <Stack spacing={0.25}>
                <Typography variant="body1" sx={{ fontWeight: 750 }}>
                  {isInconsistent ? "Some comparisons don't match." : "Your comparisons are consistent."}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isInconsistent
                    ? `CR ${formatCR(data.consistencyRatio)} · recommended threshold ${formatCR(data.consistencyThreshold)}`
                    : `CR ${formatCR(data.consistencyRatio)}`}
                </Typography>
              </Stack>
            </Alert>

            {isInconsistent ? (
              <Stack spacing={0.75}>
                <Typography variant="subtitle1" sx={{ fontWeight: 750 }}>
                  Where is the inconsistency?
                </Typography>
                <Typography variant="body2" color="text.secondary" data-testid="ahp-diagnostic-triad">
                  {activeExplanation?.text || "No specific comparison group could be identified."}
                </Typography>

                {triads.length > 1 ? (
                  <Accordion
                    expanded={otherInconsistenciesOpen}
                    onChange={(_, expanded) => setOtherInconsistenciesOpen(expanded)}
                    disableGutters
                    sx={quietAccordionSx}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                      <Typography variant="body2" sx={{ fontWeight: 650 }}>
                        View other inconsistencies
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={0.35}>
                        {triads.map((triad, index) => {
                          if (index === selectedTriadIndex) return null;
                          const triadCriteria = Array.isArray(triad?.criteria) ? triad.criteria : [];
                          const label = triadCriteria.map((criterion) => criterion.name).join(" · ");
                          return (
                            <Button
                              key={triadCriteria.map((criterion) => criterion.id).join(":") || index}
                              variant="text"
                              color="inherit"
                              onClick={() => onSelectTriad?.(index)}
                              aria-label={`View inconsistency involving ${label}`}
                              sx={{ justifyContent: "flex-start", textAlign: "left", py: 0.7, px: 1, color: "text.secondary" }}
                            >
                              <Typography variant="body2">{label}</Typography>
                            </Button>
                          );
                        })}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                ) : null}

                <Typography variant="caption" color="text.secondary">
                  You can still submit without changing any comparisons.
                </Typography>
              </Stack>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Paper>
  );
};

export default AHPConsistencyDiagnostic;
