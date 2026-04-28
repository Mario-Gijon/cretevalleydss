import { Box, Typography } from "@mui/material";

export default function FieldGrid({ rows }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 0.8,
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
      }}
    >
      {rows.map(({ label, value }) => (
        <Box key={label} sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
            {label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 850, overflowWrap: "anywhere" }}>
            {value ?? "Unknown"}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
