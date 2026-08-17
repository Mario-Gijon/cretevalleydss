import { Doughnut, Pie } from "react-chartjs-2";
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";

import GraphUnavailable from "./GraphUnavailable.jsx";
import { chartColor } from "../chartTheme.js";

ChartJS.register(ArcElement, Legend, Tooltip);

const PieAnalyticalGraph = ({ visualization }) => {
  const items = visualization?.data?.items;
  if (!Array.isArray(items) || !items.length) return <GraphUnavailable />;
  const data = items.filter((item) => Number.isFinite(item?.value));
  if (!data.length) return <GraphUnavailable />;
  const Chart = visualization.donut ? Doughnut : Pie;
  return <Chart
    data-testid="pie-analytical-graph"
    data={{
      labels: data.map((item) => item.label || item.key),
      datasets: [{ data: data.map((item) => item.value), backgroundColor: data.map((_, index) => `${chartColor(index)}c7`), borderColor: data.map((_, index) => chartColor(index)), borderWidth: 1.5 }],
    }}
    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { color: "rgba(255,255,255,0.82)", usePointStyle: true } }, tooltip: { backgroundColor: "rgba(5,15,25,0.96)", titleColor: "#ffffff", bodyColor: "rgba(255,255,255,0.86)" } } }}
  />;
};

export default PieAnalyticalGraph;
