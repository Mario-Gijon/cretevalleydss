import { Unstable_RadarChart as RadarChart } from "@mui/x-charts";

import GraphUnavailable from "./GraphUnavailable.jsx";

const RadarAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  if (!Array.isArray(data?.axes) || !data.axes.length || !Array.isArray(data?.series) || !data.series.length) return <GraphUnavailable />;
  const series = data.series.filter((item) => Array.isArray(item?.values)).map((item) => ({ id: item.key, label: item.label || item.key, data: item.values, fillArea: true }));
  if (!series.length) return <GraphUnavailable />;
  return <RadarChart data-testid="radar-analytical-graph" height={340} radar={{ metrics: data.axes.map((axis) => axis.label || axis.key) }} series={series} />;
};

export default RadarAnalyticalGraph;
