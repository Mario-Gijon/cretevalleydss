import { Stack, Grid2 as Grid, Typography, Chip, DialogContent, Button, Box, AccordionSummary } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { GlassAccordion } from "../StyledComponents/GlassAccordion";
import { GlassPaper } from "../StyledComponents/GlassPaper";
import { CriterionAccordion } from "../CriterionAccordion/CriterionAccordion";

export const IsAdminIssueContentDialog = ({ selectedIssue, setOpenRemoveConfirmDialog, isEditingExperts, handleDeleteExpert, handleEditExperts, handleRateAlternatives, handleRateWeights, setOpenResolveConfirmDialog, setOpenComputeWeightsConfirmDialog, expertsToRemove, setOpenAddExpertsDialog, setExpertsToAdd, expertsToAdd, hoveredChip, setHoveredChip }) => {

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
            <Grid item size={({ xs: 12, sm: 4.1, md: 3, lg: 3 })}>
              <GlassPaper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>You are the admin</Typography>
              </GlassPaper>
            </Grid>

            {/* Modelo */}
            <Grid item size={{ xs: 12, sm: 7.9, md: 7 }}>
              <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    Model:
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.primary" }}>
                    {selectedIssue.model.name}
                  </Typography>
                </Stack>
              </GlassPaper>
            </Grid>

            {/* Numeros de expertos en el problema */}
            <Grid item size={selectedIssue.closureDate ? { xs: 12, sm: 2.9, md: 2 } : { xs: 12, sm: 5, md: 2 }}>
              <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    Experts:
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.primary" }}>
                    {selectedIssue.totalExperts}
                  </Typography>
                </Stack>
              </GlassPaper>
            </Grid>


            {/* Fecha de creación */}
            <Grid item size={selectedIssue.closureDate ? ({ xs: 12, sm: 4.6, md: 6 }) : ({ xs: 12, sm: 7, md: 12 })}>
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
              <Grid item size={{ xs: 12, sm: 4.5, md: 6 }}>
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
                <Grid item size={{ xs: 12, md: 4 }}>
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
                <Grid item size={{ xs: 12, md: 4 }}>
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
                <Grid item size={{ xs: 12, md: 4 }}>
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
                    <GlassAccordion key={index} disableGutters elevation={1} square={false} sx={{ pointerEvents: "none" }}>
                      <AccordionSummary
                        sx={{
                          m: 0,
                          pl: 1,
                        }}
                      >
                        <Typography variant="body1" sx={{ color: "text.primary" }}>
                          {alt}
                        </Typography>
                      </AccordionSummary>
                    </GlassAccordion>
                  ))}
                </Stack>
              </GlassPaper>
            </Grid>

            {/* Criterios */}
            <Grid item size={{ xs: 12, md: 6 }}>
              <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction={"row"} justifyContent={"space-between"}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                    Criteria:
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1, pr: 1 }}>
                    Weights
                  </Typography>
                </Stack>
                <Stack flexDirection="column" spacing={0}>
                  {selectedIssue.criteria.map((criterion) =>
                    <CriterionAccordion
                      key={criterion.name}
                      criterion={criterion}
                      weightMap={selectedIssue.finalWeights}
                    />
                  )}
                </Stack>
              </GlassPaper>
            </Grid>

            {/* Expertos que han participado */}
            {selectedIssue.participatedExperts?.filter(expert => !expertsToRemove.includes(expert)).length !== 0 && (
              <Grid item size={{ xs: 12 }}>
                <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                    Participated:
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {selectedIssue.participatedExperts.filter(expert => !expertsToRemove.includes(expert)).map((expert, idx) => (
                      <Chip
                        key={idx}
                        label={expert}
                        variant="outlined"
                        size="small"
                        {...(isEditingExperts ? { onDelete: () => handleDeleteExpert(expert) } : {})}
                        color={(hoveredChip === expert && isEditingExperts) ? "error" : "default"} // Cambiar color al pasar el ratón
                        clickable={hoveredChip === expert && isEditingExperts}
                        onClick={isEditingExperts ? () => handleDeleteExpert(expert) : undefined} // Añadir experto al hacer clic
                        onDelete={isEditingExperts ? () => handleDeleteExpert(expert) : undefined}
                        onMouseEnter={isEditingExperts ? () => setHoveredChip(expert) : undefined} // Detectar cuando el ratón pasa sobre el chip
                        onMouseLeave={isEditingExperts ? () => setHoveredChip(null) : undefined} // Restablecer color cuando el ratón sale
                      />
                    ))}
                  </Box>
                </GlassPaper>
              </Grid>
            )}
            {/* Expertos que no han participado pero han aceptado*/}
            {selectedIssue.acceptedButNotEvaluatedExperts?.filter(expert => !expertsToRemove.includes(expert)).length !== 0 && (
              <Grid item size={{ xs: 12 }}>
                <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                    Accepted:
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {selectedIssue.acceptedButNotEvaluatedExperts.filter(expert => !expertsToRemove.includes(expert))
                      .map((expert, idx) => (
                        <Chip
                          key={idx}
                          label={expert}
                          size="small"
                          color={hoveredChip === expert && isEditingExperts ? "error" : "default"} // Cambiar color al pasar el ratón
                          variant="outlined"
                          clickable={hoveredChip === expert && isEditingExperts}
                          onClick={selectedIssue.isAdmin && isEditingExperts ? () => handleDeleteExpert(expert) : undefined} // Añadir experto al hacer clic
                          onDelete={selectedIssue.isAdmin && isEditingExperts ? () => handleDeleteExpert(expert) : undefined}
                          onMouseEnter={isEditingExperts ? () => setHoveredChip(expert) : undefined} // Detectar cuando el ratón pasa sobre el chip
                          onMouseLeave={isEditingExperts ? () => setHoveredChip(null) : undefined} // Restablecer color cuando el ratón sale
                        />
                      ))}
                  </Box>
                </GlassPaper>
              </Grid>
            )}

            {/* Expertos que no han respondido*/}
            {selectedIssue.pendingExperts?.filter(expert => !expertsToRemove.includes(expert)).length !== 0 && (
              <Grid item size={{ xs: 12 }}>
                <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                    Not accepted yet:
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {selectedIssue.pendingExperts.filter(expert => !expertsToRemove.includes(expert))
                      .map((expert, idx) => (
                        <Chip
                          key={idx}
                          label={expert}
                          size="small"
                          color={hoveredChip === expert && isEditingExperts ? "error" : "default"} // Cambiar color al pasar el ratón
                          variant="outlined"
                          clickable={hoveredChip === expert && isEditingExperts}
                          onClick={selectedIssue.isAdmin && isEditingExperts ? () => handleDeleteExpert(expert) : undefined} // Añadir experto al hacer clic
                          onDelete={selectedIssue.isAdmin && isEditingExperts ? () => handleDeleteExpert(expert) : undefined}
                          onMouseEnter={isEditingExperts ? () => setHoveredChip(expert) : undefined} // Detectar cuando el ratón pasa sobre el chip
                          onMouseLeave={isEditingExperts ? () => setHoveredChip(null) : undefined} // Restablecer color cuando el ratón sale
                        />
                      ))}
                  </Box>
                </GlassPaper>
              </Grid>
            )}

            {/* Expertos que no han aceptado */}
            {selectedIssue.notAcceptedExperts?.filter(expert => !expertsToRemove.includes(expert)).length !== 0 && (
              <Grid item size={{ xs: 12 }}>
                <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                    Rejected:
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {selectedIssue.notAcceptedExperts.filter(expert => !expertsToRemove.includes(expert))
                      .map((expert, idx) => (
                        <Chip
                          key={idx}
                          label={expert}
                          size="small"
                          color={hoveredChip === expert && isEditingExperts ? "error" : "default"} // Cambiar color al pasar el ratón
                          variant="outlined"
                          clickable={hoveredChip === expert && isEditingExperts}
                          onClick={isEditingExperts ? () => handleDeleteExpert(expert) : undefined} // Añadir experto al hacer clic
                          onDelete={isEditingExperts ? () => handleDeleteExpert(expert) : undefined}
                          onMouseEnter={isEditingExperts ? () => setHoveredChip(expert) : undefined} // Detectar cuando el ratón pasa sobre el chip
                          onMouseLeave={isEditingExperts ? () => setHoveredChip(null) : undefined} // Restablecer color cuando el ratón sale
                        />
                      ))}
                  </Box>
                </GlassPaper>
              </Grid>
            )}
            {/* Expertos para añadir */}
            {isEditingExperts && (
              <Grid item size={{ xs: 12 }}>
                <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                    Added:
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {expertsToAdd.map((expert, idx) => (
                      <Chip
                        key={idx}
                        label={expert}
                        size="small"
                        clickable={hoveredChip === expert && isEditingExperts}
                        color={hoveredChip === expert && isEditingExperts ? "error" : "default"} // Cambiar color al pasar el ratón
                        variant="outlined"
                        onMouseEnter={isEditingExperts ? () => setHoveredChip(expert) : undefined} // Detectar cuando el ratón pasa sobre el chip
                        onMouseLeave={isEditingExperts ? () => setHoveredChip(null) : undefined} // Restablecer color cuando el ratón sale
                        onClick={() => {
                          setExpertsToAdd((prev) =>
                            prev.filter((email) => email !== expert)
                          );
                        }}
                        onDelete={() => {
                          setExpertsToAdd((prev) =>
                            prev.filter((email) => email !== expert)
                          );
                        }}
                      />
                    ))}
                    {/* Chip adicional para agregar un experto */}
                    {isEditingExperts && (
                      <Chip
                        label="Add Expert"
                        size="small"
                        variant="outlined"
                        icon={<AddIcon />} // Icono de añadir
                        color="success"
                        onClick={() => setOpenAddExpertsDialog(true)}
                      />
                    )}
                  </Box>
                </GlassPaper>
              </Grid>
            )}
          </Grid>
        </>

      </DialogContent>

      {/* 🔹 Acciones del modal (para admin o admin-experto) */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mx: 3, my: 2, mt: 1, justifyContent: "flex-end" }}
      >

        {/* ✅ Si el admin también participa como experto, puede evaluar */}
        {selectedIssue.isExpert && selectedIssue.statusFlags?.canEvaluateWeights && (
          <Button
            onClick={handleRateWeights}
            size="small"
            color="secondary"
            variant="outlined"
          >
            Rate weights
          </Button>
        )}

        {selectedIssue.isExpert && selectedIssue.statusFlags?.canEvaluateAlternatives && (
          <Button
            onClick={handleRateAlternatives}
            size="small"
            color="secondary"
            variant="outlined"
          >
            Rate alternatives
          </Button>
        )}

        {/* ✅ Admin puede calcular los pesos cuando todos evaluaron los criterios */}
        {selectedIssue.statusFlags?.canComputeWeights && (
          <Button
            onClick={() => setOpenComputeWeightsConfirmDialog(true)} // o abre modal de "Compute Weights"
            size="small"
            color="warning"
            variant="outlined"
          >
            Compute Weights
          </Button>
        )}

        {/* ✅ Admin puede resolver cuando todos evaluaron las alternativas */}
        {selectedIssue.statusFlags?.canResolveIssue && (
          <Button
            onClick={() => setOpenResolveConfirmDialog(true)}
            size="small"
            color="warning"
            variant="outlined"
          >
            Resolve
          </Button>
        )}

        {/* ✅ Botón de edición de expertos (sin cambios) */}
        <Button
          onClick={handleEditExperts}
          size="small"
          color="success"
          variant="outlined"
        >
          {isEditingExperts
            ? (expertsToRemove.length === 0 && expertsToAdd.length === 0
              ? "Exit edit"
              : "Save changes")
            : "Edit experts"}
        </Button>

        {/* ✅ Botón de eliminar issue (sin cambios) */}
        <Button
          onClick={() => setOpenRemoveConfirmDialog(true)}
          size="small"
          color="error"
          variant="outlined"
        >
          Remove
        </Button>
      </Stack>

    </>
  )
}