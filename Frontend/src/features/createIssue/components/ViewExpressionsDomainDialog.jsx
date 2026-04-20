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
  Box,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { GlassDialog } from "../../../components/StyledComponents/GlassDialog";
import { GlassPaper } from "../../../components/StyledComponents/GlassPaper";
import { FuzzyPreviewChart } from "../../../components/FuzzyPreviewChart/FuzzyPreviewChart";
import { useEffect } from "react";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import {
  getCreateIssueCompactDialogActionsSx,
  getCreateIssueCompactDialogContentSx,
  getCreateIssueCompactDialogTitleSx,
} from "../styles/createIssueStep.styles";

export const ViewExpressionsDomainDialog = ({
  open,
  onClose,
  handleOpenEdit,
  handleDelete,
}) => {
  const theme = useTheme();
  const { expressionDomains } = useIssuesDataContext();

  useEffect(() => {
    if (open && expressionDomains.length === 0) {
      onClose();
    }
  }, [expressionDomains, open, onClose]);

  const getGridProps = () => {
    const count = expressionDomains.length;

    if (count === 1) return { xs: 12 };
    if (count === 2) return { xs: 12, md: 6 };
    return { xs: 12, md: 6, xl: 4 };
  };

  if (expressionDomains.length === 0) {
    return null;
  }

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      maxWidth={expressionDomains.length === 1 ? "sm" : "xl"}
      fullWidth
    >
      <DialogTitle sx={getCreateIssueCompactDialogTitleSx(theme)}>
        Manage domain expressions
      </DialogTitle>

      <DialogContent sx={getCreateIssueCompactDialogContentSx(theme)}>
        <Grid2 container spacing={1.5} sx={{ mt: 1 }}>
          {expressionDomains.map((domain) => (
            <Grid2 key={domain._id} size={getGridProps()} alignItems="stretch">
              <GlassPaper
                sx={{
                  p: 1.6,
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                  bgcolor: alpha(theme.palette.common.white, 0.012),
                  height: "100%",
                }}
              >
                <Stack spacing={1.5} width="100%">
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                    width="100%"
                  >
                    <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                        {domain.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                        {domain.type === "numeric"
                          ? "Numeric (0-1)"
                          : `Linguistic (${domain.linguisticLabels.length} labels)`}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={0.8}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => handleOpenEdit(domain)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDelete(domain._id)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Stack>

                  <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />

                  {domain.type === "linguistic" ? (
                    <Stack spacing={1.4} width="100%">
                      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={0.8} width="100%">
                        {domain.linguisticLabels.map((lbl, i) => (
                          <Chip
                            variant="outlined"
                            color="info"
                            key={i}
                            label={lbl.label}
                            size="small"
                          />
                        ))}
                      </Stack>

                      <Box
                        sx={{
                          borderRadius: 2.5,
                          p: 1,
                          bgcolor: alpha(theme.palette.common.white, 0.015),
                        }}
                      >
                        <FuzzyPreviewChart labels={domain.linguisticLabels} />
                      </Box>
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Numeric domain preview is not available.
                    </Typography>
                  )}
                </Stack>
              </GlassPaper>
            </Grid2>
          ))}
        </Grid2>
      </DialogContent>

      <DialogActions sx={getCreateIssueCompactDialogActionsSx(theme)}>
        <Button onClick={onClose} color="warning" variant="outlined">
          Close
        </Button>
      </DialogActions>
    </GlassDialog>
  );
};
