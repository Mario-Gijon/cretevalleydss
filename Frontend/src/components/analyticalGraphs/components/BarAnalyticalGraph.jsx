import { BarChart } from "@mui/x-charts";

import GraphUnavailable from "./GraphUnavailable.jsx";

const validSeries = (series) => Array.isArray(series) && series.filter((item) => Array.isArray(item?.values));

const BarAnalyticalGraph = ({ visualization }) => {
  const data = visualization?.data;
  const categories = Array.isArray(data?.categories) ? data.categories : null;
  const series = validSeries(data?.series);
  if (!categories?.length || !series.length) return <GraphUnavailable />;
  const horizontal = visualization.orientation === "horizontal";
  const axis = { scaleType: "band", data: categories };
  return <BarChart
    data-testid="bar-analytical-graph"
    height={340}
    layout={horizontal ? "horizontal" : "vertical"}
    series={series.map((item) => ({ id: item.key, label: item.label || item.key, data: item.values, stack: visualization.stacked ? "total" : undefined }))}
    xAxis={horizontal ? [{ ...visualization.xAxis }] : [{ ...visualization.xAxis, ...axis }]}
    yAxis={horizontal ? [{ ...visualization.yAxis, ...axis }] : [{ ...visualization.yAxis }]}
    grid={{ horizontal: !horizontal, vertical: horizontal }}
  />;
};

export default BarAnalyticalGraph;
