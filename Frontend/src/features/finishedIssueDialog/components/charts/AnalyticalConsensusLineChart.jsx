import { useEffect, useRef } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import { Chart } from "chart.js/auto";

/**
 * Line chart del nivel de consenso por ronda.
 *
 * @param {Object} props Props del componente.
 * @returns {JSX.Element}
 */
export const AnalyticalConsensusLineChart = ({
  data,
  consensusLevelChartRef,
}) => {
  const theme = useTheme();
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!data?.labels || !data?.data || !canvasRef.current) return;

    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const chartData = {
      labels: data.labels,
      datasets: [
        {
          label: "Consensus level",
          data: data.data,
          borderColor: alpha(theme.palette.secondary.main, 0.95),
          backgroundColor: alpha(theme.palette.secondary.main, 0.18),
          tension: 0.2,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 9,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Level: ${(ctx.raw * 100).toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Round",
            color: alpha("#fff", 0.85),
          },
          ticks: { color: alpha("#fff", 0.85) },
          grid: { color: alpha("#fff", 0.14) },
        },
        y: {
          min: 0,
          max: 1,
          title: {
            display: true,
            text: "Consensus level (%)",
            color: alpha("#fff", 0.85),
          },
          ticks: {
            color: alpha("#fff", 0.85),
            stepSize: 0.2,
            callback: (value) => `${(value * 100).toFixed(0)}`,
          },
          grid: { color: alpha("#fff", 0.14) },
        },
      },
    };

    const newChart = new Chart(canvasRef.current, {
      type: "line",
      data: chartData,
      options: chartOptions,
    });

    chartInstanceRef.current = newChart;

    if (consensusLevelChartRef) {
      consensusLevelChartRef.current = {
        resetZoom: () => newChart.resetZoom?.(),
      };
    }

    return () => newChart.destroy();
  }, [data, theme.palette.secondary.main, consensusLevelChartRef]);

  return <canvas ref={canvasRef} />;
};
