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
            "Participated",
            "Did not participate",
          ]
        : ["No participants"],
      datasets: [
        {
          data: hasParticipants
            ? [
                participation.chart.participated,
                participation.chart.notParticipated,
              ]
            : [1],
          backgroundColor: hasParticipants
            ? [
                "rgba(65, 196, 139, 0.88)",
                "rgba(124, 144, 165, 0.58)",
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
      animation: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: hasParticipants,
          callbacks: { label: (context) => {
            const value = context.raw || 0;
            const percentage = participation.total ? Math.round((value / participation.total) * 100) : 0;
            return `${context.label}: ${value} (${percentage}%)`;
          } },
        },
      },
    }),
    [hasParticipants, participation.total]
  );

  const percentage =
    participation.participatedPercentage === null
      ? "—"
      : `${participation.participatedPercentage}%`;

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
            {`${participation.participated} / ${participation.total} participated`}
          </Typography>
          {participation.removedCount > 0 ? <Typography sx={{ color: "text.secondary", fontSize: 9.5 }}>{`${participation.currentCount} current · ${participation.removedCount} removed`}</Typography> : null}
        </Box>
      </Box>
    </Box>
  );
};

export default ParticipationDonutChart;
