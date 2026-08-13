import {
  Box,
  Divider,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  Tooltip,
  Typography,
} from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { alpha } from "@mui/material/styles";

const getSelectedExpertsPanelSx = (theme) => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  borderRadius: 3,
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  bgcolor: alpha(theme.palette.common.white, 0.03),
  background: `linear-gradient(180deg, ${alpha(theme.palette.info.main, 0.11)} 0%, ${alpha(
    theme.palette.common.white,
    0.02
  )} 42%, ${alpha(theme.palette.common.black, 0.08)} 100%)`,
  boxShadow: `0 18px 40px ${alpha(theme.palette.common.black, 0.16)}`,
  overflow: "hidden",
});

const getSelectedExpertsListSx = (theme) => ({
  flex: 1,
  minHeight: 0,
  maxHeight: { xs: "50vh", md: "52vh" },
  overflowY: "auto",
  pr: 0.3,
  scrollbarWidth: "thin",
  scrollbarColor: `${alpha(theme.palette.common.white, 0.2)} transparent`,
  "&::-webkit-scrollbar": { width: 8 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: alpha(theme.palette.common.white, 0.16),
    borderRadius: 999,
    border: "2px solid transparent",
    backgroundClip: "content-box",
  },
});

export const SelectedExpertsPanelContent = ({
  addedExperts,
  expertWeightValidation,
  expertWeightsMode,
  handleDeleteExpert,
  handleResetEqualWeights,
  handleWeightChange,
  handleWeightBlur,
  handleWeightFocus,
  expertWeightInputs,
  selectedCount,
  selectedExpertWeightsSum,
  usesExpertWeights,
  theme,
  onClose,
  onCollapse,
  collapseTooltip,
}) => (
  <Box sx={{ ...getSelectedExpertsPanelSx(theme), height: "100%" }}>
    <Stack spacing={1.2} sx={{ p: 1.35, minHeight: 0, height: "100%" }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Stack spacing={0.2} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
            Selected experts
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>
            {selectedCount} selected
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          {onCollapse ? (
            <Tooltip title={collapseTooltip} arrow placement="left">
              <IconButton onClick={onCollapse} size="small" sx={{ color: "text.secondary" }}>
                <ChevronRightRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}

          {onClose ? (
            <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
      </Stack>

      {usesExpertWeights && selectedCount > 0 ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          {selectedExpertWeightsSum !== null ? (
            <Box
              sx={{
                px: 1.05,
                py: 0.55,
                borderRadius: 999,
                border: `1px solid ${alpha(theme.palette[expertWeightValidation.tone].main, 0.28)}`,
                bgcolor: alpha(theme.palette[expertWeightValidation.tone].main, 0.12),
                color: `${expertWeightValidation.tone}.main`,
                typography: "caption",
                fontWeight: "fontWeightBold",
                alignSelf: { xs: "flex-start", sm: "auto" },
              }}
            >
              Sum: {selectedExpertWeightsSum.toFixed(3)} / 1
            </Box>
          ) : null}

          <ToggleButton
            value="equalWeights"
            selected={expertWeightsMode === "equal"}
            onClick={handleResetEqualWeights}
            size="small"
            color="secondary"
            sx={{
              px: 1.4,
              py: 0.55,
              borderColor:
                expertWeightsMode === "equal"
                  ? "rgba(75, 210, 207, 0.72)"
                  : "rgba(255,255,255,0.16)",
              color: expertWeightsMode === "equal" ? "info.main" : "text.secondary",
              fontWeight: "fontWeightBold",
              typography: "caption",
              letterSpacing: 0.25,
              textTransform: "uppercase",
              "&.Mui-selected": {
                color: "info.main",
                backgroundColor: "rgba(75, 210, 207, 0.10)",
              },
              "&.Mui-selected:hover": {
                backgroundColor: "rgba(75, 210, 207, 0.14)",
              },
            }}
          >
            Equal weights
          </ToggleButton>
        </Stack>
      ) : null}

      <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.07) }} />

      {selectedCount > 0 ? (
        <Box sx={getSelectedExpertsListSx(theme)}>
          <Stack spacing={0.75}>
            {addedExperts.map((email) => (
              <Stack
                key={email}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  borderRadius: 2.2,
                  border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
                  bgcolor: alpha(theme.palette.common.white, 0.02),
                  px: 1,
                  py: 0.8,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    fontWeight: 800,
                    color: alpha(theme.palette.common.white, 0.9),
                    wordBreak: "break-word",
                  }}
                >
                  {email}
                </Typography>

                {usesExpertWeights ? (
                  <TextField
                    size="small"
                    type="number"
                    color="secondary"
                    value={expertWeightInputs[email] ?? ""}
                    onFocus={() => handleWeightFocus(email)}
                    onChange={(event) => handleWeightChange(email, event.target.value)}
                    onBlur={(event) => handleWeightBlur(email, event.target.value)}
                    inputProps={{
                      min: 0,
                      max: 1,
                      step: 0.1,
                    }}
                    sx={{
                      width: 82,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2.2,
                        bgcolor: alpha(theme.palette.common.white, 0.04),
                      },
                      "& input": {
                        textAlign: "right",
                      },
                    }}
                  />
                ) : null}

                <Tooltip title="Remove expert" arrow placement="top">
                  <IconButton onClick={() => handleDeleteExpert(email)} size="small">
                    <RemoveCircleOutlineIcon color="warning" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        </Box>
      ) : (
        <Box
          sx={{
            borderRadius: 2.8,
            border: `1px dashed ${alpha(theme.palette.common.white, 0.13)}`,
            bgcolor: alpha(theme.palette.common.white, 0.015),
            px: 1.2,
            py: 1.6,
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700 }}>
            No experts selected yet.
          </Typography>
        </Box>
      )}

      {usesExpertWeights && selectedCount > 0 && expertWeightValidation.valid !== true ? (
        <Typography variant="caption" sx={{ color: "error.main", fontWeight: 800 }}>
          {expertWeightValidation.message}
        </Typography>
      ) : null}
    </Stack>
  </Box>
);
