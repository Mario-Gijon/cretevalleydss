import { Stack, Grid2 as Grid, Typography, Chip, DialogContent, Button, Accordion, AccordionSummary, Dialog, DialogTitle, DialogActions } from "@mui/material";
import { CriterionAccordion } from "../CriterionAccordion/CriterionAccordion";
import { GlassPaper } from "../../../private/activeIssues/customStyles/StyledCard";

export const IsNotAdminIssueContentDialog = ({ selectedIssue, handleRateAlternatives, openLeaveConfirmDialog, setOpenLeaveConfirmDialog, handleLeaveIssue, leaveLoading }) => {

  return (

    <>
      <DialogContent>
        <>
          {/* Descripción completa */}
          < Typography variant="body1" sx={{ mb: 2.5, color: "text.primary" }}>
            {selectedIssue.description}
          </Typography>

          {/* Grid para la información */}
          <Grid container spacing={2}>
            {/* Creador */}
            <Grid item size={(selectedIssue.closureDate ? { xs: 12, sm: 12, md: 5 } : { xs: 12, sm: 7 })}>
              <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                <Grid container alignItems="center" spacing={1}>
                  <Grid item>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                      {"Admin:"}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Chip label={selectedIssue.creator} size="small" />
                  </Grid>
                </Grid>
              </GlassPaper>
            </Grid>

            {/* Fecha de creación */}
            <Grid item size={
              selectedIssue.closureDate ? ({ xs: 12, sm: 6, md: 3.5 }) : ({ xs: 12, sm: 5 })
            }>
              <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    Creation:
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.primary" }}>
                    {selectedIssue.creationDate}
                  </Typography>
                </Stack>
              </GlassPaper>
            </Grid>

            {/* Fecha de cierre */}
            {selectedIssue.closureDate && (
              <Grid item size={{ xs: 12, sm: 6, md: 3.5 }}>
                <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1}>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                      Closure:
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.primary" }}>
                      {selectedIssue.closureDate}
                    </Typography>
                  </Stack>
                </GlassPaper>
              </Grid>
            )}

            {/* Consenso */}
            {selectedIssue.isConsensus &&
              <>
                <Grid item size={{ xs: 12, md: 4.5 }}>
                  <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                    <Stack direction="row" spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                        Consensus max rounds:
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.primary" }}>
                        {selectedIssue.consensusMaxPhases}
                      </Typography>
                    </Stack>
                  </GlassPaper>
                </Grid>
                <Grid item size={{ xs: 12, md: 3.75 }}>
                  <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                    <Stack direction="row" spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                        Consensus threshold:
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.primary" }}>
                        {selectedIssue.consensusThreshold}
                      </Typography>
                    </Stack>
                  </GlassPaper>
                </Grid>
                <Grid item size={{ xs: 12, md: 3.75 }}>
                  <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                    <Stack direction="row" spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                        Consensus current round:
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.primary" }}>
                        {selectedIssue.consensusCurrentPhase}
                      </Typography>
                    </Stack>
                  </GlassPaper>
                </Grid>
              </>
            }

            {/* Alternativas */}
            <Grid item size={{ xs: 12, md: 6 }}>
              <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                  Alternatives:
                </Typography>
                <Stack flexDirection="column" spacing={0} flexWrap={"wrap"}>
                  {selectedIssue.alternatives.map((alt, index) => (
                    <Accordion variant="outlined" key={index} disableGutters elevation={1} square={false} sx={{ pointerEvents: "none" }}>
                      <AccordionSummary
                        sx={{
                          m: 0,
                          pl: 1.5,
                        }}
                      >
                        <Typography variant="body1" sx={{ color: "text.primary" }}>
                          {alt}
                        </Typography>
                      </AccordionSummary>
                    </Accordion>
                  ))}
                </Stack>
              </GlassPaper>
            </Grid>

            {/* Criterios */}
            <Grid item size={{ xs: 12, md: 6 }}>
              <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                  Criteria:
                </Typography>
                <Stack flexDirection="column" spacing={0}>
                  {selectedIssue.criteria.map((criterion) =>
                    <CriterionAccordion key={criterion.name} criterion={criterion} />
                  )}
                </Stack>
              </GlassPaper>
            </Grid>


            {/* Consenso */}
            {selectedIssue.consensus &&
              <Grid item size={{ xs: 12 }}>
                <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1}>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                      Consensus:
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.primary" }}>
                      {selectedIssue.consensusInfo.level + ", " + selectedIssue.consensusInfo.details}
                    </Typography>
                  </Stack>
                </GlassPaper>
              </Grid>
            }
          </Grid>
        </>
      </DialogContent>

      {/* Acciones del modal */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mx: 3, my: 2, mt: 1, justifyContent: "flex-end" }}>
        {!selectedIssue.evaluated && (
          <Button onClick={handleRateAlternatives} size="small" color="secondary" variant="outlined">
            Rate alternatives
          </Button>
        )}
      <Button onClick={() => setOpenLeaveConfirmDialog(true)} size="small" color="error" variant="outlined">
        Leave
      </Button>
      </Stack>

      {/* Diálogo de confirmación de salir el issue */}
      <Dialog open={openLeaveConfirmDialog} onClose={() => setOpenLeaveConfirmDialog(false)}>
        <DialogTitle>Are you sure you want to leave this issue?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setOpenLeaveConfirmDialog(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleLeaveIssue} color="error" loading={leaveLoading} loadingPosition="end">
            Leave
          </Button>
        </DialogActions>
      </Dialog>

    </>

  )
}