import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import { detailCardSx, getCellTooltip, safeArray } from "../adminIssues.utils";

/**
 * Matrices pairwise en modo lectura para admin issues.
 *
 * @param {object} props
 * @param {object} props.data
 * @returns {JSX.Element}
 */
const AdminReadOnlyPairwise = ({ data }) => {
  const theme = useTheme();
  const evaluations = data?.evaluations || {};
  const criteria = Object.keys(evaluations);

  if (!criteria.length) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No pairwise evaluations found.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.2}>
      {criteria.map((criterionName) => {
        const rows = safeArray(evaluations[criterionName]);
        const alternatives = rows.map((row) => row.id);

        return (
          <Paper key={criterionName} elevation={0} sx={{ ...detailCardSx(theme), p: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 980, mb: 0.85 }}>
              {criterionName}
            </Typography>

            <TableContainer
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                bgcolor: alpha(theme.palette.common.white, 0.02),
                overflowX: "auto",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 950, bgcolor: "#1a2a2fcf", minWidth: 140 }}>
                      Alternative
                    </TableCell>
                    {alternatives.map((alt) => (
                      <TableCell
                        key={`${criterionName}_${alt}`}
                        sx={{
                          fontWeight: 950,
                          bgcolor: "#1a2a2fcf",
                          minWidth: 110,
                          textAlign: "center",
                        }}
                      >
                        {alt}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${criterionName}_${row.id}`}>
                      <TableCell sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}>
                        <Typography variant="body2" sx={{ fontWeight: 900 }}>
                          {row.id}
                        </Typography>
                      </TableCell>

                      {alternatives.map((colAlt) => {
                        const cell = row[colAlt];
                        const tooltip = getCellTooltip(cell);
                        const value =
                          cell?.value == null || cell?.value === "" ? "—" : String(cell.value);

                        return (
                          <TableCell
                            key={`${criterionName}_${row.id}_${colAlt}`}
                            align="center"
                            sx={{ borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}` }}
                          >
                            <Tooltip title={tooltip || ""} arrow disableInteractive={!tooltip}>
                              <Typography variant="body2" sx={{ fontWeight: 850 }}>
                                {row.id === colAlt ? "—" : value}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        );
      })}
    </Stack>
  );
};

export default AdminReadOnlyPairwise;
