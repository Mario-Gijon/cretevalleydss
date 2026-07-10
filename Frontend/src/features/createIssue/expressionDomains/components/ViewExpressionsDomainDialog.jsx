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
import { useEffect, useState } from "react";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { GlassDialog } from "../../../../components/StyledComponents/GlassDialog";
import { GlassPaper } from "../../../../components/StyledComponents/GlassPaper";
import { ConfirmationDialog } from "../../../../components/StyledComponents/ConfirmationDialog";
import { FuzzyPreviewChart } from "../../../../components/FuzzyPreviewChart/FuzzyPreviewChart";
import { useIssuesDataContext } from "../../../../context/issues/issues.context";
import {
  getCreateIssueCompactDialogActionsSx,
  getCreateIssueCompactDialogContentSx,
  getCreateIssueCompactDialogTitleSx,
} from "../../styles/createIssueStep.styles";
import {
  getExpressionDomainDisplayMeta,
  getExpressionDomainLabels,
  getExpressionDomainMembershipFunction,
  isLinguisticFuzzyExpressionDomain,
  isLinguisticOrdinalExpressionDomain,
} from "../../../../utils/expressionDomains";

export const ViewExpressionsDomainDialog = ({
  open,
  onClose,
  handleOpenEdit,
  handleDelete,
}) => {
  const theme = useTheme();
  const { globalDomains, expressionDomains } = useIssuesDataContext();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  const allManagedDomains = [
    ...(Array.isArray(globalDomains)
      ? globalDomains.map((domain) => ({ ...domain, __domainScope: "global" }))
      : []),
    ...(Array.isArray(expressionDomains)
      ? expressionDomains.map((domain) => ({ ...domain, __domainScope: "user" }))
      : []),
  ];

  useEffect(() => {
    if (open && allManagedDomains.length === 0) {
      onClose();
    }
  }, [allManagedDomains.length, open, onClose]);

  const getGridProps = () => {
    const count = allManagedDomains.length;

    if (count === 1) return { xs: 12 };
    if (count === 2) return { xs: 12, md: 6 };
    return { xs: 12, md: 6, xl: 4 };
  };

  if (allManagedDomains.length === 0) {
    return null;
  }

  const handleAskDelete = (domain) => {
    setSelectedDomain(domain);
    setOpenDeleteDialog(true);
  };

  const handleCancelDelete = () => {
    if (removeLoading) return;
    setOpenDeleteDialog(false);
    setSelectedDomain(null);
  };

  const handleConfirmDelete = async () => {
    const selectedDomainId = selectedDomain?._id || selectedDomain?.id;

    if (!selectedDomainId || removeLoading) return;

    setRemoveLoading(true);
    await handleDelete(selectedDomainId);
    setRemoveLoading(false);
    setOpenDeleteDialog(false);
    setSelectedDomain(null);
  };

  return (
    <>
      <GlassDialog
        open={open}
        onClose={onClose}
        maxWidth={allManagedDomains.length === 1 ? "sm" : "xl"}
        fullWidth
      >
        <DialogTitle sx={getCreateIssueCompactDialogTitleSx(theme)}>
          Manage domain expressions
        </DialogTitle>

        <DialogContent sx={getCreateIssueCompactDialogContentSx(theme)}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700, mt: 0.5 }}>
            Global domains are predefined and cannot be edited or deleted.
          </Typography>

          <Grid2 container spacing={1.5} sx={{ mt: 1 }}>
            {allManagedDomains.map((domain) => {
              const displayMeta = getExpressionDomainDisplayMeta(domain);
              const isGlobalDomain =
                domain.__domainScope === "global" || domain.isGlobal === true;
              const domainId = domain._id || domain.id || displayMeta.name;

              return (
                <Grid2 key={domainId} size={getGridProps()} alignItems="stretch">
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
                          <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap">
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                              {displayMeta.name}
                            </Typography>
                            <Chip
                              size="small"
                              label={isGlobalDomain ? "Global" : "Mine"}
                              color={isGlobalDomain ? "default" : "info"}
                              variant="outlined"
                            />
                          </Stack>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 850 }}>
                            {displayMeta.descriptor}
                          </Typography>
                        </Stack>

                        {!isGlobalDomain ? (
                          <Stack direction="row" spacing={0.8}>
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
                              onClick={() => handleAskDelete(domain)}
                            >
                              Delete
                            </Button>
                          </Stack>
                        ) : null}
                      </Stack>

                      <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.08) }} />

                      {isLinguisticFuzzyExpressionDomain(domain) ||
                      isLinguisticOrdinalExpressionDomain(domain) ? (
                        <Stack spacing={1.4} width="100%">
                          <Stack direction="row" flexWrap="wrap" alignItems="center" gap={0.8} width="100%">
                            {getExpressionDomainLabels(domain).map((lbl, i) => (
                              <Chip
                                variant="outlined"
                                color="info"
                                key={i}
                                label={lbl.label}
                                size="small"
                              />
                            ))}
                          </Stack>

                          {isLinguisticFuzzyExpressionDomain(domain) ? (
                            <Box
                              sx={{
                                borderRadius: 2.5,
                                p: 1,
                                bgcolor: alpha(theme.palette.common.white, 0.015),
                              }}
                            >
                              <FuzzyPreviewChart
                                labels={getExpressionDomainLabels(domain)}
                                membershipFunction={getExpressionDomainMembershipFunction(domain)}
                              />
                            </Box>
                          ) : null}
                        </Stack>
                      ) : (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          A preview is not available for this domain type.
                        </Typography>
                      )}
                    </Stack>
                  </GlassPaper>
                </Grid2>
              );
            })}
          </Grid2>
        </DialogContent>

        <DialogActions sx={getCreateIssueCompactDialogActionsSx(theme)}>
          <Button onClick={onClose} color="secondary" variant="outlined">
            Close
          </Button>
        </DialogActions>
      </GlassDialog>

      <ConfirmationDialog
        open={openDeleteDialog}
        onClose={handleCancelDelete}
        tone="error"
        title="Delete expression domain?"
        subtitle={
          selectedDomain?.name
            ? `Are you sure you want to delete "${selectedDomain.name}"?`
            : "Are you sure you want to delete this expression domain?"
        }
        actions={[
          {
            id: "cancel-delete-expression-domain",
            label: "Cancel",
            color: "secondary",
            icon: <CancelOutlinedIcon />,
            onClick: handleCancelDelete,
          },
          {
            id: "confirm-delete-expression-domain",
            label: "Delete",
            color: "error",
            icon: <DeleteOutlineIcon />,
            loading: removeLoading,
            autoFocus: true,
            onClick: handleConfirmDelete,
          },
        ]}
        maxWidth="xs"
        fullWidth
      />
    </>
  );
};
