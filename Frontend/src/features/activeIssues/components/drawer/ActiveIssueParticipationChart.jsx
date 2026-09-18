import { Box, Typography } from "@mui/material";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";

import {
  ACTIVE_ISSUE_PARTICIPATION_STATUS_META,
  resolveActiveIssuesToneColor,
} from "../../logic/activeIssuesMeta";

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
const ActiveIssueParticipationChart = ({
  total,
  participated = 0,
  pending = 0,
  notEvaluated = 0,
  declined = 0,
  size = 100,
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

  const participationStatuses = [
    ACTIVE_ISSUE_PARTICIPATION_STATUS_META.participated,
    ACTIVE_ISSUE_PARTICIPATION_STATUS_META.notEvaluated,
    ACTIVE_ISSUE_PARTICIPATION_STATUS_META.pending,
    ACTIVE_ISSUE_PARTICIPATION_STATUS_META.declined,
  ];

  const data = {
    labels: participationStatuses.map((status) => status.label),
    datasets: [
      {
        data: [participated, notEvaluated, pending, declined],
        backgroundColor: participationStatuses.map(
          (status) => resolveActiveIssuesToneColor(status.tone).dot
        ),
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

export default ActiveIssueParticipationChart;
