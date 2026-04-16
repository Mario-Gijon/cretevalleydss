import { Box, LinearProgress, Typography } from "@mui/material";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export const IssueTimeline = ({ creationDate, closureDate }) => {
  const creation = dayjs(creationDate, "DD-MM-YYYY");
  const today = dayjs();
  const closure = closureDate ? dayjs(closureDate, "DD-MM-YYYY") : null;

  let progress = 0;
  let totalDays = 0;
  let elapsedDays = 0;

  if (closure) {
    totalDays = closure.diff(creation, "days");
    elapsedDays = today.diff(creation, "days");
    progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  }

  return (
    <Box sx={{ width: "100%", mt: 1 }}>
      {/* Fechas */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {creation.format("DD MMM")}
        </Typography>
        {closure && (
          <Typography variant="caption" color="text.secondary">
            {closure.format("DD MMM")}
          </Typography>
        )}
      </Box>

      {/* Barra */}
      {closure ? (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 5,
            backgroundColor: "rgba(200,200,200,0.2)",
            "& .MuiLinearProgress-bar": {
              backgroundColor:
                progress >= 100 ? "#f44336" : "#2196f3",
            },
          }}
        />
      ) : (
        <Typography variant="caption" color="text.secondary">
          No deadline
        </Typography>
      )}

      {/* Texto */}
      {closure && (
        <Box sx={{ textAlign: "center", mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {progress >= 100
              ? "Closed"
              : `${Math.max(0, closure.diff(today, "days"))} days left`}
          </Typography>
        </Box>
      )}
    </Box>
  );
};