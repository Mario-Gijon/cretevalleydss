// ViewDomainExpressionsDialog.jsx
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Divider,
  Chip,
  Grid2,
} from "@mui/material";
import { GlassDialog } from "../StyledComponents/GlassDialog";
import { GlassPaper } from "../StyledComponents/GlassPaper";
import { FuzzyPreviewChart } from "../FuzzyPreviewChart/FuzzyPreviewChart";
import { useEffect } from "react";
import { useIssuesDataContext } from "../../context/issues/issues.context";

export const ViewExpressionsDomainDialog = ({open,onClose,handleOpenEdit,handleDelete,}) => {

  const {expressionDomains} = useIssuesDataContext()

  // 🔹 cerrar el dialogo si no quedan dominios
  useEffect(() => {
    if (open && expressionDomains.length === 0) {
      onClose();
    }
  }, [expressionDomains, open, onClose]);

  // 🔹 lógica para gridProps dinámico
  const getGridProps = () => {
    const count = expressionDomains.length;

    if (count === 1) return { xs: 12 };
    if (count === 2) return { xs: 12, md: 6 };
    return { xs: 12, md: 6, xl: 4 };
  };

  if (expressionDomains.length !== 0) return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth={expressionDomains.length === 1 ? "sm" : "xl"}
      fullWidth
    >
      <DialogTitle>Manage domain expressions</DialogTitle>
      <DialogContent>
        <Grid2 container spacing={2}>
          {expressionDomains.map((domain) => (
            <Grid2 key={domain._id} size={getGridProps()} alignItems="center">
              <GlassPaper sx={{ p: 2 }}>
                <Stack spacing={2} alignItems="center" width="100%">
                  {/* Header */}
                  <Stack alignItems="center" width="100%">
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      width="100%"
                    >
                      <Typography variant="h6">{domain.name}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          color="warning"
                          onClick={() => handleOpenEdit(domain)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleDelete(domain._id)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Stack>

                    <Typography width="100%" variant="body2">
                      {domain.type === "numeric"
                        ? "Numeric (0-1)"
                        : `Linguistic (${domain.linguisticLabels.length} labels)`}
                    </Typography>
                  </Stack>

                  <Divider orientation="horizontal" flexItem />

                  {/* Linguistic details */}
                  {domain.type === "linguistic" && (
                    <Stack spacing={3} alignItems="center" width="100%">
                      <Stack
                        direction="row"
                        flexWrap="wrap"
                        alignItems="center"
                        gap={1}
                        width="100%"
                      >
                        {domain.linguisticLabels.map((lbl, i) => (
                          <Chip
                            variant="outlined"
                            key={i}
                            label={lbl.label}
                            size="small"
                          />
                        ))}
                      </Stack>
                      <Stack
                        width="100%"
                        maxHeight={250}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <FuzzyPreviewChart labels={domain.linguisticLabels} />
                      </Stack>
                    </Stack>
                  )}
                </Stack>
              </GlassPaper>
            </Grid2>
          ))}
        </Grid2>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Close
        </Button>
      </DialogActions>
    </GlassDialog>
  );
};

