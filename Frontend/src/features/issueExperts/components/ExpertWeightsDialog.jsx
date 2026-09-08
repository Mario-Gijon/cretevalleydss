import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import BalanceIcon from "@mui/icons-material/Balance";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { AppDialog } from "../../../components/StyledComponents/AppDialog";
import {
  buildEditedExpertWeights,
  buildEqualExpertWeights,
  validateExpertWeights,
} from "../../../utils/expertWeights.utils.js";

const ExpertWeightsDialog = ({
  open,
  experts = [],
  currentExpertWeightsByEmail = {},
  onClose,
  onConfirm,
}) => {
  const expertEmails = useMemo(() => experts.map((expert) => expert.email), [experts]);
  const newExpertEmails = useMemo(
    () => experts.filter((expert) => expert.isNew).map((expert) => expert.email),
    [experts]
  );
  const [expertWeights, setExpertWeights] = useState({});

  useEffect(() => {
    if (!open) return;

    setExpertWeights(
      buildEditedExpertWeights({
        finalExpertEmails: expertEmails,
        currentExpertWeightsByEmail,
        newExpertEmails,
      })
    );
  }, [currentExpertWeightsByEmail, expertEmails, newExpertEmails, open]);

  const validation = validateExpertWeights({ expertEmails, expertWeights });

  return (
    <AppDialog open={open} onClose={onClose} title="Assign expert weights" icon={<BalanceIcon />} maxWidth="sm">
      <DialogContent>
        <Stack spacing={1.25} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Redistribute the weights for the final set of experts. Their sum must be 1.
          </Typography>

          {experts.map((expert) => (
            <Box
              key={expert.email}
              sx={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 1 }}
            >
              <Stack spacing={0.15} justifyContent="center">
                <Typography sx={{ fontWeight: 800 }}>
                  {expert.name || expert.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {expert.email}
                </Typography>
              </Stack>
              <TextField
                label="Weight"
                size="small"
                type="number"
                inputProps={{ min: 0, max: 1, step: "any" }}
                value={expertWeights[expert.email] ?? ""}
                onChange={(event) =>
                  setExpertWeights((previous) => ({
                    ...previous,
                    [expert.email]: event.target.value,
                  }))
                }
              />
            </Box>
          ))}

          <Typography color={validation.valid ? "success.main" : "error.main"}>
            Sum: {validation.total === null ? "—" : Number(validation.total).toFixed(4)} / 1
          </Typography>
          <Typography variant="body2" color={validation.valid ? "success.main" : "error.main"}>
            {validation.message}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button startIcon={<BalanceIcon />} onClick={() => setExpertWeights(buildEqualExpertWeights(expertEmails))}>
          Equal weights
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          startIcon={<CheckCircleOutlineIcon />}
          onClick={() => onConfirm(expertWeights)}
          disabled={!validation.valid}
        >
          Confirm
        </Button>
      </DialogActions>
    </AppDialog>
  );
};

export default ExpertWeightsDialog;
