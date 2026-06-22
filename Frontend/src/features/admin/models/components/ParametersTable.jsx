import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import { modelManifestValueToText } from "../logic/formatModelManifestDisplay";
import EmptyState from "./EmptyState";

export default function ParametersTable({ parameters }) {
  const items = Array.isArray(parameters) ? parameters : [];

  if (items.length === 0) return <EmptyState>No parameters declared.</EmptyState>;

  return (
    <TableContainer
      sx={(theme) => ({
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
      })}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Structure</TableCell>
            <TableCell>Restrictions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((parameter) => (
            <TableRow key={parameter?.name || JSON.stringify(parameter)}>
              <TableCell sx={{ fontWeight: 900 }}>{parameter?.name || "Unknown"}</TableCell>
              <TableCell>{parameter?.parameterStructureKey || "Unknown"}</TableCell>
              <TableCell sx={{ overflowWrap: "anywhere" }}>
                {modelManifestValueToText(parameter?.restrictions || {})}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
