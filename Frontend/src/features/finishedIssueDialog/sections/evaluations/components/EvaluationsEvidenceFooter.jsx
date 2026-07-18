import { Box, Stack, Typography } from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

import { evaluationsEvidenceFooterSx } from "../evaluations.styles";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
};

const Item = ({ icon, label, value }) => (
  <Stack direction="row" spacing={0.55} alignItems="center" sx={{ width: { xs: "100%", sm: "auto" }, minWidth: 0 }}>
    <Box sx={{ color: "secondary.light", display: "grid" }}>{icon}</Box>
    <Typography
      variant="caption"
      sx={{ color: "text.secondary", fontWeight: "fontWeightBold" }}
    >
      {label}:
    </Typography>
    <Typography
      variant="caption"
      noWrap
      title={String(value)}
      sx={{ minWidth: 0, fontWeight: "fontWeightBold" }}
    >
      {value}
    </Typography>
  </Stack>
);

const EvaluationsEvidenceFooter = ({ evidence }) => (
  <Box sx={evaluationsEvidenceFooterSx}>
    <Item
      icon={<AccessTimeRoundedIcon fontSize="small" />}
      label="Stored result"
      value={formatDate(evidence.storedAt)}
    />
    <Item
      icon={<PersonRoundedIcon fontSize="small" />}
      label="Created by"
      value={evidence.createdBy || "—"}
    />
    <Item
      icon={<LayersRoundedIcon fontSize="small" />}
      label="Execution"
      value={`${evidence.executionLabel}${
        evidence.phase === null ? "" : ` · Phase ${evidence.phase}`
      }`}
    />
    <Box sx={{ width: { xs: "100%", sm: "auto" }, minWidth: 0, ml: { lg: "auto" } }}>
      <Typography
        noWrap
        title={evidence.resultId || "—"}
        sx={{
          fontFamily:
            '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
          fontSize: 10.8,
          color: "text.secondary",
        }}
      >
        Result ID: {evidence.resultId || "—"}
      </Typography>
    </Box>
  </Box>
);

export default EvaluationsEvidenceFooter;
