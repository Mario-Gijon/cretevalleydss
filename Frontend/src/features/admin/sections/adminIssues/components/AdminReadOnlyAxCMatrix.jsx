import {
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

import { formatCellValue, getCellTooltip } from "../adminIssues.utils";

/**
 * Matriz alternativa-criterio en modo lectura para admin issues.
 *
 * @param {object} props
 * @param {object} props.data
 * @returns {JSX.Element}
 */
const AdminReadOnlyAxCMatrix = ({ data }) => {
  const theme = useTheme();
  const evaluations = data?.evaluations || {};

  const alternatives = Object.keys(evaluations || {});
  const criteria = Array.from(
    new Set(
      alternatives.flatMap((altName) =>
        Object.keys(evaluations?.[altName] || {})
      )
    )
  );

  if (!alternatives.length || !criteria.length) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        No evaluations found.
      </Typography>
    );
  }

  return (
    <TableContainer
      sx={{
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
        bgcolor: alpha(theme.palette.common.white, 0.02),
        overflowX: "auto",
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                fontWeight: 950,
                bgcolor: "#1a2a2fcf",
                minWidth: 180,
              }}
            >
              Alternative
            </TableCell>

            {criteria.map((criterionName) => (
              <TableCell
                key={criterionName}
                align="center"
                sx={{
                  fontWeight: 950,
                  bgcolor: "#1a2a2fcf",
                  minWidth: 150,
                }}
              >
                {criterionName}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {alternatives.map((altName) => (
            <TableRow key={altName}>
              <TableCell
                sx={{
                  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 900 }}>
                  {altName}
                </Typography>
              </TableCell>

              {criteria.map((criterionName) => {
                const cell = evaluations?.[altName]?.[criterionName] || null;
                const tooltip = getCellTooltip(cell);

                return (
                  <TableCell
                    key={`${altName}_${criterionName}`}
                    align="center"
                    sx={{
                      borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                    }}
                  >
                    <Tooltip title={tooltip || ""} arrow disableInteractive={!tooltip}>
                      <Stack spacing={0.15} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 850 }}>
                          {formatCellValue(cell?.value)}
                        </Typography>

                        {cell?.domain?.name ? (
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary", fontWeight: 850 }}
                          >
                            {cell.domain.name}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Tooltip>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AdminReadOnlyAxCMatrix;
