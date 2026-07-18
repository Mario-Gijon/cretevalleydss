import { useMemo } from "react";
import { Box, useTheme } from "@mui/material";
import { Bar } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from "chart.js";

import { dashboardChartSx } from "../../dashboard.styles";
import { PERFORMANCE_BAR_TOKENS } from "../../../../shared/logic/chartVisualTokens.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const formatScore = (value) => typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(4)).toString() : "—";

const valueLabelsPlugin = {
  id: "dashboardValueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    const color = chart.options.plugins?.dashboardValueLabels?.color || "#ffffff";
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = "600 11px Inter, Roboto, sans-serif";
    ctx.textAlign = "center";
    meta.data.forEach((bar, index) => {
      const rawValue = dataset.data[index];
      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) return;
      ctx.textBaseline = rawValue >= 0 ? "bottom" : "top";
      ctx.fillText(formatScore(rawValue), bar.x, rawValue >= 0 ? bar.y - 6 : bar.y + 6);
    });
    ctx.restore();
  },
};

const ResultsRankingBarChart = ({ ranking = [] }) => {
  const theme = useTheme();
  const items = useMemo(() => ranking.slice(0, 3).filter((item) => typeof item?.score === "number" && Number.isFinite(item.score)), [ranking]);
  const data = useMemo(() => ({
    labels: items.map((item) => item.name),
    datasets: [{
      data: items.map((item) => item.score),
      backgroundColor: items.map((_, index) => index === 0 ? PERFORMANCE_BAR_TOKENS.winnerFill : PERFORMANCE_BAR_TOKENS.standardFill),
      borderColor: items.map((_, index) => index === 0 ? PERFORMANCE_BAR_TOKENS.winnerBorder : PERFORMANCE_BAR_TOKENS.standardBorder),
      borderWidth: 1,
      borderRadius: PERFORMANCE_BAR_TOKENS.radius,
      borderSkipped: false,
      maxBarThickness: 38,
    }],
  }), [items]);
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: { top: 22, right: 6, bottom: 0, left: 0 } },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => ` ${formatScore(context.raw)}` } },
      dashboardValueLabels: { color: theme.palette.text.primary },
    },
    scales: {
      x: { grid: { display: false }, border: { color: "rgba(255,255,255,0.10)" }, ticks: { color: theme.palette.text.secondary, font: { size: 11, weight: "600" } } },
      y: {
        beginAtZero: true,
        grace: "18%",
        border: { display: false },
        grid: { color: (context) => Number(context.tick.value) === 0 ? "rgba(126, 224, 221, 0.28)" : "rgba(255,255,255,0.07)", lineWidth: (context) => Number(context.tick.value) === 0 ? 1.5 : 1 },
        ticks: { color: theme.palette.text.secondary, font: { size: 10 }, maxTicksLimit: 5, callback: (value) => formatScore(Number(value)) },
      },
    },
  }), [theme]);
  if (!items.length) return null;
  return <Box sx={dashboardChartSx}><Bar data={data} options={options} plugins={[valueLabelsPlugin]} /></Box>;
};

export default ResultsRankingBarChart;
