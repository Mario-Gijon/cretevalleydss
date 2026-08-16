import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { Doughnut } from "react-chartjs-2";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";

ChartJS.register(ArcElement, Tooltip);

const EvaluationParticipationDonut = ({
  summary,
  hasCriteriaWeighting,
}) => {
  const data = useMemo(() => {
    if (!summary.total) {
      return {
        labels: ["No submissions"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["rgba(95, 119, 141, 0.20)"],
            borderWidth: 0,
            cutout: "76%",
          },
        ],
      };
    }

    const values = hasCriteriaWeighting
      ? [
          summary.both,
          summary.criteriaOnly,
          summary.alternativeOnly,
        ]
      : [summary.alternativeOnly];

    return {
      labels: hasCriteriaWeighting
        ? [
            "Both stages",
            "Criteria weighting only",
            "Alternative evaluation only",
          ]
        : ["Alternative evaluation submitted"],
      datasets: [
        {
          data: values,
          backgroundColor: hasCriteriaWeighting
            ? [
                "rgba(66, 198, 148, 0.88)",
                "rgba(50, 182, 197, 0.80)",
                "rgba(55, 133, 211, 0.82)",
              ]
            : ["rgba(66, 198, 148, 0.88)"],
          borderWidth: 0,
          spacing: 2,
          cutout: "76%",
        },
      ],
    };
  }, [hasCriteriaWeighting, summary]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
      },
    }),
    []
  );

  return (
    <Box sx={{ position: "relative", width: { xs: 120, sm: 128, md: 132 }, height: { xs: 120, sm: 128, md: 132 }, maxWidth: "100%" }}>
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
            {summary.total}
          </Typography>
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 10.5,
              fontWeight: 700,
            }}
          >
            Experts
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default EvaluationParticipationDonut;
