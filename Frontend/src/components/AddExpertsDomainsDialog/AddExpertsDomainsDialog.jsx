import { useEffect, useState } from "react";
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  Avatar,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import { useIssuesDataContext } from "../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import { buildInitialAssignments, getLeafCriteria, validateDomainAssigments } from "../../utils/createIssueUtils";
import { DomainAssignments } from "../DomainAssigments/DomainAssigments";
import { GlassDialog } from "../StyledComponents/GlassDialog";

const auroraBg = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1100px 480px at 12% 0%, ${alpha(theme.palette.info.main, intensity)}, transparent 62%),
                    radial-gradient(900px 460px at 88% 16%, ${alpha(theme.palette.secondary.main, intensity)}, transparent 58%)`,
});

const AddExpertsDomainsDialog = ({ open, onClose, issue, expertsToAdd, onConfirmDomains }) => {
  const theme = useTheme();
  const { globalDomains, expressionDomains } = useIssuesDataContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [domainAssignments, setDomainAssignments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && expertsToAdd.length > 0 && issue?.alternatives && issue?.criteria) {
      const leafCriteria = getLeafCriteria(issue.criteria);
      const init = buildInitialAssignments(
        expertsToAdd,
        issue.alternatives.map((a) => a.name),
        leafCriteria,
        {},
        issue.model,
        globalDomains,
        expressionDomains
      );
      setDomainAssignments(init);
      setLoading(false);
    }
  }, [open, expertsToAdd, issue, globalDomains, expressionDomains]);

  const handleConfirm = () => {
    if (!validateDomainAssigments(domainAssignments)) {
      showSnackbarAlert("You must assign expression domains to all new experts.", "error");
      return;
    }
    onConfirmDomains(domainAssignments);
    onClose();
  };

  if (!open) return null;

  const count = Array.isArray(expertsToAdd) ? expertsToAdd.length : 0;

  return (
    <GlassDialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle
        sx={{
          pb: 1.25,
          position: "relative",
          overflow: "hidden",
          ...auroraBg(theme, 0.18),
          "&:after": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 55%)`,
            opacity: 0.22,
          },
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between" sx={{ position: "relative", zIndex: 1 }}>
          <Stack direction="row" spacing={1.15} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: alpha(theme.palette.info.main, 0.12),
                color: "info.main",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <TuneIcon />
            </Avatar>

            <Stack spacing={0.1} sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
                Assign expression domains
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                {count ? `${count} new expert(s)` : "New experts"}
              </Typography>
            </Stack>
          </Stack>

          <IconButton
            onClick={onClose}
            sx={{
              bgcolor: alpha(theme.palette.text.primary, 0.06),
              border: "1px solid rgba(255,255,255,0.10)",
              "&:hover": { bgcolor: alpha(theme.palette.text.primary, 0.10) },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          borderColor: alpha(theme.palette.common.white, 0.10),
          bgcolor: "transparent",
          py: 2,
          // ✅ fuerza a inputs internos (si los hay) a verse "info"
          "& .MuiTextField-root .MuiOutlinedInput-root": { borderRadius: 3 },
          "& .MuiInputLabel-root.Mui-focused": { color: theme.palette.info.main },
          "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(theme.palette.info.main, 0.70),
          },
        }}
      >
        {loading ? (
          <Box sx={{ py: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25 }}>
            <CircularProgress size={18} color="info" />
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              Loading domain assignments...
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              Assign a domain for each alternative and leaf criterion.
            </Typography>

            {/* DomainAssignments mantiene su funcionalidad; solo "skin" con el wrapper */}
            <Box sx={{ mt: 0.5 }}>
              <DomainAssignments
                allData={{
                  addedExperts: expertsToAdd,
                  alternatives: issue.alternatives.map((a) => a.name ?? a),
                  criteria: issue.criteria,
                  selectedModel: issue.model,
                }}
                expressionDomains={expressionDomains}
                domainAssignments={domainAssignments}
                setDomainAssignments={setDomainAssignments}
              />
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          color="warning"
          variant="outlined"
          startIcon={<CancelOutlinedIcon />}
        >
          Cancel
        </Button>

        <Button
          onClick={handleConfirm}
          color="info"
          variant="outlined"
          startIcon={<CheckCircleOutlineIcon />}
        >
          Confirm domains
        </Button>
      </DialogActions>
    </GlassDialog>
  );
};

export default AddExpertsDomainsDialog;
