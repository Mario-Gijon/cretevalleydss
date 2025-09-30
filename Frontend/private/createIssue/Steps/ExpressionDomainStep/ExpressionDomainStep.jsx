import { Stack, Typography, Button } from "@mui/material";
import { GlassPaper } from "../../../../src/components/StyledComponents/GlassPaper";
import { useState, useEffect } from "react";
import AddIcon from "@mui/icons-material/Add";

import { useSnackbarAlertContext } from "../../../../src/context/snackbarAlert/snackbarAlert.context";
import { CreateLinguisticExpressionDialog } from "../../../../src/components/CreateLinguisticExpressionDialog/CreateLinguisticExpressionDialog";
import { ViewExpressionsDomainDialog } from "../../../../src/components/ViewExpressionsDomainDialog/ViewExpressionsDomainDialog";
import { DomainAssignments } from "../../../../src/components/DomainAssigments/DomainAssigments";
import { CircularLoading } from "../../../../src/components/LoadingProgress/CircularLoading";
import { useIssuesDataContext } from "../../../../src/context/issues/issues.context";
import { removeExpressionDomain } from "../../../../src/controllers/issueController";

// 🔎 crear estructura mínima
const buildInitialAssignments = (experts, alternatives, criteria, defaultDomainId) => {
  const base = { experts: {} };
  experts.forEach((exp) => {
    base.experts[exp] = { alternatives: {} };
    alternatives.forEach((alt) => {
      base.experts[exp].alternatives[alt] = { criteria: {} };
      criteria.forEach((crit) => {
        base.experts[exp].alternatives[alt].criteria[crit.name] = defaultDomainId || "Empty";
      });
    });
  });
  return base;
};

export const ExpressionDomainStep = ({ allData, domainAssignments, setDomainAssignments }) => {
  const { selectedModel, addedExperts, alternatives, criteria } = allData;

  const { expressionDomains, setExpressionDomains } = useIssuesDataContext()

  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [openCreateDomainExpressionDialog, setOpenCreateDomainExpressionDialog] = useState(false);
  const [openViewDomainExpressions, setOpenViewDomainExpressions] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);

  // inicializar solo una vez
  useEffect(() => {
    if (
      addedExperts.length > 0 &&
      alternatives.length > 0 &&
      criteria.length > 0 &&
      (!domainAssignments.experts ||
        Object.keys(domainAssignments.experts).length === 0)
    ) {
      setDomainAssignments(
        buildInitialAssignments(addedExperts, alternatives, criteria)
      );
    }
  }, [addedExperts, alternatives, criteria, domainAssignments, setDomainAssignments]);

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

  return (
    <>
      <GlassPaper
        variant="elevation"
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4, md: 5 },
          pb: { xs: 1, sm: 2, md: 3 },
          borderRadius: 2,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          maxWidth: { xs: "95vw", lg: "75vw" },
          minWidth: { xs: "80vw", sm: "90vw", md: "90vw", lg: "50vw" },
          boxShadow: "0 8px 24px rgba(29, 82, 81, 0.1)",
        }}
      >
        {!selectedModel ||
          addedExperts.length === 0 ||
          alternatives.length === 0 ||
          criteria.length === 0 ? (
          <Typography variant="h5">You must finish previous steps</Typography>
        ) : (
          <Stack spacing={4}>
            {/* botones de gestión */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => handleOpenEditDomain()}
                color="secondary"
              >
                Create linguistic expression
              </Button>
              <Button
                variant="outlined"
                onClick={() => setOpenViewDomainExpressions(true)}
                color="info"
                disabled={!expressionDomains || expressionDomains.length === 0}
              >
                Manage domains
              </Button>
            </Stack>

            {/* asignaciones */}
            <DomainAssignments
              allData={allData}
              expressionDomains={expressionDomains}
              domainAssignments={domainAssignments}
              setDomainAssignments={setDomainAssignments}
            />
          </Stack>
        )}
      </GlassPaper>

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
