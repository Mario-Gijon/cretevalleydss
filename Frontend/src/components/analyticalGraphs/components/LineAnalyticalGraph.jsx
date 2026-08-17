import { Line } from "react-chartjs-2";
import { CategoryScale, Chart as ChartJS, Legend, LineElement, LinearScale, PointElement, Tooltip } from "chart.js";

import GraphUnavailable from "./GraphUnavailable.jsx";
import { buildCartesianChartOptions, chartColor } from "../chartTheme.js";

ChartJS.register(CategoryScale, LineElement, LinearScale, PointElement, Legend, Tooltip);

const LineAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  if (!Array.isArray(data?.x) || !data.x.length || !Array.isArray(data?.series) || !data.series.length) return <GraphUnavailable />;
  const series = data.series.filter((item) => Array.isArray(item?.values));
  if (!series.length) return <GraphUnavailable />;
  return <Line
    data-testid="line-analytical-graph"
    data={{
      labels: data.x,
      datasets: series.map((item, index) => ({
        label: item.label || item.key,
        data: item.values,
        borderColor: chartColor(index),
        backgroundColor: `${chartColor(index)}36`,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.25,
      })),
    }}
    options={buildCartesianChartOptions({ xAxis: visualization.xAxis, yAxis: visualization.yAxis })}
  />;
};

export default LineAnalyticalGraph;
