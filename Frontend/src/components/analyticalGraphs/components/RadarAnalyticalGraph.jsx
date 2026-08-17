import { Radar } from "react-chartjs-2";
import { Chart as ChartJS, Filler, Legend, LineElement, PointElement, RadialLinearScale, Tooltip } from "chart.js";

import GraphUnavailable from "./GraphUnavailable.jsx";
import { buildRadialChartOptions, chartColor } from "../chartTheme.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Legend, Tooltip);

const RadarAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  if (!Array.isArray(data?.axes) || !data.axes.length || !Array.isArray(data?.series) || !data.series.length) return <GraphUnavailable />;
  const series = data.series.filter((item) => Array.isArray(item?.values));
  if (!series.length) return <GraphUnavailable />;
  return <Radar
    data-testid="radar-analytical-graph"
    data={{
      labels: data.axes.map((axis) => axis.label || axis.key),
      datasets: series.map((item, index) => ({ label: item.label || item.key, data: item.values, borderColor: chartColor(index), backgroundColor: `${chartColor(index)}38`, pointBackgroundColor: chartColor(index), borderWidth: 2, pointRadius: 3 })),
    }}
    options={buildRadialChartOptions()}
  />;
};

export default RadarAnalyticalGraph;
