import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { HeatmapChart } from "echarts/charts";
import { GridComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { Box } from "@mui/material";

echarts.use([HeatmapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

const useEChart = (option, onClick) => {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    if (onClick) chart.on("click", onClick);
    const resize = () => chart.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(ref.current);
    return () => { observer.disconnect(); chart.dispose(); chartRef.current = null; };
  }, [onClick]);
  useEffect(() => { chartRef.current?.setOption(option, true); }, [option]);
  return ref;
};

export const RelationshipHeatmap = ({ option, onClick }) => <Box ref={useEChart(option, onClick)} sx={{ width: "100%", height: 225, minWidth: 0 }} />;
