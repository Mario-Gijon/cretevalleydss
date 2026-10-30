import { Alert, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";

const tableSx = {
  width: "max-content",
  minWidth: "100%",
  tableLayout: "auto",
  "& th, & td": { borderColor: "rgba(255,255,255,0.09)", verticalAlign: "top" },
};

const headerCellSx = {
  bgcolor: "rgba(255,255,255,0.035)",
  color: "text.secondary",
  fontSize: "0.75rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const statusText = (classification) => {
  if (classification.aggregationStatus === "unanimous") {
    return `Unanimous · ${classification.participantCount} ${classification.participantCount === 1 ? "vote" : "votes"}`;
  }
  if (classification.aggregationStatus === "tied_plurality") {
    const policy = classification.tiePolicy === "optimistic" ? "more preferred category" : "less preferred category";
    return `Tie · ${policy} selected`;
  }
  const winningVotes = Math.max(0, ...(classification.votes || []).map((vote) => vote.count));
  return classification.isAbsoluteMajority
    ? `Majority · ${winningVotes} of ${classification.participantCount} votes`
    : `Plurality · ${winningVotes} of ${classification.participantCount} votes`;
};

const VoteCounts = ({ votes }) => (
  <Box sx={{ display: "grid", gap: 0.2 }}>
    {votes.map((vote) => (
      <Typography key={vote.id} variant="caption" sx={{ color: "text.secondary", lineHeight: 1.35 }}>
        {vote.label}: {vote.count}
      </Typography>
    ))}
  </Box>
);

const GAHPSortCollectiveEvaluation = ({ presentation }) => {
  if (presentation?.status === "integrity_warning") {
    return (
      <Alert severity="warning" role="status" data-testid="gahpsort-collective-integrity-warning" sx={{ mt: 1.15 }}>
        Saved GAHPSort vote evidence could not be verified. Vote details are hidden.
      </Alert>
    );
  }

  if (presentation?.status !== "available") {
    return (
      <Alert severity="info" role="status" data-testid="gahpsort-collective-unavailable" sx={{ mt: 1.15 }}>
        {presentation?.message || "No saved GAHPSort classification evidence is available for this execution."}
      </Alert>
    );
  }

  const { evidence, categories } = presentation;
  const alternativeRows = presentation.alternativeIds
    .map((id) => ({ id, ...evidence.alternativesById?.[id] }))
    .filter((entry) => entry.alternativeName);

  return (
    <TableContainer
      component={Box}
      data-testid="gahpsort-collective-evaluation"
      role="region"
      aria-label="GAHPSort classifications; scroll horizontally to view all columns"
      tabIndex={0}
      sx={{ mt: 1.15, width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden" }}
    >
      <Table size="small" aria-label="GAHPSort collective classification" sx={tableSx}>
        <TableHead>
          <TableRow>
            <TableCell component="th" scope="col" sx={headerCellSx}>
              Alternative
            </TableCell>
            {evidence.experts.map((expert) => (
              <TableCell key={expert.id} component="th" scope="col" sx={headerCellSx}>
                {expert.name}
              </TableCell>
            ))}
            <TableCell component="th" scope="col" sx={headerCellSx}>Votes by category</TableCell>
            <TableCell component="th" scope="col" sx={headerCellSx}>Collective</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {alternativeRows.map((alternative) => (
            <TableRow key={alternative.id} data-testid="gahpsort-collective-alternative-row">
              <TableCell component="th" scope="row" sx={{ minWidth: 150, maxWidth: 250, overflowWrap: "anywhere" }}>
                {alternative.alternativeName}
              </TableCell>
              {evidence.experts.map((expert) => {
                const classification = alternative.individualClassifications.find((entry) => entry.id === expert.id);
                return (
                  <TableCell key={expert.id} sx={{ minWidth: 115, overflowWrap: "anywhere" }}>
                    {classification?.category?.label || "—"}
                  </TableCell>
                );
              })}
              <TableCell sx={{ minWidth: 135 }}>
                <VoteCounts votes={categories.map((category) => alternative.votes?.find((vote) => vote.id === category.id)).filter(Boolean)} />
              </TableCell>
              <TableCell sx={{ minWidth: 155 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                  {alternative.category?.label || "—"}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", mt: 0.2, color: "text.secondary", lineHeight: 1.35 }}>
                  {statusText(alternative)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default GAHPSortCollectiveEvaluation;
