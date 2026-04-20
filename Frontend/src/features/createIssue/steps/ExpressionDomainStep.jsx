import { useState } from "react";
import { Stack, Typography, Button, Box, Avatar, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import AddIcon from "@mui/icons-material/Add";
import TuneIcon from "@mui/icons-material/Tune";

import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { CreateLinguisticExpressionDialog } from "../components/CreateLinguisticExpressionDialog";
import { ViewExpressionsDomainDialog } from "../components/ViewExpressionsDomainDialog";
import { CircularLoading } from "../../../components/LoadingProgress/CircularLoading";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { removeExpressionDomain } from "../../../services/issue.service";
import { DomainAssignments } from "../../issueExperts/components/IssueExpertsDomainAssigments";
import { useCreateIssueContext } from "../context/createIssue.context";
import {
  createIssueStepContainerSx,
  getCreateIssueExpressionActionBtnSx,
  getCreateIssueExpressionCountBadgeSx,
  getCreateIssueExpressionHeaderIconSx,
} from "../styles/createIssueStep.styles";

export const ExpressionDomainStep = () => {
  const theme = useTheme();
  const { allData, domainAssignments, setDomainAssignments } = useCreateIssueContext();
  const { selectedModel, addedExperts, alternatives, criteria } = allData;

  const { expressionDomains, setExpressionDomains } = useIssuesDataContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [openCreateDomainExpressionDialog, setOpenCreateDomainExpressionDialog] =
    useState(false);
  const [openViewDomainExpressions, setOpenViewDomainExpressions] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);

  const handleOpenEditDomain = (domain = null) => {
    if (domain) {
      setEditingDomain(domain);
    } else {
      setEditingDomain(null);
    }

    setOpenCreateDomainExpressionDialog(true);
  };

  const handleDelete = async (id) => {
    const result = await removeExpressionDomain(id);

    if (result && result.success) {
      setExpressionDomains((previous) => previous.filter((domain) => domain._id !== id));
      showSnackbarAlert(result?.message || "Domain deleted", "success");
    } else {
      showSnackbarAlert(result?.message || "Error deleting domain", "error");
    }
  };

  if (!domainAssignments || Object.keys(domainAssignments).length === 0) {
    return <CircularLoading color="secondary" size={150} height="30vh" />;
  }

  const missingPrevSteps =
    !selectedModel ||
    addedExperts.length === 0 ||
    alternatives.length === 0 ||
    criteria.length === 0;

  return (
    <>
      <Stack spacing={1.6} sx={createIssueStepContainerSx}>
        <Stack direction="row" spacing={1.2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar sx={getCreateIssueExpressionHeaderIconSx(theme)}>
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

          <Box sx={getCreateIssueExpressionCountBadgeSx(theme)}>
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
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.2}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleOpenEditDomain()}
                color="secondary"
                sx={getCreateIssueExpressionActionBtnSx(theme)}
              >
                Create linguistic expression
              </Button>

              <Button
                variant="outlined"
                onClick={() => setOpenViewDomainExpressions(true)}
                color="info"
                disabled={!expressionDomains || expressionDomains.length === 0}
                sx={getCreateIssueExpressionActionBtnSx(theme)}
              >
                Manage domains
              </Button>

              <Box sx={{ flex: 1 }} />
            </Stack>

            <Divider />

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

      <CreateLinguisticExpressionDialog
        open={openCreateDomainExpressionDialog}
        editingDomain={editingDomain}
        onClose={() => setOpenCreateDomainExpressionDialog(false)}
        showSnackbarAlert={showSnackbarAlert}
      />

      <ViewExpressionsDomainDialog
        open={openViewDomainExpressions}
        onClose={() => setOpenViewDomainExpressions(false)}
        handleOpenEdit={handleOpenEditDomain}
        handleDelete={handleDelete}
      />
    </>
  );
};
