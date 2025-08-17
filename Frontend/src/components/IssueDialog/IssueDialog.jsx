import { Stack, Dialog, DialogTitle, DialogActions, Divider, IconButton } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { IsAdminIssueContentDialog } from "./IsAdminIssueContentDialog";
import { IsNotAdminIssueContentDialog } from "./isNotAdminIssueContentDialog";

export const IssueDialog = ({ openIssueDialog, handleCloseIssueDialog, selectedIssue, setOpenRemoveConfirmDialog, isEditingExperts, handleAddExpert, handleDeleteExpert, handleEditExperts, handleRateAlternatives, setOpenResolveConfirmDialog, expertsToRemove, setOpenAddExpertsDialog, setExpertsToAdd, expertsToAdd, hoveredChip, setHoveredChip, openLeaveConfirmDialog, setOpenLeaveConfirmDialog, handleLeaveIssue, leaveLoading }) => {

  return (

    <Dialog open={openIssueDialog} onClose={handleCloseIssueDialog} maxWidth="lg" PaperProps={{ elevation: 0 }} >
      { selectedIssue && (
        <>
          <Stack direction={"row"} sx={{ justifyContent: "space-between", alignItems: "center" }} useFlexGap>
            {/* Título del modal */}
            <DialogTitle variant="h5" sx={{ fontWeight: "bold", color: "text.primary" }}>
              {selectedIssue.name}
            </DialogTitle>
            {/* Acciones del modal */}
            <DialogActions >
              <IconButton onClick={handleCloseIssueDialog} color="inherit" variant="outlined" sx={{ mr: 0.5 }}>
                <CloseIcon />
              </IconButton>
            </DialogActions>
          </Stack>

          <Divider />
          {/* Encabezado del modal */}
          {selectedIssue.isAdmin ? (
            <IsAdminIssueContentDialog
              selectedIssue={selectedIssue}
              setOpenRemoveConfirmDialog={setOpenRemoveConfirmDialog}
              isEditingExperts={isEditingExperts}
              handleAddExpert={handleAddExpert}
              handleDeleteExpert={handleDeleteExpert}
              handleEditExperts={handleEditExperts}
              handleRateAlternatives={handleRateAlternatives}
              setOpenResolveConfirmDialog={setOpenResolveConfirmDialog}
              expertsToRemove={expertsToRemove || []} // Asegurarse de que existe el array
              setOpenAddExpertsDialog={setOpenAddExpertsDialog}
              setExpertsToAdd={setExpertsToAdd}
              expertsToAdd={expertsToAdd}
              hoveredChip={hoveredChip}
              setHoveredChip={setHoveredChip}
            />
          ) : (
            <IsNotAdminIssueContentDialog
              selectedIssue={selectedIssue}
              handleRateAlternatives={handleRateAlternatives}
              setOpenLeaveConfirmDialog={setOpenLeaveConfirmDialog}
              openLeaveConfirmDialog={openLeaveConfirmDialog}
              handleLeaveIssue={handleLeaveIssue}
              leaveLoading={leaveLoading}
            />
          )}
        </>
      )
    }
    </Dialog >
  )
}