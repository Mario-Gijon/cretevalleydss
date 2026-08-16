import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { RelationshipHeatmap } from "./AlternativeRelationshipsEChart.jsx";
import { RANKING_ALTERNATIVE_COLORS } from "../logic/rankingAlternativeColors.js";
import { alternativeRelationshipsForPhase, buildAlternativeRelationshipsHeatmap, buildRelationshipNetworkNodes } from "../logic/alternativeRelationshipsPresentation.js";

const phaseLabel = (phase) => (phase === 0 ? "Initial" : `Round ${phase}`);
const pct = (value) => `${Math.round(value * 100)}%`;

const AlternativeRelationshipsCard = ({ executions = [] }) => {
  const [focusId, setFocusId] = useState(null);
  const entries = executions.map((execution) => ({ execution, relationship: alternativeRelationshipsForPhase(execution, execution.sourcePhase) })).filter(({ relationship }) => relationship?.pairs?.length);
  if (!entries.length) return null;
  return <Box sx={{ border: "1px solid rgba(83,198,214,0.16)", bgcolor: "rgba(8,18,29,0.88)", borderRadius: 3, p: { xs: 1.5, sm: 2 }, minWidth: 0 }}><Box sx={{ mb: 1.25 }}><Typography variant="h6" component="h2">Alternative relationships</Typography><Typography variant="body2" color="text.secondary">Relative separation between alternatives in the selected phase.</Typography></Box><Stack spacing={1.4} divider={<Box sx={{ borderTop: "1px solid rgba(83,198,214,0.14)" }} />}>{entries.map(({ execution, relationship }) => <ExecutionGroup key={execution.key} execution={execution} relationship={relationship} focusId={focusId} onFocus={setFocusId} />)}</Stack></Box>;
};

const ExecutionGroup = ({ execution, relationship, focusId, onFocus }) => {
  const { alternatives, data } = useMemo(() => buildAlternativeRelationshipsHeatmap(relationship), [relationship]);
  const names = alternatives.map((item) => item.name || item.alternativeId);
  const heatmapOption = useMemo(() => ({ animation: false, grid: { left: 68, right: 8, top: 48, bottom: 26 }, xAxis: { type: "category", position: "top", data: names, axisLabel: { color: "#d7eef2", fontSize: 10, interval: 0, rotate: names.length > 5 ? 35 : 0 } }, yAxis: { type: "category", data: names, axisLabel: { color: "#d7eef2", fontSize: 10 } }, visualMap: { min: 0, max: 1, calculable: false, orient: "horizontal", left: "center", bottom: 2, itemWidth: 82, itemHeight: 7, text: ["Farther", "Closer"], textStyle: { color: "#b7d7dd", fontSize: 9 }, inRange: { color: ["#143442", "#27bfd5"] } }, tooltip: { trigger: "item", backgroundColor: "rgba(4,15,24,0.96)", borderColor: "rgba(83,198,214,0.7)", borderWidth: 1, textStyle: { color: "#e8fbff", fontSize: 11 }, extraCssText: "border-radius:6px;padding:7px 9px;", formatter: (params) => { const [x, y, value] = params.value; return `${names[x]} ↔ ${names[y]}<br/>Relative separation: ${pct(value)}<br/>Phase: ${phaseLabel(relationship.phase)}<br/>Execution: ${execution.displayLabel}`; } }, series: [{ type: "heatmap", data, progressive: 0, itemStyle: { borderColor: "rgba(4,15,24,0.55)", borderWidth: 2 } }] }), [data, execution.displayLabel, names, relationship.phase]);
  const click = (params) => { const id = params?.data?.alternativeId; if (id) onFocus(focusId === id ? null : id); };
  return <Box sx={{ minWidth: 0, pt: 0.6 }} data-testid="alternative-relationships-execution"><Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.8, color: execution.color }}>{execution.displayLabel}</Typography><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" }, gap: 1.2, alignItems: "start" }}><Box><Typography variant="caption" color="text.secondary">Heatmap</Typography><RelationshipHeatmap option={heatmapOption} onClick={click} /></Box><Box><Typography variant="caption" color="text.secondary">Relationship network</Typography><NetworkSvg alternatives={alternatives} relationship={relationship} execution={execution} focusId={focusId} onFocus={onFocus} /></Box></Box></Box>;
};

const NetworkSvg = ({ alternatives, relationship, execution, focusId, onFocus }) => {
  const nodes = buildRelationshipNetworkNodes(alternatives);
  const byId = new Map(nodes.map((node) => [node.alternativeId, node]));
  return <Box sx={{ width: "100%", height: 225 }}><svg viewBox="0 0 100 100" role="img" aria-label={`Relationship network for ${phaseLabel(relationship.phase)}`} style={{ width: "100%", height: "225px", display: "block" }}>{relationship.pairs.map((pair, index) => { const left = byId.get(pair.leftAlternativeId); const right = byId.get(pair.rightAlternativeId); if (!left || !right) return null; const dimmed = focusId && left.alternativeId !== focusId && right.alternativeId !== focusId; const label = `${left.name} ↔ ${right.name}. Relative separation: ${pct(pair.relativeSeparation)}. Phase: ${phaseLabel(relationship.phase)} · Execution: ${execution.displayLabel}`; return <line key={`${pair.leftAlternativeId}-${pair.rightAlternativeId}-${index}`} x1={left.x} y1={left.y} x2={right.x} y2={right.y} stroke="rgba(65,204,222,0.72)" strokeWidth={0.5 + pair.relativeSeparation} opacity={dimmed ? 0.12 : 0.7}><title>{label}</title></line>; })}{nodes.map((node, index) => { const selected = focusId === node.alternativeId; return <g key={node.alternativeId} role="button" tabIndex={0} aria-label={node.name || node.alternativeId} onClick={() => onFocus(selected ? null : node.alternativeId)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onFocus(selected ? null : node.alternativeId); } }} style={{ cursor: "pointer", opacity: focusId && !selected ? 0.35 : 1 }}><circle cx={node.x} cy={node.y} r={Math.max(3.8, 5.2 - nodes.length * 0.12)} fill={RANKING_ALTERNATIVE_COLORS[index % RANKING_ALTERNATIVE_COLORS.length]} stroke={selected ? "white" : "rgba(4,15,24,0.9)"} strokeWidth={selected ? 1.3 : 0.6} /><text x={node.x} y={node.y + 1} textAnchor="middle" fill="#07111c" fontSize="3" fontWeight="800">{node.rank || index + 1}</text><title>{node.name || node.alternativeId}</title></g>; })}</svg></Box>;
};

export default AlternativeRelationshipsCard;
