import { Box, Stack, Typography } from "@mui/material";

export const CriteriaWeightingMethodCard = ({
  title,
  description,
  selected,
  disabled = false,
  onClick,
}) => {
  const handleClick = () => {
    if (disabled) return;
    onClick?.();
  };

  return (
    <Box
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleClick();
        }
      }}
      sx={{
        p: 1.15,
        borderRadius: 1.8,
        border: "1px solid",
        borderColor: selected ? "rgba(75, 210, 207, 0.85)" : "rgba(255,255,255,0.14)",
        background: selected
          ? "linear-gradient(135deg, rgba(75, 210, 207, 0.13), rgba(75, 210, 207, 0.035))"
          : "rgba(255,255,255,0.018)",
        boxShadow: selected ? "0 0 0 1px rgba(75, 210, 207, 0.06)" : "none",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "border-color 140ms ease, background 140ms ease, transform 140ms ease",
        minHeight: 66,
        "&:hover": disabled
          ? {}
          : {
              borderColor: selected ? "rgba(75, 210, 207, 0.95)" : "rgba(75, 210, 207, 0.38)",
              background: selected
                ? "linear-gradient(135deg, rgba(75, 210, 207, 0.16), rgba(75, 210, 207, 0.05))"
                : "rgba(75, 210, 207, 0.045)",
            },
      }}
    >
      <Stack spacing={0.35}>
        <Typography variant="body2" sx={{ fontWeight: 950, lineHeight: 1.15 }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 750 }}>
          {description}
        </Typography>
      </Stack>
    </Box>
  );
};

export default CriteriaWeightingMethodCard;