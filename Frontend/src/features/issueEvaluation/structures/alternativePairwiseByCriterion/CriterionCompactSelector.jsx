import {
  Box,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

import { softIconBtnSx } from "../../shared/alternativeEvaluationDialog.styles";

const CriterionCompactSelector = ({
  criteria = [],
  currentIndex = 0,
  onSelectCriterion,
  onPreviousCriterion,
  onNextCriterion,
}) => {
  const theme = useTheme();
  const hasMultipleCriteria = Array.isArray(criteria) && criteria.length > 1;
  const safeCurrentIndex = Math.max(0, Math.min(currentIndex, Math.max(0, criteria.length - 1)));
  const currentCriterion = criteria[safeCurrentIndex] || null;
  const currentTypeLabel =
    currentCriterion?.type ? String(currentCriterion.type) : "";

  return (
    <Stack spacing={0.9} sx={{ mb: 1 }}>
      {hasMultipleCriteria ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Box sx={{ minWidth: 0, flex: 1, overflowX: "auto", overflowY: "hidden", pr: 0.25 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={safeCurrentIndex}
              onChange={(_, value) => {
                if (typeof value === "number" && value >= 0) {
                  onSelectCriterion?.(value);
                }
              }}
              sx={{
                display: "inline-flex",
                gap: 0.75,
                "& .MuiToggleButton-root": {
                  borderRadius: 999,
                  px: 1.25,
                  py: 0.35,
                  minHeight: 28,
                  border: `1px solid ${alpha(theme.palette.common.white, 0.14)}`,
                  color: "text.secondary",
                  textTransform: "none",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  bgcolor: alpha(theme.palette.background.paper, 0.2),
                },
                "& .MuiToggleButton-root.Mui-selected": {
                  color: "info.light",
                  borderColor: alpha(theme.palette.info.main, 0.45),
                  bgcolor: alpha(theme.palette.info.main, 0.16),
                },
              }}
            >
              {criteria.map((criterion, index) => (
                <ToggleButton key={criterion?.name || index} value={index}>
                  {criterion?.name || `Criterion ${index + 1}`}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <IconButton
            size="small"
            sx={softIconBtnSx(theme)}
            disabled={safeCurrentIndex <= 0}
            onClick={onPreviousCriterion}
          >
            <ArrowBackIosIcon fontSize="inherit" />
          </IconButton>

          <Typography
            variant="caption"
            sx={{ fontWeight: 900, minWidth: 42, textAlign: "center", color: "text.secondary" }}
          >
            {criteria.length ? `${safeCurrentIndex + 1}/${criteria.length}` : "0/0"}
          </Typography>

          <IconButton
            size="small"
            sx={softIconBtnSx(theme)}
            disabled={safeCurrentIndex >= criteria.length - 1}
            onClick={onNextCriterion}
          >
            <ArrowForwardIosIcon fontSize="inherit" />
          </IconButton>
        </Stack>
      ) : null}

      <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
        {currentTypeLabel ? (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.75rem",
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: 0.2,
              textTransform: "lowercase",
            }}
          >
            {currentTypeLabel}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
};

export default CriterionCompactSelector;
