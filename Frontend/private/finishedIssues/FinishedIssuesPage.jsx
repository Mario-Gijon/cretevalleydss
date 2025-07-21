// Importa componentes de Material UI
import { Stack, Typography, CardContent, CardActionArea, Dialog, DialogTitle, DialogActions, Button, Box, DialogContent, DialogContentText } from "@mui/material";
import Masonry from "@mui/lab/Masonry";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { StyledCard, StyledChip } from "./customStyles/StyledCard";
import { useIssuesDataContext } from "../../src/context/issues/issues.context";
import { CircularLoading } from "../../src/components/LoadingProgress/CircularLoading";
import { useEffect, useState } from "react";
import { removeFinishedIssue } from "../../src/controllers/issueController";
import { FinishedIssueDialog } from "../../src/components/FinishedIssueDialog/FinishedIssueDialog";
import { useSnackbarAlertContext } from "../../src/context/snackbarAlert/snackbarAlert.context";


// Componente Dashboard
const FinishedIssuesPage = () => {

  const { showSnackbarAlert } = useSnackbarAlertContext();

  const [selectedIssue, setSelectedIssue] = useState(null);
  const [openRemoveConfirmDialog, setOpenRemoveConfirmDialog] = useState(false);
  const [openFinishedIssueDialog, setOpenFinishedIssueDialog] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false);

  const { issueCreated, setIssueCreated, loading, finishedIssues, setFinishedIssues } = useIssuesDataContext();

  useEffect(() => {
    if (issueCreated.success) {
      showSnackbarAlert(issueCreated.msg, "success");
      setIssueCreated("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueCreated, setIssueCreated]);

  const handleOpenFinishedIssueDialog = (issue) => {
    setSelectedIssue(issue);
    setOpenFinishedIssueDialog(true)
  };

  const handleCloseFinishedIssueDialog = () => {
    setSelectedIssue(null);
    setOpenFinishedIssueDialog(false);
  };

  const handleRemoveFinishedIssue = async () => {
    setRemoveLoading(true)
    const response = await removeFinishedIssue(selectedIssue.name);
    if (response.success) {
      setFinishedIssues(prevIssues => prevIssues.filter(issue => issue.name !== selectedIssue.name));
      handleCloseFinishedIssueDialog();
      console.log("Issue deleted successfully");
    }
    showSnackbarAlert(response.msg, response.success ? "success" : "error");
    setRemoveLoading(false)
    setOpenRemoveConfirmDialog(false)
  }


  if (loading) {
    // Mostrar un loader mientras los datos se están cargando
    return <CircularLoading color="secondary" size={50} height="30vh" />;
  }

  if (finishedIssues?.length === 0) {
    return (
      <Typography variant="h4" sx={{ mt: 5, textAlign: "center" }}>
        No finished issues
      </Typography>
    );
  }

  return (
    <>
      <Stack
        direction="column"
        spacing={2}
        sx={{
          justifyContent: "center",
        }}
      >
        {/* Masonry con las cards */}
        <Masonry columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} spacing={2} sequential>
          {finishedIssues?.map((issue, index) => (
            <StyledCard key={index} elevation={0}>
              <CardActionArea onClick={() => handleOpenFinishedIssueDialog(issue)}>
                <CardContent>
                  {/* Título del issue */}
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1, color: "text.primary" }}>
                      {issue.name}
                    </Typography>
                    {issue.isAdmin && <AccountCircleIcon />}
                  </Stack>

                  {/* Información resumida */}
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 1.6,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "normal",
                      color: "text.secondary",
                    }}
                  >
                    {issue.description}
                  </Typography>

                  {/* Estado de evaluación */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <StyledChip
                      label={"Finished"}
                      variant="outlined"
                      size="small"
                    />
                  </Box>

                  {/* Fechas */}
                  <Typography variant="caption" display="block" sx={{ color: "text.secondary" }}>
                    Creation: {issue.creationDate}
                  </Typography>
                  {
                    issue.closureDate &&
                    <Typography variant="caption" display="block" sx={{ color: "text.secondary" }}>
                      Closure: {issue.closureDate}
                    </Typography>
                  }

                </CardContent>
              </CardActionArea>
            </StyledCard>
          ))}
        </Masonry>

        {
          selectedIssue && (
            < FinishedIssueDialog
              selectedIssue={selectedIssue}
              openFinishedIssueDialog={openFinishedIssueDialog}
              handleCloseFinishedIssueDialog={handleCloseFinishedIssueDialog}
              handleRemoveFinishedIssue={handleRemoveFinishedIssue}
              setOpenRemoveConfirmDialog={setOpenRemoveConfirmDialog}
            />
          )
        }



      </Stack>

      {/* Diálogo de confirmación de borrar el issue */}
      <Dialog open={openRemoveConfirmDialog} onClose={() => setOpenRemoveConfirmDialog(false)}>
        <DialogTitle>Are you sure you want to remove this issue?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Other users will still be able to see it.
          </DialogContentText>
        </DialogContent>
        <DialogActions></DialogActions>
        <DialogActions>
          <Button onClick={() => setOpenRemoveConfirmDialog(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleRemoveFinishedIssue} color="error" loading={removeLoading} loadingPosition="end">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};


export default FinishedIssuesPage