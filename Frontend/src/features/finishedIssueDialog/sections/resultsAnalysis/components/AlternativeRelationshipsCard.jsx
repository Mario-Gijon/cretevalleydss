import { useMemo, useState } from "react";
import {
  Box,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";

import { RANKING_ALTERNATIVE_COLORS } from "../logic/rankingAlternativeColors.js";
import {
  alternativeRelationshipsForPhase,
  buildRelationshipNetworkNodes,
  relationshipAlternatives,
  relationshipPairValue,
} from "../logic/alternativeRelationshipsPresentation.js";

const pct = (value) => `${Math.round(value * 100)}%`;
const phaseLabel = (phase) => (phase === 0 ? "Initial" : `Round ${phase}`);
const panelSx = { minWidth: 0 };
const cellColor = (value) =>
  value == null
    ? "rgba(255,255,255,0.035)"
    : `rgba(39, 191, 213, ${0.1 + value * 0.56})`;

const Heatmap = ({ relationship, focusId, onFocus, execution }) => {
  const alternatives = relationshipAlternatives(relationship);
  return (
    <Box sx={{ overflow: "auto", maxWidth: "100%" }}>
      <Box
        component="table"
        sx={{
          minWidth: Math.max(360, alternatives.length * 76 + 135),
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0.35,
        }}
      >
        <tbody>
          <tr>
            <th />
            <th colSpan={alternatives.length}>
              <Typography variant="caption" color="text.secondary">
                Closer ← relative separation → Farther
              </Typography>
            </th>
          </tr>
          <tr>
            <th />
            <>
              {alternatives.map((alternative) => (
                <th key={alternative.alternativeId}>
                  <Tooltip
                    title={alternative.name || alternative.alternativeId}
                  >
                    <Box
                      component="button"
                      type="button"
                      onClick={() =>
                        onFocus(
                          focusId === alternative.alternativeId
                            ? null
                            : alternative.alternativeId,
                        )
                      }
                      sx={{
                        border: 0,
                        bgcolor: "transparent",
                        color: "text.primary",
                        cursor: "pointer",
                        font: "inherit",
                        fontSize: 11,
                        fontWeight: 800,
                        maxWidth: 86,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {alternative.name || alternative.alternativeId}
                    </Box>
                  </Tooltip>
                </th>
              ))}
            </>
          </tr>
          {alternatives.map((left) => (
            <tr key={left.alternativeId}>
              <th>
                <Box
                  component="button"
                  type="button"
                  onClick={() =>
                    onFocus(
                      focusId === left.alternativeId
                        ? null
                        : left.alternativeId,
                    )
                  }
                  sx={{
                    border: 0,
                    bgcolor: "transparent",
                    color: "text.primary",
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: 12,
                    fontWeight: 800,
                    maxWidth: 110,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {left.name || left.alternativeId}
                </Box>
              </th>
              {alternatives.map((right) => {
                const value = relationshipPairValue({
                  pairs: relationship.pairs,
                  leftAlternativeId: left.alternativeId,
                  rightAlternativeId: right.alternativeId,
                });
                const diagonal = left.alternativeId === right.alternativeId;
                const dimmed =
                  focusId &&
                  left.alternativeId !== focusId &&
                  right.alternativeId !== focusId;
                const label = diagonal
                  ? `${left.name}: same alternative`
                  : `${left.name} ↔ ${right.name}. Relative separation: ${pct(value)}. ${phaseLabel(relationship.phase)}${execution?.displayLabel ? `. ${execution.displayLabel}` : ""}`;
                return (
                  <td key={right.alternativeId}>
                    <Tooltip title={label}>
                      <Box
                        tabIndex={diagonal ? -1 : 0}
                        aria-label={label}
                        sx={{
                          minWidth: 52,
                          py: 0.85,
                          px: 0.45,
                          textAlign: "center",
                          borderRadius: 1,
                          bgcolor: cellColor(value),
                          color: "text.primary",
                          opacity: dimmed ? 0.28 : 1,
                          fontSize: 12,
                          fontWeight: 850,
                        }}
                      >
                        {diagonal ? "—" : value == null ? "—" : pct(value)}
                      </Box>
                    </Tooltip>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
};

const Network = ({ relationship, focusId, onFocus, execution }) => {
  const alternatives = relationshipAlternatives(relationship);
  const nodes = useMemo(
    () => buildRelationshipNetworkNodes(alternatives),
    [alternatives],
  );
  const byId = new Map(nodes.map((node) => [node.alternativeId, node]));
  const pairs = Array.isArray(relationship?.pairs) ? relationship.pairs : [];
  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        Node positions are schematic; edge labels show the stored relative
        separation.
      </Typography>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Alternative relationship network for ${phaseLabel(relationship.phase)}`}
        style={{ width: "100%", minHeight: 300, display: "block" }}
      >
        {pairs.map((pair, index) => {
          const left = byId.get(pair.leftAlternativeId);
          const right = byId.get(pair.rightAlternativeId);
          const value = pair.relativeSeparation;
          if (!left || !right || typeof value !== "number") return null;
          const dimmed =
            focusId &&
            left.alternativeId !== focusId &&
            right.alternativeId !== focusId;
          const label = `${left.name} ↔ ${right.name}. Relative separation: ${pct(value)}. ${phaseLabel(relationship.phase)}${execution?.displayLabel ? `. ${execution.displayLabel}` : ""}`;
          return (
            <Tooltip
              key={`${pair.leftAlternativeId}-${pair.rightAlternativeId}-${index}`}
              title={label}
            >
              <line
                x1={left.x}
                y1={left.y}
                x2={right.x}
                y2={right.y}
                stroke="rgba(65,204,222,0.72)"
                strokeWidth={0.45 + value * 1.6}
                opacity={dimmed ? 0.16 : 0.8}
              >
                <title>{label}</title>
              </line>
            </Tooltip>
          );
        })}
        {nodes.map((node, index) => {
          const focused = focusId === node.alternativeId;
          const dimmed = focusId && !focused;
          return (
            <g
              key={node.alternativeId}
              role="button"
              tabIndex="0"
              aria-label={`${node.name || node.alternativeId}${node.rank === 1 ? ", Winner" : ""}`}
              onClick={() => onFocus(focused ? null : node.alternativeId)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onFocus(focused ? null : node.alternativeId);
                }
              }}
              style={{ cursor: "pointer", opacity: dimmed ? 0.35 : 1 }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r="5.2"
                fill={
                  RANKING_ALTERNATIVE_COLORS[
                    index % RANKING_ALTERNATIVE_COLORS.length
                  ]
                }
                stroke={focused ? "white" : "rgba(4,15,24,0.9)"}
                strokeWidth={focused ? 1.2 : 0.6}
              />
              <text
                x={node.x}
                y={node.y + 0.9}
                textAnchor="middle"
                fill="#07111c"
                fontSize="3"
                fontWeight="800"
              >
                {node.rank || index + 1}
              </text>
              <text
                x={node.x}
                y={node.y + 8.5}
                textAnchor="middle"
                fill="currentColor"
                fontSize="3.1"
              >
                {node.name || node.alternativeId}
              </text>
              {node.rank === 1 ? (
                <text
                  x={node.x}
                  y={node.y - 7.2}
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="2.8"
                >
                  Winner
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </Box>
  );
};

const AlternativeRelationshipsCard = ({ executions = [] }) => {
  const [representation, setRepresentation] = useState("heatmap");
  const [focusId, setFocusId] = useState(null);
  const available = executions
    .map((execution) => ({
      execution,
      relationship: alternativeRelationshipsForPhase(
        execution,
        execution.sourcePhase,
      ),
    }))
    .filter(
      (entry) =>
        relationshipAlternatives(entry.relationship).length > 1 &&
        Array.isArray(entry.relationship?.pairs) &&
        entry.relationship.pairs.length,
    );
  if (!available.length) return null;
  const focusOptions = relationshipAlternatives(available[0].relationship);
  return (
    <Box
      sx={{
        border: "1px solid rgba(83,198,214,0.16)",
        bgcolor: "rgba(8,18,29,0.88)",
        borderRadius: 3,
        p: { xs: 1.5, sm: 2 },
        minWidth: 0,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        sx={{ mb: 1.25 }}
      >
        <Box>
          <Typography variant="h6" component="h2">
            Alternative relationships
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Relative separation between alternatives in the selected phase.
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.8}>
          <TextField
            select
            size="small"
            label="Focus"
            value={focusId || ""}
            onChange={(event) => setFocusId(event.target.value || null)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All alternatives</MenuItem>
            {focusOptions.map((alternative) => (
              <MenuItem
                key={alternative.alternativeId}
                value={alternative.alternativeId}
              >
                {alternative.name || alternative.alternativeId}
              </MenuItem>
            ))}
          </TextField>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={representation}
            onChange={(_, value) => value && setRepresentation(value)}
            aria-label="Alternative relationship representation"
          >
            <ToggleButton value="heatmap">Heatmap</ToggleButton>
            <ToggleButton value="network">Network</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md:
              available.length > 1
                ? `${"minmax(0, 1fr) 1px ".repeat(Math.min(available.length, 3) - 1)}minmax(0, 1fr)`
                : "minmax(0, 1fr)",
          },
          gap: 1.4,
          alignItems: "start",
        }}
      >
        {available.flatMap(({ execution, relationship }, index) => {
          const panel = (
            <Box
              key={execution.key}
              data-testid="alternative-relationships-execution"
              sx={panelSx}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 900, mb: 0.8, color: execution.color }}
              >
                {execution.displayLabel}
              </Typography>
              {representation === "heatmap" ? (
                <Heatmap
                  relationship={relationship}
                  focusId={focusId}
                  onFocus={setFocusId}
                  execution={execution}
                />
              ) : (
                <Network
                  relationship={relationship}
                  focusId={focusId}
                  onFocus={setFocusId}
                  execution={execution}
                />
              )}
            </Box>
          );
          return index < available.length - 1
            ? [
                panel,
                <Box
                  key={`${execution.key}-divider`}
                  data-testid="alternative-relationships-divider"
                  aria-hidden="true"
                  sx={{
                    bgcolor: "rgba(83,198,214,0.22)",
                    width: "100%",
                    height: { xs: "1px", md: "100%" },
                  }}
                />,
              ]
            : [panel];
        })}
      </Box>
    </Box>
  );
};
export default AlternativeRelationshipsCard;
