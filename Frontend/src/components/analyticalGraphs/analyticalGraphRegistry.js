import BarAnalyticalGraph from "./components/BarAnalyticalGraph.jsx";
import HeatmapAnalyticalGraph from "./components/HeatmapAnalyticalGraph.jsx";
import ImageAnalyticalGraph from "./components/ImageAnalyticalGraph.jsx";
import LineAnalyticalGraph from "./components/LineAnalyticalGraph.jsx";
import PieAnalyticalGraph from "./components/PieAnalyticalGraph.jsx";
import RadarAnalyticalGraph from "./components/RadarAnalyticalGraph.jsx";
import ScatterAnalyticalGraph from "./components/ScatterAnalyticalGraph.jsx";

export const analyticalGraphRegistry = {
  bar: BarAnalyticalGraph,
  line: LineAnalyticalGraph,
  scatter: ScatterAnalyticalGraph,
  pie: PieAnalyticalGraph,
  radar: RadarAnalyticalGraph,
  heatmap: HeatmapAnalyticalGraph,
  image: ImageAnalyticalGraph,
};

export const resolveAnalyticalGraphRenderer = (type) => analyticalGraphRegistry[type] || null;
