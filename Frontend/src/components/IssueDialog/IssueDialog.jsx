import { Stack, Divider, IconButton, Typography } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { IsAdminIssueContentDialog } from "./IsAdminIssueContentDialog";
import { IsNotAdminIssueContentDialog } from "./isNotAdminIssueContentDialog";
import { GlassDialog } from "../StyledComponents/GlassDialog";


export const IssueDialog = ({ openIssueDialog, handleCloseIssueDialog, selectedIssue, setOpenRemoveConfirmDialog, isEditingExperts, handleAddExpert, handleDeleteExpert, handleEditExperts, handleRateAlternatives, setOpenResolveConfirmDialog, expertsToRemove, setOpenAddExpertsDialog, setExpertsToAdd, expertsToAdd, hoveredChip, setHoveredChip, openLeaveConfirmDialog, setOpenLeaveConfirmDialog, handleLeaveIssue, leaveLoading }) => {

  return (

    <GlassDialog open={openIssueDialog} onClose={handleCloseIssueDialog} maxWidth="lg" >
      {selectedIssue && (
        <>
          <Stack direction={"row"} sx={{ justifyContent: "space-between", alignItems: "center" }} useFlexGap p={1.4} px={2} pl={3}>
            {/* Título del modal */}
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              {selectedIssue.name}
            </Typography>
            {/* Acciones del modal */}
            <IconButton onClick={handleCloseIssueDialog} color="inherit" variant="outlined">
              <CloseIcon />
            </IconButton>
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
    </GlassDialog >
  )
}