import { alpha } from "@mui/material/styles";
import { findHoveredConnector } from "./buildExpertCollectiveConnectors.js";

const pixelConnectors = (chart, groups) => groups.flatMap((group) => group.connectors.map((connector) => ({
  ...connector,
  color: group.color,
  from: { x: chart.scales.x.getPixelForValue(connector.from.x), y: chart.scales.y.getPixelForValue(connector.from.y) },
  to: { x: chart.scales.x.getPixelForValue(connector.to.x), y: chart.scales.y.getPixelForValue(connector.to.y) },
})));

export const expertCollectiveConnectorPlugin = {
  id: "expertCollectiveConnectors",
  beforeDatasetsDraw(chart, _args, options) {
    const connectors = pixelConnectors(chart, options.groups || []);
    chart.$expertCollectiveConnectors = connectors;
    const { ctx } = chart;
    ctx.save();
    connectors.forEach((connector) => {
      ctx.strokeStyle = alpha(connector.color, connector.isClosest ? 0.62 : 0.28);
      ctx.lineWidth = connector.isClosest ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(connector.from.x, connector.from.y); ctx.lineTo(connector.to.x, connector.to.y); ctx.stroke();
    });
    ctx.restore();
  },
  afterEvent(chart, args) {
    const event = args.event;
    if (!event || !chart.$expertCollectiveConnectors) return;
    const hovered = findHoveredConnector({ point: { x: event.x, y: event.y }, connectors: chart.$expertCollectiveConnectors, tolerance: 7 });
    if (chart.$expertCollectiveConnectorHover !== hovered) { chart.$expertCollectiveConnectorHover = hovered; args.changed = true; }
  },
  afterDraw(chart) {
    const connector = chart.$expertCollectiveConnectorHover;
    if (!connector) return;
    const { ctx, chartArea } = chart;
    const lines = [`Expert: ${connector.expertLabel}`, ...(connector.executionLabel ? [`Execution: ${connector.executionLabel}`] : []), `Projected distance: ${connector.projectedDistance.toFixed(3)}`, ...(connector.isClosest ? ["Closest expert to collective"] : [])];
    const x = Math.min(chartArea.right - 190, connector.to.x + 12); const y = Math.max(chartArea.top + 10, connector.to.y - 10);
    ctx.save(); ctx.font = "12px sans-serif"; const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 18;
    ctx.fillStyle = "rgba(4,12,20,0.94)"; ctx.fillRect(x, y, width, lines.length * 17 + 12); ctx.fillStyle = "rgba(255,255,255,0.92)";
    lines.forEach((line, index) => ctx.fillText(line, x + 9, y + 18 + index * 17)); ctx.restore();
  },
};

export default expertCollectiveConnectorPlugin;
