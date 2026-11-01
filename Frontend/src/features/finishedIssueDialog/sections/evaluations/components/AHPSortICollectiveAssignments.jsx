import {
  Alert,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

const tableSx = {
  width: "100%",
  tableLayout: "fixed",
  "& th, & td": {
    borderColor: "rgba(255,255,255,0.09)",
    overflowWrap: "anywhere",
    verticalAlign: "top",
  },
};

const headerCellSx = {
  bgcolor: "rgba(255,255,255,0.035)",
  color: "text.secondary",
  fontSize: "0.75rem",
  fontWeight: 700,
};

const unavailableMessage = "Collective assignments are unavailable for this execution.";

const AHPSortICollectiveAssignments = ({ presentation, selectedExpertId }) => {
  if (presentation?.status === "integrity_warning") {
    return (
      <Alert
        severity="warning"
        role="status"
        data-testid="ahpsort-i-collective-integrity-warning"
        sx={{ mt: 1.15 }}
      >
        The saved collective assignment could not be verified. Individual comparisons are still shown.
      </Alert>
    );
  }

  if (presentation?.status !== "available") {
    return (
      <Typography
        variant="caption"
        color="text.secondary"
        role="status"
        data-testid="ahpsort-i-collective-unavailable"
        sx={{ display: "block", mt: 1.15 }}
      >
        {unavailableMessage}
      </Typography>
    );
  }

  const rows = presentation.alternativeIds
    .map((id) => ({
      id,
      ...presentation.evidence.alternativesById?.[id],
    }))
    .filter((alternative) => alternative.alternativeName);

  return (
    <Box sx={{ mt: 1.4, width: "100%", minWidth: 0 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.55, fontWeight: 800 }}>
        Collective assignment
      </Typography>
      <TableContainer
        data-testid="ahpsort-i-collective-assignments"
        role="region"
        aria-label="AHPSort I collective assignments by alternative"
        tabIndex={0}
        sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden" }}
      >
        <Table
          size="small"
          aria-label="Collective assignment by alternative"
          sx={{
            ...tableSx,
            minWidth: 500,
            "& th:not(:first-of-type)": { whiteSpace: "nowrap" },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell component="th" scope="col" sx={headerCellSx}>
                Alternative
              </TableCell>
              <TableCell component="th" scope="col" sx={headerCellSx}>
                Selected expert
              </TableCell>
              <TableCell component="th" scope="col" sx={headerCellSx}>
                Collective assignment
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((alternative) => {
              const expertAssignment = alternative.individualClassifications?.find(
                (classification) => classification.id === selectedExpertId,
              );

              return (
                <TableRow key={alternative.id} data-testid="ahpsort-i-collective-assignment-row">
                  <TableCell component="th" scope="row" sx={{ fontWeight: 700 }}>
                    {alternative.alternativeName}
                  </TableCell>
                  <TableCell>
                    {expertAssignment?.category?.label || "Not available"}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {alternative.category?.label || "Not available"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AHPSortICollectiveAssignments;
