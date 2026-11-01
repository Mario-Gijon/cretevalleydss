import { Radar } from "react-chartjs-2";
import { Chart as ChartJS, Filler, Legend, LineElement, PointElement, RadialLinearScale, Tooltip } from "chart.js";

import GraphUnavailable from "./GraphUnavailable.jsx";
import { buildRadialChartOptions, chartAccessibleLabel, chartColor, truncateAxisLabel } from "../chartTheme.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Legend, Tooltip);

const RadarAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  if (!Array.isArray(data?.axes) || !data.axes.length || !Array.isArray(data?.series) || !data.series.length) return <GraphUnavailable />;
  const series = data.series.filter((item) => Array.isArray(item?.values));
  if (!series.length) return <GraphUnavailable />;
  const labels = data.axes.map((axis) => axis.label || axis.key);
  const options = buildRadialChartOptions();
  options.scales.r.pointLabels.callback = (value) => truncateAxisLabel(value);
  const accessibleLabel = chartAccessibleLabel(visualization, labels);
  return <Radar
    role="img"
    aria-label={accessibleLabel}
    title={accessibleLabel}
    data-testid="radar-analytical-graph"
    data={{
      labels,
      datasets: series.map((item, index) => ({ label: item.label || item.key, data: item.values, borderColor: chartColor(index), backgroundColor: `${chartColor(index)}38`, pointBackgroundColor: chartColor(index), borderWidth: 2, pointRadius: 3 })),
    }}
    options={options}
  />;
};

export default RadarAnalyticalGraph;
