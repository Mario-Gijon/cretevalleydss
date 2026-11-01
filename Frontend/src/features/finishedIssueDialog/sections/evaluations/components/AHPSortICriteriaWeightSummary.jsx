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
}) => {
  const expertIdentity = { expertId: selectedExpertId, expertEmail: selectedExpertEmail };
  const selectedExpertWeights = expertEntry(
    collectiveEvaluation?.expertWeightsByExpert,
    expertIdentity,
  );
  const collectiveWeights = collectiveEvaluation?.weightsByCriterion;
  const hasCollectiveWeights = criteria.some((criterion) =>
    typeof collectiveWeights?.[criterion.id] === "number" &&
    Number.isFinite(collectiveWeights[criterion.id]),
  );

  if (!hasCollectiveWeights) {
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

  return (
    <Box sx={{ mb: 1.25, width: "100%", minWidth: 0 }} data-testid="ahpsort-i-criteria-weight-summary">
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.55 }}>
        Criterion weights
      </Typography>
      <TableContainer
        role="region"
        aria-label="Selected expert and collective criterion weights"
        tabIndex={0}
        sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden" }}
      >
        <Table
          size="small"
          aria-label="Criterion weights"
          sx={{
            ...tableSx,
            minWidth: 560,
            "& th:not(:first-of-type)": { whiteSpace: "nowrap" },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col">Criterion</TableCell>
              <TableCell component="th" scope="col">Selected expert</TableCell>
              <TableCell component="th" scope="col">Collective (MCC)</TableCell>
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
                <TableCell sx={{ color: "secondary.light", fontWeight: 700 }}>
                  {formatWeight(collectiveWeights?.[criterion.id])}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AHPSortICriteriaWeightSummary;
