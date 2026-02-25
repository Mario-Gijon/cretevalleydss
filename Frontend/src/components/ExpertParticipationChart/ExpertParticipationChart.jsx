import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { Box, Typography } from "@mui/material";

ChartJS.register(ArcElement, Tooltip);

/**
 * Estados (4):
 * - participated: ya participó (verde / success)
 * - notEvaluated: aceptó pero aún no evaluó (amarillo / warning)
 * - pending: invitación pendiente (azul / info)
 * - declined: rechazó (rojo / error)
 */
export const ExpertParticipationChart = ({
  total,
  participated = 0,
  pending = 0,
  notEvaluated = 0,
  declined = 0,
}) => {
  const sum = Number(participated) + Number(pending) + Number(notEvaluated) + Number(declined);
  const totalSafe = Number(total ?? sum) || 0;

  const percent = totalSafe > 0 ? Math.round((Number(participated) / totalSafe) * 100) : 0;

  const data = {
    labels: ["Participated", "Accepted (not evaluated)", "Pending", "Declined"],
    datasets: [
      {
        data: [participated, notEvaluated, pending, declined],
        backgroundColor: [
          "rgba(76, 175, 80, 0.80)",   // success (verde) -> participated
          "rgba(2, 136, 209, 0.80)",   // info (azul) -> pending  ✅ (antes lo tenías rojo)
          "rgba(255, 193, 7, 0.80)",   // warning (amarillo) -> notEvaluated
          "rgba(244, 67, 54, 0.80)",   // error (rojo) -> declined
        ],
        borderWidth: 0,
        cutout: "80%",
        spacing: 1,
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
          participated
        </Typography>
      </Box>
    </Box>
  );
};
