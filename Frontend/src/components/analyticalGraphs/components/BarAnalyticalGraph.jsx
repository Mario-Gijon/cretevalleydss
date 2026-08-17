import { Bar } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";

import GraphUnavailable from "./GraphUnavailable.jsx";
import { buildCartesianChartOptions, chartColor } from "../chartTheme.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Legend, Tooltip);

const validSeries = (series) => Array.isArray(series) && series.filter((item) => Array.isArray(item?.values));

const BarAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  const categories = Array.isArray(data?.categories) ? data.categories : null;
  const series = validSeries(data?.series);
  if (!categories?.length || !series.length) return <GraphUnavailable />;
  const horizontal = visualization.orientation === "horizontal";
  return <Bar
    data-testid="bar-analytical-graph"
    data={{
      labels: categories,
      datasets: series.map((item, index) => ({
        label: item.label || item.key,
        data: item.values,
        backgroundColor: `${chartColor(index)}b8`,
        borderColor: chartColor(index),
        borderWidth: 1,
        borderRadius: 5,
        borderSkipped: false,
        ...(visualization.stacked ? { stack: "total" } : {}),
      })),
    }}
    options={buildCartesianChartOptions({ xAxis: visualization.xAxis, yAxis: visualization.yAxis, horizontal, stacked: Boolean(visualization.stacked) })}
  />;
};

export default BarAnalyticalGraph;
