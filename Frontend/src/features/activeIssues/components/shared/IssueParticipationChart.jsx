import { Box, Typography } from "@mui/material";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";

ChartJS.register(ArcElement, Tooltip);

/**
 * Gráfico de participación de expertos de un issue.
 *
 * Muestra la distribución entre expertos que ya participaron,
 * aceptaron pero aún no evaluaron, tienen la invitación pendiente
 * o rechazaron participar.
 *
 * @param {Object} props Props del componente.
 * @param {number} props.total Número total de expertos.
 * @param {number} props.participated Número de expertos que ya participaron.
 * @param {number} props.pending Número de expertos con invitación pendiente.
 * @param {number} props.notEvaluated Número de expertos que aceptaron pero no evaluaron.
 * @param {number} props.declined Número de expertos que rechazaron.
 * @returns {JSX.Element}
 */
const IssueParticipationChart = ({
  total,
  participated = 0,
  pending = 0,
  notEvaluated = 0,
  declined = 0,
  size=100,
}) => {
  const valuesSum =
    Number(participated) +
    Number(pending) +
    Number(notEvaluated) +
    Number(declined);

  const totalSafe = Number(total ?? valuesSum) || 0;

  const participationPercent =
    totalSafe > 0
      ? Math.round((Number(participated) / totalSafe) * 100)
      : 0;

  const data = {
    labels: [
      "Participated",
      "Accepted (not evaluated)",
      "Pending",
      "Declined",
    ],
    datasets: [
      {
        data: [participated, notEvaluated, pending, declined],
        backgroundColor: [
          "rgba(76, 175, 80, 0.80)",
          "rgba(255, 193, 7, 0.80)",
          "rgba(2, 136, 209, 0.80)",
          "rgba(244, 67, 54, 0.80)",
        ],
        borderWidth: 0,
        cutout: "80%",
        spacing: 1,
      },
    ],
  };

  const options = {
    plugins: {
      tooltip: { enabled: false },
      legend: { display: false },
    },
    maintainAspectRatio: false,
  };

  return (
    <Box sx={{ position: "relative", width: size }}>
      <Doughnut data={data} options={options} />

      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {participationPercent}%
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
        >
          participated
        </Typography>
      </Box>
    </Box>
  );
};

export default IssueParticipationChart;