import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const buildChartData = (labels) => {
  const xValues = Array.from({ length: 101 }, (_, i) => i / 100);

  const datasets = labels.map((lbl, i) => {
    const [l, m, u] = lbl.values;
    const yValues = xValues.map((x) => {
      if (x <= l || x >= u) return 0;
      if (x === m) return 1;
      if (x < m) return (x - l) / (m - l);
      return (u - x) / (u - m);
    });

    return {
      label: lbl.label,
      data: yValues,
      borderColor: `hsl(${(i * 360) / labels.length}, 70%, 50%)`,
      backgroundColor: "transparent",
      borderWidth: 2,
      tension: 0, // líneas rectas
      pointRadius: 0, // sin puntos
    };
  });

  return {
    labels: xValues,
    datasets,
  };
};

export const FuzzyPreviewChart = ({ labels }) => {
  return (
    <Line
      data={buildChartData(labels)}
      options={{
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
        },
        scales: {
          x: {
            title: { display: true, text: "Domain [0,1]" },
            min: 0,
            max: 1,
          },
          y: {
            title: { display: true, text: "Degree of belonging" },
            min: 0,
            max: 1,
          },
        },
        elements: {
          line: {
            fill: false,
          },
        },
      }}
    />
  );
};
