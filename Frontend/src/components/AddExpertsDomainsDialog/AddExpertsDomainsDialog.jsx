import { useEffect, useState } from "react";
import { DialogTitle, DialogContent, DialogActions, Button, Stack, Typography } from "@mui/material";
import { useIssuesDataContext } from "../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../context/snackbarAlert/snackbarAlert.context";
import { buildInitialAssignments, getLeafCriteria, validateDomainAssigments } from "../../utils/createIssueUtils";
import { DomainAssignments } from "../DomainAssigments/DomainAssigments";
import { GlassDialog } from "../StyledComponents/GlassDialog";

const AddExpertsDomainsDialog = ({ open, onClose, issue, expertsToAdd, onConfirmDomains }) => {
  const { globalDomains, expressionDomains } = useIssuesDataContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [domainAssignments, setDomainAssignments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && expertsToAdd.length > 0 && issue?.alternatives && issue?.criteria) {
      const leafCriteria = getLeafCriteria(issue.criteria);
      const init = buildInitialAssignments(
        expertsToAdd,
        issue.alternatives.map(a => a.name),
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
  
  return (
    <GlassDialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>Assign Expression Domains to New Experts</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Typography variant="body1">Loading domain assignments...</Typography>
        ) : (
          <Stack spacing={3} sx={{ mt: 2 }}>
            <DomainAssignments
              allData={{
                addedExperts: expertsToAdd,
                alternatives: issue.alternatives.map(a => a.name ?? a),
                criteria: issue.criteria,
                selectedModel: issue.model
              }}
              expressionDomains={expressionDomains}
              domainAssignments={domainAssignments}
              setDomainAssignments={setDomainAssignments}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="info">
          Cancel
        </Button>
        <Button onClick={handleConfirm} color="success" variant="contained">
          Confirm Domains
        </Button>
      </DialogActions>
    </GlassDialog>
  );
};

export default AddExpertsDomainsDialog;
