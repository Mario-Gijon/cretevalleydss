import { PieChart } from "@mui/x-charts";

import GraphUnavailable from "./GraphUnavailable.jsx";

const PieAnalyticalGraph = ({ visualization }) => {
  const items = visualization?.data?.items;
  if (!Array.isArray(items) || !items.length) return <GraphUnavailable />;
  const data = items.filter((item) => Number.isFinite(item?.value)).map((item) => ({ id: item.key, label: item.label || item.key, value: item.value }));
  if (!data.length) return <GraphUnavailable />;
  return <PieChart data-testid="pie-analytical-graph" height={340} series={[{ data, innerRadius: visualization.donut ? 65 : 0 }]} />;
};

export default PieAnalyticalGraph;
