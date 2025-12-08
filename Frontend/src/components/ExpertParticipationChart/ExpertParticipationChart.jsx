import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { Box, Typography } from "@mui/material";

ChartJS.register(ArcElement, Tooltip);

export const ExpertParticipationChart = ({ total, pending, accepted, notEvaluated }) => {
  const evaluated = accepted;
  const percent = total > 0 ? Math.round((evaluated / total) * 100) : 0;

  const data = {
    labels: ["Evaluated", "Not Evaluated", "Pending"],
    datasets: [
      {
        data: [evaluated, notEvaluated, pending],
        backgroundColor: [
          "rgba(76, 175, 80, 0.8)",   // success (verde)
          "rgba(255, 193, 7, 0.8)",   // warning (amarillo)
          "rgba(244, 67, 54, 0.8)",   // error (rojo)
        ],
        borderWidth: 0, // sin borde grueso
        cutout: "80%",  // donut fino
        spacing: 1, // espacio entre segmentos
      },
    ],
  };

  const options = {
    plugins: { tooltip: { enabled: false }, legend: { display: false } },
    maintainAspectRatio: false,
  };

  return (
    <Box sx={{ position: "relative", width: 120, height: 120 }}>
      <Doughnut data={data} options={options} />
      {/* Texto central */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <Typography variant="h6" fontWeight={"bold"}>
          {percent} %
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {pending + notEvaluated + evaluated} experts
        </Typography>
      </Box>
    </Box>
  );
};




