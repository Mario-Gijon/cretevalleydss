import {
  getPreferenceDistributionClusterOffsets,
  PREFERENCE_DISTRIBUTION_CLUSTER_SPACING_PX,
} from "./preferenceDistributionMatrix.js";

const isEnabled = (options) => options?.enabled === true;

export const preferenceDistributionMatrixPlugin = {
  id: "preferenceDistributionMatrix",
  afterDatasetsUpdate(chart, _args, options) {
    if (!isEnabled(options)) return;

    const offsets = getPreferenceDistributionClusterOffsets(
      chart.data.datasets,
      options.clusterSpacingPx ?? PREFERENCE_DISTRIBUTION_CLUSTER_SPACING_PX
    );
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const elements = chart.getDatasetMeta(datasetIndex).data;
      (dataset.data || []).forEach((point, dataIndex) => {
        const element = elements[dataIndex];
        if (!element || !Number.isFinite(point?.x)) return;
        element.x = chart.scales.x.getPixelForValue(point.x) + (offsets.get(`${datasetIndex}:${dataIndex}`) || 0);
      });
    });
  },
  beforeDatasetsDraw(chart, _args, options) {
    if (!isEnabled(options)) return;

    const { left, right, top, bottom } = chart.chartArea;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    const { ctx } = chart;

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();

    let columnIndex = 0;
    for (let boundary = xScale.min; boundary <= xScale.max + 1e-8; boundary += 1) {
      if (columnIndex % 2 === 1) {
        const nextBoundary = Math.min(boundary + 1, xScale.max);
        const x1 = xScale.getPixelForValue(boundary);
        const x2 = xScale.getPixelForValue(nextBoundary);
        ctx.fillStyle = "rgba(83,198,214,0.025)";
        ctx.fillRect(Math.min(x1, x2), top, Math.abs(x2 - x1), bottom - top);
      }
      columnIndex += 1;
    }

    ctx.strokeStyle = options.gridColor || "rgba(255,255,255,0.13)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let boundary = xScale.min; boundary <= xScale.max + 1e-8; boundary += 1) {
      const x = Math.round(xScale.getPixelForValue(boundary)) + 0.5;
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let boundary = yScale.min; boundary <= yScale.max + 1e-8; boundary += 1) {
      const y = Math.round(yScale.getPixelForValue(boundary)) + 0.5;
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();
    ctx.restore();
  },
};
