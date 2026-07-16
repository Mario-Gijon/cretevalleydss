import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { Doughnut } from "react-chartjs-2";
import {
  ArcElement,
  Chart as ChartJS,
  Tooltip,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip);

const ParticipationDonutChart = ({ participation }) => {
  const hasParticipants = participation.chart.total > 0;

  const data = useMemo(
    () => ({
      labels: hasParticipants
        ? [
            "Completed",
            "Accepted, not evaluated",
            "Pending",
            "Declined",
          ]
        : ["No participants"],
      datasets: [
        {
          data: hasParticipants
            ? [
                participation.chart.completed,
                participation.chart.acceptedIncomplete,
                participation.chart.pending,
                participation.chart.declined,
              ]
            : [1],
          backgroundColor: hasParticipants
            ? [
                "rgba(65, 196, 139, 0.88)",
                "rgba(48, 161, 205, 0.78)",
                "rgba(99, 122, 148, 0.62)",
                "rgba(231, 75, 75, 0.78)",
              ]
            : ["rgba(100, 120, 140, 0.22)"],
          borderWidth: 0,
          cutout: "78%",
          spacing: hasParticipants ? 2 : 0,
        },
      ],
    }),
    [hasParticipants, participation]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: hasParticipants,
        },
      },
    }),
    [hasParticipants]
  );

  const percentage =
    participation.completionPercentage === null
      ? "—"
      : `${participation.completionPercentage}%`;

  return (
    <Box
      sx={{
        position: "relative",
        width: 164,
        height: 164,
      }}
    >
      <Doughnut data={data} options={options} />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          pointerEvents: "none",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography sx={{ fontSize: 23, fontWeight: 950 }}>
            {percentage}
          </Typography>
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 10.5,
              fontWeight: 700,
            }}
          >
            completed
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ParticipationDonutChart;
