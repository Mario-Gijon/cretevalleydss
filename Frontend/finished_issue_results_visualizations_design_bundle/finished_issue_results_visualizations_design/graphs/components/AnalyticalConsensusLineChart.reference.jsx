import { useEffect, useRef } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import { Chart } from "chart.js/auto";

const finiteThreshold = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const AnalyticalConsensusLineChart = ({
  data,
  consensusLevelChartRef,
  compact = false,
}) => {
  const theme = useTheme();
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!data?.labels || !data?.data || !canvasRef.current) return undefined;

    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const threshold = finiteThreshold(data.threshold);
    const datasets = [
      {
        id: "consensus",
        label: "Consensus level",
        data: data.data,
        borderColor: alpha(theme.palette.secondary.main, 0.95),
        backgroundColor: alpha(theme.palette.secondary.main, 0.18),
        tension: 0.2,
        fill: true,
        pointRadius: compact ? 3 : 6,
        pointHoverRadius: compact ? 5 : 9,
      },
      ...(threshold === null
        ? []
        : [
            {
              id: "threshold",
              label: "Threshold",
              data: data.labels.map(() => threshold),
              borderColor: alpha(theme.palette.success.main, 0.72),
              backgroundColor: "transparent",
              borderDash: [7, 6],
              borderWidth: 1.5,
              tension: 0,
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 3,
            },
          ]),
    ];

    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: data.labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: threshold !== null && !compact,
            labels: { color: alpha("#fff", 0.82) },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = Number(context.raw);
                if (!Number.isFinite(value)) return "Unavailable";
                const percentage = `${(value * 100).toFixed(1)}%`;
                return context.dataset?.id === "threshold"
                  ? `Threshold: ${percentage}`
                  : `Consensus level: ${percentage}`;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: !compact,
              text: "Phase",
              color: alpha("#fff", 0.85),
            },
            ticks: { color: alpha("#fff", 0.85) },
            grid: { color: alpha("#fff", 0.14) },
          },
          y: {
            min: 0,
            max: 1,
            title: {
              display: !compact,
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
      },
    });

    chartInstanceRef.current = chart;

    if (consensusLevelChartRef) {
      consensusLevelChartRef.current = {
        resetZoom: () => chart.resetZoom?.(),
      };
    }

    return () => chart.destroy();
  }, [
    compact,
    consensusLevelChartRef,
    data,
    theme.palette.secondary.main,
    theme.palette.success.main,
  ]);

  return <canvas ref={canvasRef} />;
};
