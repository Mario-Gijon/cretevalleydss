import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

const formatWeight = (value) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${(value * 100).toFixed(2)}%`
    : "—";

const statusLabel = (status) => {
  if (status === "consistent") return "Consistent";
  if (status === "review") return "Review suggested";
  return null;
};

const expertEntry = (collection, { expertId, expertEmail }) => {
  if (!collection || typeof collection !== "object" || Array.isArray(collection)) {
    return undefined;
  }
  if (expertId && Object.hasOwn(collection, expertId)) return collection[expertId];
  if (typeof expertEmail !== "string" || !expertEmail.trim()) return undefined;
  if (Object.hasOwn(collection, expertEmail)) return collection[expertEmail];

  const normalizedEmail = expertEmail.trim().toLocaleLowerCase();
  const matchingKey = Object.keys(collection).find(
    (key) => key.trim().toLocaleLowerCase() === normalizedEmail,
  );
  return matchingKey ? collection[matchingKey] : undefined;
};

const formatDiagnostic = (diagnostic) => {
  if (!diagnostic || typeof diagnostic !== "object") return null;
  const label = statusLabel(diagnostic.consistencyStatus);
  const ratio = diagnostic.consistencyRatio;
  const cr = typeof ratio === "number" && Number.isFinite(ratio)
    ? `CR ${ratio.toFixed(3)}`
    : null;

  return [label, cr].filter(Boolean).join(" · ") || null;
};

const tableSx = {
  width: "100%",
  tableLayout: "fixed",
  "& th, & td": {
    borderColor: "rgba(255,255,255,0.09)",
    overflowWrap: "anywhere",
    verticalAlign: "top",
  },
  "& th": {
    bgcolor: "rgba(255,255,255,0.035)",
    color: "text.secondary",
    fontSize: "0.75rem",
    fontWeight: 700,
  },
};

const AHPSortICriteriaWeightSummary = ({
  criteria,
  collectiveEvaluation,
  selectedExpertId,
  selectedExpertEmail,
  showCollective,
}) => {
  const expertIdentity = { expertId: selectedExpertId, expertEmail: selectedExpertEmail };
  const selectedExpertWeights = expertEntry(
    collectiveEvaluation?.expertWeightsByExpert,
    expertIdentity,
  );
  const collectiveWeights = collectiveEvaluation?.weightsByCriterion;
  const diagnostics = expertEntry(
    collectiveEvaluation?.expertDiagnosticsByExpert,
    expertIdentity,
  );
  const diagnosticText = formatDiagnostic(diagnostics);
  const hasSelectedWeights = criteria.some((criterion) =>
    typeof selectedExpertWeights?.[criterion.id] === "number" &&
    Number.isFinite(selectedExpertWeights[criterion.id]),
  );
  const hasCollectiveWeights = criteria.some((criterion) =>
    typeof collectiveWeights?.[criterion.id] === "number" &&
    Number.isFinite(collectiveWeights[criterion.id]),
  );

  if (showCollective && !hasCollectiveWeights) {
    return (
      <Typography
        variant="caption"
        color="text.secondary"
        role="status"
        data-testid="ahpsort-i-collective-weights-unavailable"
        sx={{ display: "block", mb: 1 }}
      >
        Collective criterion weights are unavailable.
      </Typography>
    );
  }

  if (!showCollective && !hasSelectedWeights && !diagnosticText) return null;

  return (
    <Box sx={{ mb: 1.25, width: "100%", minWidth: 0 }} data-testid="ahpsort-i-criteria-weight-summary">
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1, mb: 0.55, flexWrap: "wrap" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {showCollective ? "Criterion weights" : "Selected expert priorities"}
        </Typography>
        {diagnosticText ? (
          <Typography variant="caption" color="text.secondary" data-testid="ahpsort-i-selected-expert-consistency">
            {diagnosticText}
          </Typography>
        ) : null}
      </Box>
      <TableContainer
        role="region"
        aria-label={showCollective ? "Selected expert and collective criterion weights" : "Selected expert criterion priorities"}
        tabIndex={0}
        sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden" }}
      >
        <Table
          size="small"
          aria-label={showCollective ? "Criterion weights" : "Selected expert priorities"}
          sx={{
            ...tableSx,
            minWidth: showCollective ? 560 : 430,
            "& th:not(:first-of-type)": { whiteSpace: "nowrap" },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col">Criterion</TableCell>
              <TableCell component="th" scope="col">Selected expert</TableCell>
              {showCollective ? (
                <TableCell component="th" scope="col">Collective (MCC)</TableCell>
              ) : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {criteria.map((criterion) => (
              <TableRow key={criterion.id}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 700 }}>
                  {criterion.name}
                </TableCell>
                <TableCell>
                  {formatWeight(selectedExpertWeights?.[criterion.id])}
                </TableCell>
                {showCollective ? (
                  <TableCell sx={{ color: "secondary.light", fontWeight: 700 }}>
                    {formatWeight(collectiveWeights?.[criterion.id])}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AHPSortICriteriaWeightSummary;
