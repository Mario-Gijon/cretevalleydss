import { alpha } from "@mui/material/styles";
import {
  findHoveredConnector,
  formatProjectedDistance,
} from "./buildExpertCollectiveConnectors.js";

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
  afterDatasetsDraw(chart) {
    const expertDatasetIndexes = chart.data.datasets
      .map((dataset, index) => dataset.expertCollectiveRole === "experts" ? index : -1)
      .filter((index) => index >= 0);
    if (!expertDatasetIndexes.length) return;
    const { ctx } = chart;
    ctx.save();
    expertDatasetIndexes.forEach((index) => {
      if (!chart.isDatasetVisible(index)) return;
      chart.getDatasetMeta(index).data.forEach((element) => {
        if (!element.skip) element.draw(ctx);
      });
    });

    const pixelGroups = new Map();
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      if (!dataset.expertCollectiveRole || !chart.isDatasetVisible(datasetIndex)) return;
      chart.getDatasetMeta(datasetIndex).data.forEach((element, dataIndex) => {
        if (element.skip || !Number.isFinite(element.x) || !Number.isFinite(element.y)) return;
        const key = `${Math.round(element.x)}\u0000${Math.round(element.y)}`;
        const group = pixelGroups.get(key) || { x: element.x, y: element.y, count: 0 };
        const rawPoint = dataset.data[dataIndex];
        group.count += dataset.expertCollectiveRole === "experts"
          ? Math.max(1, rawPoint?.expertCount || 1)
          : 1;
        pixelGroups.set(key, group);
      });
    });
    pixelGroups.forEach((group) => {
      if (group.count < 2) return;
      const label = `×${group.count}`;
      ctx.save();
      ctx.font = "600 10px sans-serif";
      const width = ctx.measureText(label).width + 8;
      const x = Math.min(chart.chartArea.right - width, group.x + 9);
      const y = Math.max(chart.chartArea.top + 12, group.y - 10);
      ctx.fillStyle = "rgba(4,12,20,0.9)";
      ctx.fillRect(x, y - 9, width, 14);
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.fillText(label, x + 4, y + 1);
      ctx.restore();
    });
    ctx.restore();
  },
  afterDraw(chart) {
    const connector = chart.$expertCollectiveConnectorHover;
    if (!connector) return;
    const { ctx, chartArea } = chart;
    const lines = [`Expert: ${connector.expertLabel}`, ...(connector.executionLabel ? [`Execution: ${connector.executionLabel}`] : []), `Projected distance: ${formatProjectedDistance(connector.projectedDistance)}`, ...(connector.isClosest ? ["Closest expert to collective"] : [])];
    const x = Math.min(chartArea.right - 190, connector.to.x + 12); const y = Math.max(chartArea.top + 10, connector.to.y - 10);
    ctx.save(); ctx.font = "12px sans-serif"; const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 18;
    ctx.fillStyle = "rgba(4,12,20,0.94)"; ctx.fillRect(x, y, width, lines.length * 17 + 12); ctx.fillStyle = "rgba(255,255,255,0.92)";
    lines.forEach((line, index) => ctx.fillText(line, x + 9, y + 18 + index * 17)); ctx.restore();
  },
};

export default expertCollectiveConnectorPlugin;
