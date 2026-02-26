import { useState } from "react";
import { Stack, Typography, Button, Box, Avatar, Divider } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import AddIcon from "@mui/icons-material/Add";
import TuneIcon from "@mui/icons-material/Tune";

import { useSnackbarAlertContext } from "../../../../../context/snackbarAlert/snackbarAlert.context";
import { CreateLinguisticExpressionDialog } from "../../../../../components/CreateLinguisticExpressionDialog/CreateLinguisticExpressionDialog";
import { ViewExpressionsDomainDialog } from "../../../../../components/ViewExpressionsDomainDialog/ViewExpressionsDomainDialog";
import { DomainAssignments } from "../../../../../components/DomainAssigments/DomainAssigments";
import { CircularLoading } from "../../../../../components/LoadingProgress/CircularLoading";
import { useIssuesDataContext } from "../../../../../context/issues/issues.context";
import { removeExpressionDomain } from "../../../../../controllers/issueController";

const headerIconSx = (theme) => ({
  width: 44,
  height: 44,
  bgcolor: alpha(theme.palette.info.main, 0.12),
  color: "info.main",
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
});

const actionBtnSx = (theme) => ({
  borderRadius: 999,
  px: 1.4,
  py: 0.8,
  fontWeight: 950,
  textTransform: "none",
  borderColor: alpha(theme.palette.common.white, 0.14),
  bgcolor: alpha(theme.palette.common.white, 0.03),
  "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.05) },
});

export const ExpressionDomainStep = ({ allData, domainAssignments, setDomainAssignments }) => {
  const theme = useTheme();
  const { selectedModel, addedExperts, alternatives, criteria } = allData;

  const { expressionDomains, setExpressionDomains } = useIssuesDataContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [openCreateDomainExpressionDialog, setOpenCreateDomainExpressionDialog] = useState(false);
  const [openViewDomainExpressions, setOpenViewDomainExpressions] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);

  const handleOpenEditDomain = (domain = null) => {
    if (domain) setEditingDomain(domain);
    else setEditingDomain(null);
    setOpenCreateDomainExpressionDialog(true);
  };

  const handleDelete = async (id) => {
    const result = await removeExpressionDomain(id);

    if (result && result.success) {
      setExpressionDomains((prev) => prev.filter((d) => d._id !== id));
      showSnackbarAlert(result.msg, "success");
    } else {
      showSnackbarAlert(result?.msg || "Error deleting domain", "error");
    }
  };

  if (!domainAssignments || Object.keys(domainAssignments).length === 0) {
    return <CircularLoading color="secondary" size={150} height="30vh" />;
  }

  const missingPrevSteps =
    !selectedModel || addedExperts.length === 0 || alternatives.length === 0 || criteria.length === 0;

  return (
    <>
      <Stack spacing={1.6} sx={{ width: "100%", maxWidth: 1250, mx: "auto", minHeight: 0 }}>
        {/* Header sin caja */}
        <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar sx={headerIconSx(theme)}>
              <TuneIcon />
            </Avatar>

            <Stack spacing={0.15} sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
                Expression domains
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                Assign a domain to every expert • alternative • criterion cell
              </Typography>
            </Stack>
          </Stack>

          <Box
            sx={{
              px: 1.1,
              py: 0.55,
              borderRadius: 999,
              bgcolor: alpha(theme.palette.info.main, 0.10),
              color: "info.main",
              fontSize: 12,
              fontWeight: 950,
              border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
            }}
          >
            {expressionDomains?.length ?? 0} custom
          </Box>
        </Stack>

        {missingPrevSteps ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              You must finish previous steps before assigning expression domains.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Actions bar */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} alignItems={{ xs: "stretch", sm: "center" }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleOpenEditDomain()}
                color="secondary"
                sx={actionBtnSx(theme)}
              >
                Create linguistic expression
              </Button>

              <Button
                variant="outlined"
                onClick={() => setOpenViewDomainExpressions(true)}
                color="info"
                disabled={!expressionDomains || expressionDomains.length === 0}
                sx={actionBtnSx(theme)}
              >
                Manage domains
              </Button>

              <Box sx={{ flex: 1 }} />
            </Stack>

            <Divider/>

            {/* Assignments surface */}
            <Stack variant="elevation" sx={{ p: { xs: 1.4, sm: 1.8 }, bgcolor: "transparent" }}>
              <DomainAssignments
                allData={allData}
                expressionDomains={expressionDomains}
                domainAssignments={domainAssignments}
                setDomainAssignments={setDomainAssignments}
              />
            </Stack>
          </>
        )}
      </Stack>

      {/* Dialog creación/edición */}
      <CreateLinguisticExpressionDialog
        open={openCreateDomainExpressionDialog}
        editingDomain={editingDomain}
        onClose={() => setOpenCreateDomainExpressionDialog(false)}
        showSnackbarAlert={showSnackbarAlert}
      />

      {/* Dialog gestión */}
      <ViewExpressionsDomainDialog
        open={openViewDomainExpressions}
        onClose={() => setOpenViewDomainExpressions(false)}
        handleOpenEdit={handleOpenEditDomain}
        handleDelete={handleDelete}
      />
    </>
  );
};
