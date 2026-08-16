import { LineChart } from "@mui/x-charts";

import GraphUnavailable from "./GraphUnavailable.jsx";

const LineAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  if (!Array.isArray(data?.x) || !data.x.length || !Array.isArray(data?.series) || !data.series.length) return <GraphUnavailable />;
  const series = data.series.filter((item) => Array.isArray(item?.values));
  if (!series.length) return <GraphUnavailable />;
  return <LineChart
    data-testid="line-analytical-graph"
    height={340}
    xAxis={[{ ...visualization.xAxis, data: data.x }]}
    yAxis={[{ ...visualization.yAxis }]}
    series={series.map((item) => ({ id: item.key, label: item.label || item.key, data: item.values, showMark: true }))}
    grid={{ horizontal: true }}
  />;
};

export default LineAnalyticalGraph;
