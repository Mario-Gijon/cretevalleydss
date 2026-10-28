import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Fragment } from "react";

const formatNumber = (value) => typeof value === "number" && Number.isFinite(value)
  ? value.toFixed(4)
  : "—";

const naturalList = (items) => items.length < 2 ? (items[0] || "") : items.length === 2
  ? `${items[0]} and ${items[1]}`
  : `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;

const MatrixDetails = ({ criterion }) => (
  <Box component="details" sx={{ mt: 0.55, minWidth: 0 }}>
    <Box component="summary" sx={{ cursor: "pointer", color: "secondary.light", fontSize: "0.8rem", width: "fit-content" }}>
      Pairwise matrix for {criterion.name}
    </Box>
    <TableContainer sx={{ mt: 0.6, maxWidth: "100%", overflowX: "auto" }}>
      <Table size="small" aria-label={`Pairwise matrix for ${criterion.name}`} sx={{ minWidth: 360, "& th, & td": { borderColor: (theme) => alpha(theme.palette.divider, 0.45), px: 1, py: 0.55, whiteSpace: "nowrap" } }}>
        <TableHead>
          <TableRow>
            <TableCell scope="col">Compared entity</TableCell>
            {criterion.matrix.entities.map((entity, index) => (
              <TableCell key={`${index}-${entity.label}`} scope="col" align="right">{entity.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {criterion.matrix.values.map((row, rowIndex) => (
            <TableRow key={`${rowIndex}-${criterion.matrix.entities[rowIndex].label}`}>
              <TableCell component="th" scope="row">{criterion.matrix.entities[rowIndex].label}</TableCell>
              {row.map((value, columnIndex) => (
                <TableCell key={`${rowIndex}-${columnIndex}`} align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatNumber(value)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

const CriterionEvidence = ({ criteria }) => (
  <TableContainer sx={{ mt: 0.8, maxWidth: "100%", overflowX: "auto" }}>
    <Table size="small" aria-label="AHP evidence by criterion" sx={{ minWidth: 680, "& th, & td": { borderColor: (theme) => alpha(theme.palette.divider, 0.45), px: 1, py: 0.65, verticalAlign: "top" } }}>
      <TableHead>
        <TableRow>
          <TableCell scope="col">Criterion</TableCell>
          <TableCell scope="col" align="right">Weight</TableCell>
          <TableCell scope="col">Local priorities</TableCell>
          <TableCell scope="col" align="right">Weighted contribution</TableCell>
          <TableCell scope="col">AHP consistency</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {criteria.map((criterion) => {
          const consistency = criterion.consistency;
          const ratio = consistency.consistencyRatio;
          return (
            <Fragment key={criterion.id}>
              <TableRow>
                <TableCell component="th" scope="row">{criterion.name}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>{formatNumber(criterion.weight)}</TableCell>
                <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
                  <Typography variant="caption" component="div">Alternative: {formatNumber(criterion.alternativeLocalPriority)}</Typography>
                  {criterion.profileLocalPriorities.map((profile) => (
                    <Typography key={profile.label} variant="caption" component="div" color="text.secondary">
                      {profile.label}: {formatNumber(profile.value)}
                    </Typography>
                  ))}
                </TableCell>
                <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
                  <Typography variant="caption" component="div">Alternative: {formatNumber(criterion.weightedContribution)}</Typography>
                  {criterion.profileWeightedContributions.map((profile) => (
                    <Typography key={profile.label} variant="caption" component="div" color="text.secondary">
                      {profile.label}: {formatNumber(profile.value)}
                    </Typography>
                  ))}
                </TableCell>
                <TableCell>
                  <Typography variant="caption" component="div" sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                    λmax {formatNumber(consistency.lambdaMax)} · CI {formatNumber(consistency.consistencyIndex)} · RI {formatNumber(consistency.randomIndex)} · CR {ratio === null ? "not applicable" : formatNumber(ratio)}
                  </Typography>
                  <Typography variant="caption" color={consistency.consistencyStatus === "review" ? "warning.light" : "text.secondary"}>
                    {consistency.consistencyStatus === "not_applicable" ? "CR not applicable for a 2×2 matrix" : consistency.consistencyStatus === "review" ? "Review may be useful" : "Consistent"}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={5} sx={{ pt: 0, borderBottom: 0 }}>
                  <MatrixDetails criterion={criterion} />
                </TableCell>
              </TableRow>
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  </TableContainer>
);

const AHPSortIAlternativeEvidence = ({ evidence, showUnavailableMessage = true }) => {
  const theme = useTheme();
  if (!evidence) return null;

  if (evidence.status !== "available") {
    if (!showUnavailableMessage) return null;
    return (
      <Typography
        variant="caption"
        role={evidence.status === "integrity_warning" ? "alert" : undefined}
        data-testid={`ahp-sort-i-${evidence.status}`}
        sx={{ display: "block", mt: 0.5, color: evidence.status === "integrity_warning" ? "warning.light" : "text.secondary", lineHeight: 1.45 }}
      >
        {evidence.message}
      </Typography>
    );
  }

  const reviewCriteria = evidence.criteria
    .filter(({ consistency }) => typeof consistency.consistencyRatio === "number" && consistency.consistencyRatio > 0.1)
    .map(({ name }) => name);
  const profileLabel = evidence.profileMode === "limiting" ? "Limiting profiles" : "Central profiles";

  return (
    <Box data-testid="ahp-sort-i-alternative-evidence" sx={{ mt: 0.4, minWidth: 0 }}>
      <Typography variant="caption" data-testid="ahp-sort-i-assignment-explanation" sx={{ display: "block", color: "text.secondary", lineHeight: 1.45, overflowWrap: "anywhere" }}>
        {evidence.explanation}
      </Typography>
      {reviewCriteria.length > 0 && (
        <Typography role="note" variant="caption" data-testid="ahp-sort-i-consistency-warning" sx={{ display: "block", mt: 0.5, color: "warning.light", lineHeight: 1.45 }}>
          Some local AHP matrices for {naturalList(reviewCriteria)} have CR above 0.10. Reviewing these judgments may be useful; the classification remains visible.
        </Typography>
      )}
      {evidence.detailsAvailable ? (
        <Box
          component="details"
          data-testid="ahp-sort-i-mathematical-details"
          sx={{ mt: 0.55, minWidth: 0, "& > summary": { width: "fit-content", cursor: "pointer", color: alpha(theme.palette.secondary.light, 0.92), fontSize: "0.8rem", "&:hover": { color: "secondary.light" } } }}
        >
          <Box component="summary">View AHP evidence</Box>
          <Box sx={{ pt: 0.65, minWidth: 0 }}>
            <Typography variant="caption" component="div" sx={{ color: "text.secondary", lineHeight: 1.55 }}>
              Alternative global priority: <strong>{formatNumber(evidence.globalPriority)}</strong>
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 0.15, color: "text.secondary" }}>{profileLabel}</Typography>
            <Box component="ul" aria-label={profileLabel} sx={{ mt: 0.2, mb: 0.75, pl: 2, color: "text.secondary", "& li": { py: 0.1, fontSize: "0.8rem", fontVariantNumeric: "tabular-nums" } }}>
              {evidence.profilePriorities.map((profile) => (
                <li key={profile.id}>
                  {profile.label}: priority {formatNumber(profile.priority)}
                  {profile.distance !== null ? ` · distance ${formatNumber(profile.distance)}` : ""}
                  {profile.selected ? " · selected center" : ""}
                  {profile.tied && !profile.selected ? " · tied center" : ""}
                </li>
              ))}
            </Box>
            {evidence.profileMode === "central" && (
              <Typography variant="caption" component="div" sx={{ mb: 0.7, color: "text.secondary" }}>
                Tie policy: {evidence.tiePolicy === "optimistic" ? "more preferred category" : "less preferred category"}.
              </Typography>
            )}
            <CriterionEvidence criteria={evidence.criteria} />
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" data-testid="ahp-sort-i-details-unavailable" sx={{ display: "block", mt: 0.45, color: "text.secondary" }}>
          {evidence.detailsUnavailableReason}
        </Typography>
      )}
    </Box>
  );
};

export default AHPSortIAlternativeEvidence;
