import { useState } from "react";
import {
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";

import { issueInfoTableViewportSx, overviewDataRowSeparator } from "../overview.styles";
import OverviewPanel from "./OverviewPanel";

const formatWeight = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return Number(value.toFixed(4)).toString();
  if (Array.isArray(value) && value.every(Number.isFinite)) return `[${value.map((entry) => Number(entry.toFixed(3))).join(", ")}]`;
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    if (typeof value.label === "string" && value.label.trim()) return value.label;
    if (Object.prototype.hasOwnProperty.call(value, "value")) return formatWeight(value.value);
  }
  return "—";
};

const collectExpanded = (criteria) => {
  const ids = [];
  const visit = (criterion) => {
    if (criterion.children?.length) {
      ids.push(String(criterion.id));
      criterion.children.forEach(visit);
    }
  };
  criteria.forEach(visit);
  return ids;
};

const visibleRows = (criteria, expanded) => {
  const rows = [];
  const visit = (criterion, depth) => {
    const children = Array.isArray(criterion.children) ? criterion.children : [];
    rows.push({ criterion, depth, children });
    if (children.length && expanded.has(String(criterion.id))) children.forEach((child) => visit(child, depth + 1));
  };
  criteria.forEach((criterion) => visit(criterion, 0));
  return rows;
};

const CriteriaStructurePanel = ({ data }) => {
  const criteria = data.criteria || [];
  const [expanded, setExpanded] = useState(() => new Set(collectExpanded(criteria)));
  const rows = visibleRows(criteria, expanded);

  return (
    <OverviewPanel title="Criteria structure" icon={<AccountTreeRoundedIcon fontSize="small" />} count={`${data.counts.criteria} total · ${data.counts.leafCriteria} leaf`}>
      {criteria.length ? (
        <TableContainer data-testid="overview-criteria-viewport" sx={issueInfoTableViewportSx}>
          <Table size="small" stickyHeader aria-label="Criteria structure" sx={{ minWidth: 500 }}>
            <TableHead>
              <TableRow>
                {["Criterion", "Type", "Weight"].map((heading) => (
                  <TableCell key={heading} align={heading === "Criterion" ? "left" : "center"} sx={{ fontSize: "0.72rem", fontWeight: "fontWeightBold", whiteSpace: "nowrap", bgcolor: "rgba(10, 25, 38, 0.98)", borderBottom: 0 }}>{heading}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody
              sx={{
                "& .MuiTableCell-root": { borderBottom: 0 },
                "& > .MuiTableRow-root:not(:last-of-type) > .MuiTableCell-root": {
                  borderBottom: overviewDataRowSeparator,
                },
              }}
            >
              {rows.map(({ criterion, depth, children }) => {
                const hasChildren = children.length > 0;
                const id = String(criterion.id);
                const isOpen = expanded.has(id);
                const type = criterion.type === "cost" ? "Cost" : criterion.type === "benefit" ? "Benefit" : "—";
                const criterionName = (
                  <>
                    <Typography variant="body2" noWrap title={criterion.name} sx={{ fontWeight: hasChildren ? "fontWeightBold" : "fontWeightMedium" }}>{criterion.name}</Typography>
                    {criterion.description ? (
                      <Tooltip title={criterion.description} placement="top" describeChild>
                        <Typography tabIndex={0} variant="caption" sx={{ color: "text.secondary", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.35, overflowWrap: "anywhere" }}>{criterion.description}</Typography>
                      </Tooltip>
                    ) : null}
                  </>
                );
                return (
                  <TableRow key={id} hover>
                    <TableCell align="left" sx={{ minWidth: 270, pl: 1 + depth * 2 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", minWidth: 0, gap: 6 }}>
                        {hasChildren ? <IconButton size="small" aria-label={`${isOpen ? "Collapse" : "Expand"} ${criterion.name}`} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} sx={{ width: 25, height: 25, color: "secondary.light", flexShrink: 0 }}>{isOpen ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}</IconButton> : <RadioButtonUncheckedRoundedIcon sx={{ mt: 0.6, ml: 0.65, mr: 0.3, color: "secondary.light", fontSize: 13, flexShrink: 0 }} />}
                        <div style={{ minWidth: 0, flex: 1 }}>{criterionName}</div>
                      </div>
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      {criterion.type === "cost" || criterion.type === "benefit" ? (
                        <Chip size="small" variant="outlined" color={criterion.type === "cost" ? "error" : "success"} label={type} sx={{ height: 22 }} />
                      ) : "—"}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>{formatWeight(criterion.weight)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : <Typography color="text.secondary">No criteria are available.</Typography>}
    </OverviewPanel>
  );
};

export default CriteriaStructurePanel;
