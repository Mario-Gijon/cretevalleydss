import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

import { explainDiagnosticTriad } from "../operations/explainDiagnosticTriad.js";
import { formatNaturalList } from "./formatNaturalList.js";

const formatCR = (value, decimalPlaces = 3) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(decimalPlaces) : "—";

const formatCRAboveThreshold = (value, threshold) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  let decimalPlaces = 3;
  while (decimalPlaces < 20 && value.toFixed(decimalPlaces) === threshold.toFixed(decimalPlaces)) {
    decimalPlaces += 1;
  }

  return value.toFixed(decimalPlaces);
};

const minimalAccordionSx = {
  bgcolor: "transparent",
  boxShadow: "none",
  border: 0,
  borderRadius: 0,
  "&::before": { display: "none" },
  "&.Mui-expanded": { my: 0 },
  "& .MuiAccordionSummary-root": {
    minHeight: 40,
    px: 1,
    py: 0.35,
    borderRadius: 1,
    bgcolor: "transparent",
    "&:hover": { bgcolor: "transparent" },
    "&.Mui-focusVisible": { bgcolor: "action.focus" },
  },
  "& .MuiAccordionSummary-content": { my: 0.5 },
  "& .MuiAccordionDetails-root": {
    px: 1,
    pt: 0.25,
    pb: 0.75,
    bgcolor: "transparent",
  },
  "& .MuiAccordion-region": { bgcolor: "transparent" },
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
  const notApplicable = state.status === "notApplicable";

  return (
    <Box
      data-testid="ahp-consistency-diagnostic"
      sx={{ minWidth: 0, pt: 0.35, pb: 0.25 }}
    >
      <Stack spacing={1.15}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
          data-testid="ahp-consistency-diagnostic-header"
        >
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
            <InfoOutlinedIcon fontSize="small" color="info" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              AHP Consistency
            </Typography>
          </Stack>

          {!notApplicable ? (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              disabled={state.status === "incomplete" || state.status === "checking"}
              startIcon={state.status === "checking"
                ? <CircularProgress size={14} color="inherit" thickness={5} />
                : undefined}
              onClick={onCheck}
              sx={{ ml: "auto", flexShrink: 0 }}
            >
              {state.status === "checking" ? "Checking..." : "Check Consistency"}
            </Button>
          ) : null}
        </Stack>

        {notApplicable ? (
          <Typography variant="body2" color="text.secondary" role="status">
            CR is not applicable with fewer than three criteria.
          </Typography>
        ) : null}

        {!hasResult && !notApplicable ? (
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
        ) : null}

        {hasResult ? (
          <>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={0.65}
              useFlexGap
              flexWrap="wrap"
              role="status"
              data-testid="ahp-consistency-result"
            >
              <Stack direction="row" alignItems="center" spacing={0.7} sx={{ minWidth: 0 }}>
                {isInconsistent
                  ? <WarningAmberOutlinedIcon sx={{ color: "warning.main", fontSize: 19 }} />
                  : <CheckCircleOutlineIcon sx={{ color: "success.main", fontSize: 19 }} />}
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {isInconsistent
                    ? "Some comparisons don't match."
                    : "Your comparisons are sufficiently consistent."}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: "auto" } }}>
                {isInconsistent
                  ? `CR ${formatCRAboveThreshold(data.consistencyRatio, data.consistencyThreshold)} · recommended threshold ${formatCR(data.consistencyThreshold, 2)}`
                  : `CR ${formatCR(data.consistencyRatio)}`}
              </Typography>
            </Stack>

            {isInconsistent ? (
              <Stack spacing={0.65}>
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
                    sx={minimalAccordionSx}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                      <Typography variant="body2" sx={{ fontWeight: 650 }}>
                        View other inconsistencies
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={0.15}>
                        {triads.map((triad, index) => {
                          if (index === selectedTriadIndex) return null;
                          const triadCriteria = Array.isArray(triad?.criteria) ? triad.criteria : [];
                          const label = formatNaturalList(triadCriteria.map((criterion) => criterion.name));
                          return (
                            <Button
                              key={triadCriteria.map((criterion) => criterion.id).join(":") || index}
                              variant="text"
                              color="inherit"
                              onClick={() => {
                                onSelectTriad?.(index);
                                setOtherInconsistenciesOpen(false);
                              }}
                              aria-label={`View inconsistency involving ${label}`}
                              sx={{
                                justifyContent: "flex-start",
                                textAlign: "left",
                                width: "100%",
                                minHeight: 38,
                                py: 0.65,
                                px: 1,
                                borderRadius: 1,
                                color: "text.secondary",
                                textTransform: "none",
                                transition: (theme) => theme.transitions.create("background-color"),
                                "&:hover": {
                                  bgcolor: "action.hover",
                                  color: "text.primary",
                                },
                              }}
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
    </Box>
  );
};

export default AHPConsistencyDiagnostic;
