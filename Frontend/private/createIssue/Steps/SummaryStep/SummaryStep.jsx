import { useState } from "react";

import { Typography, Stack, Chip, AccordionSummary, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid2 as Grid, Box, TextField, ToggleButton, } from "@mui/material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { CriterionAccordion } from "../../../../src/components/CriterionAccordion/CriterionAccordion";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { getRemainingTime } from "../../../../src/utils/createIssueUtils";
import { GlassAccordion, GlassPaper } from "../../../activeIssues/customStyles/StyledCard";

dayjs.extend(duration);
dayjs.extend(customParseFormat);

export const SummaryStep = ({ allData, issueName, issueDescription, issueNameError, issueDescriptionError, handleValidateIssueName, handleValidateIssueDescription, closureDate, setClosureDate, closureDateError, handleClosureDateError, groupedData, consensusMaxPhases, setConsensusMaxPhases, consensusThreshold, setConsensusThreshold }) => {

  const { selectedModel, withConsensus, alternatives, criteria, addedExperts, domainExpressions } = allData;

  const [unlimited, setUnlimited] = useState(consensusMaxPhases === null);

  const handleUnlimitedChange = () => {
    setUnlimited(!unlimited);
    setConsensusMaxPhases(!unlimited ? null : 3);
  };

  const [openCalendar, setOpenCalendar] = useState(false); // Para controlar la apertura del calendario

  return (
    <GlassPaper
      variant="elevation"
      elevation={0}
      sx={{
        p: { xs: 3, sm: 4, md: 5 },
        borderRadius: 2,
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        maxWidth: 1500,
        width: { xs: "95vw", sm: "auto" },
      }}>

      {(
        !selectedModel
        || addedExperts.length === 0
        || alternatives.length === 0
        || criteria.length === 0
        || domainExpressions.length === 0
      ) ? <Typography variant="h5">You must finish previous steps</Typography>

        :
        <Grid container spacing={2}>

          {/* Nombre del problema */}
          <Grid item size={{ xs: 12, md: 5, lg: 4 }}>
            <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexGrow={1} width={"100%"}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                  Issue name:
                </Typography>
                <TextField
                  variant="standard"
                  autoComplete="off"
                  size="small"
                  value={issueName}
                  onChange={(e) => { handleValidateIssueName(e.target.value) }}
                  error={issueNameError}
                  helperText={issueNameError}
                  onKeyDown={(e) => e.key === "Enter" && handleValidateIssueName(e.target.value)}
                  color="info"
                  sx={{ flex: 1, width: "100%" }}
                />
              </Stack>
            </GlassPaper>
          </Grid>

          {/* Descripción */}
          <Grid item size={{ xs: 12, md: 7, lg: 8 }}>
            <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexGrow={1} width={"100%"}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                  Description:
                </Typography>
                <TextField
                  variant="standard"
                  autoComplete="off"
                  size="small"
                  value={issueDescription}
                  onChange={(e) => { handleValidateIssueDescription(e.target.value) }}
                  error={issueDescriptionError}
                  helperText={issueDescriptionError}
                  onKeyDown={(e) => e.key === "Enter" && handleValidateIssueDescription(e.target.value)}
                  color="info"
                  sx={{ flex: 1, width: "100%" }}
                />
              </Stack>
            </GlassPaper>
          </Grid>

          {/* Modelo */}
          <Grid item size={{ xs: 12, sm: 6, md: 4 }}>
            <GlassPaper variant="outlined" elevation={3} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                  Model:
                </Typography>
                <Typography variant="body2" sx={{ color: "text.primary" }}>
                  {selectedModel}
                </Typography>
              </Stack>
            </GlassPaper>
          </Grid>

          {/* Consenso */}
          <Grid item size={{ xs: 12, sm: 6, md: 5 }}>
            <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                  {withConsensus ? "With Consensus" : "Without consensus"}
                </Typography>
              </Stack>
            </GlassPaper>
          </Grid>

          {/* Numeros de expertos en el problema */}
          <Grid item size={{ xs: 12, sm: 12, md: 3 }}>
            <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                  NºExperts:
                </Typography>
                <Typography variant="body2" sx={{ color: "text.primary" }}>
                  {addedExperts.length}
                </Typography>
              </Stack>
            </GlassPaper>
          </Grid>

          {/* Alternativas */}
          <Grid item size={{ xs: 12, md: 6 }}>
            <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                Alternatives:
              </Typography>
              <Stack flexDirection="column" spacing={0} flexWrap={"wrap"}>
                {alternatives.map((alt, index) => (
                  <GlassAccordion variant="outlined" key={index} disableGutters elevation={1} square={false} sx={{ pointerEvents: "none" }}>
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
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                Criteria:
              </Typography>
              <Stack flexDirection="column" spacing={0} flexWrap={"wrap"}>
                {criteria.map((criterion, index) => (
                  <CriterionAccordion key={index} criterion={criterion} />
                ))}
              </Stack>
            </GlassPaper>
          </Grid>

          {/* Expertos */}
          <Grid size={{ xs: 12 }}>
            <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                Experts:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {addedExperts.map((expert, idx) => (
                  <Chip
                    variant="outlined"
                    key={idx}
                    label={expert}
                    size="small"
                  />
                ))}
              </Box>
            </GlassPaper>
          </Grid>

          {/* Fecha de cierre */}
          <Grid item size={withConsensus ? { xs: 12, sm: 12, md: 6, lg: 4 } : { xs: 12 }}>
            <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start" flexGrow={1} width={"100%"}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Closure date"
                    value={closureDate}
                    minDate={dayjs().add(2, "day")} // No se puede seleccionar el día de hoy
                    onChange={(newValue) => {
                      setClosureDate(newValue);
                      handleClosureDateError(newValue); // Pasamos newValue directamente
                    }}
                    openTo="day"
                    open={openCalendar} // Controlamos la apertura del calendario
                    onOpen={() => setOpenCalendar(true)} // Al abrir el calendario
                    onClose={() => setOpenCalendar(false)} // Al cerrar el calendario
                    sx={{ width: 170 }}
                    slotProps={{
                      textField: {
                        size: "small",
                        error: closureDateError,
                        color: "secondary",
                        onClick: () => setOpenCalendar(true)
                      },
                    }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    {getRemainingTime(closureDate)}
                  </Typography>
                </LocalizationProvider>
              </Stack>
            </GlassPaper>
          </Grid>

          {withConsensus &&
            <>
              {/* NºMax de fases de consenso */}
              <Grid item size={{ xs: 12, sm: 12, md: 6, lg: 4.5 }}>
                <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems={"center"}>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                      NºMax consensus rounds
                    </Typography>
                    {!unlimited &&
                      <TextField
                        variant="outlined"
                        type="number"
                        size="small"
                        color="secondary"
                        sx={{ width: 60 }}
                        value={unlimited ? "" : consensusMaxPhases}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, ""); // Elimina caracteres no numéricos
                          value = value ? Math.max(1, parseInt(value, 10)) : ""; // Asegura que el valor mínimo sea 1
                          setConsensusMaxPhases(value);
                        }}
                        disabled={unlimited}
                        inputProps={{ min: 1 }} // Previene valores menores a 1 en algunos navegadores
                        onKeyDown={(e) => {
                          if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                            e.preventDefault();
                          }
                        }}
                      />

                    }
                    <ToggleButton
                      value="unlimited"
                      selected={unlimited}
                      onChange={handleUnlimitedChange}
                      color="secondary"
                      size="small"
                    >
                      Unlimited
                    </ToggleButton>
                  </Stack>
                </GlassPaper>
              </Grid>
              
              {/* Consensus threshold */}
              <Grid item size={{ xs: 12, sm: 12, md: 12, lg: 3.5 }}>
                <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems={"center"}>
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                      Consensus threshold:
                    </Typography>

                    <TextField
                      variant="outlined"
                      type="number"
                      size="small"
                      color="secondary"
                      sx={{ width: 90 }}
                      value={consensusThreshold}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (value === "") {
                          setConsensusThreshold("");
                          return;
                        }
                        value = value.replace(/[^0-9.]/g, ""); // Permite solo números y el punto decimal
                        if (value.split(".").length > 2) return; // Evita múltiples puntos decimales
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
                          setConsensusThreshold(value);
                        }
                      }}
                      inputProps={{ min: 0, max: 1, step: 0.1 }} // Limita el rango y permite decimales
                      onKeyDown={(e) => {
                        if (
                          !/[0-9.]/.test(e.key) && // Solo permite números y el punto
                          e.key !== "Backspace" &&
                          e.key !== "ArrowLeft" &&
                          e.key !== "ArrowRight"
                        ) {
                          e.preventDefault();
                        }
                      }}
                    />
                  </Stack>
                </GlassPaper>
              </Grid>
            </>
          }

          {/* Dominios de expresión */}
          <Grid item size={{ xs: 12 }}>
            <GlassPaper variant="outlined" elevation={5} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                Data Types:
              </Typography>
              <TableContainer variant="outlined" component={GlassPaper} sx={{ maxHeight: "45vh" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold" }}>Expert</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Alternative</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Criterion</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Data Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(groupedData).map(([expert, alternatives]) => {
                      const expertRowSpan = Object.values(alternatives).reduce(
                        (sum, criteria) => sum + criteria.length,
                        0
                      );

                      return Object.entries(alternatives).map(([alternative, criteria], altIndex) => {
                        const alternativeRowSpan = criteria.length;

                        return criteria.map(({ criterion, dataType }, critIndex) => (
                          <TableRow key={`${expert}-${alternative}-${criterion}`}>
                            {/* Renderiza la celda del experto solo en la primera fila */}
                            {altIndex === 0 && critIndex === 0 && (
                              <TableCell rowSpan={expertRowSpan}>{expert}</TableCell>
                            )}

                            {/* Renderiza la celda de la alternativa solo en la primera fila de su bloque */}
                            {critIndex === 0 && (
                              <TableCell rowSpan={alternativeRowSpan}>{alternative}</TableCell>
                            )}

                            {/* Cada criterio tiene su propia fila */}
                            <TableCell>{criterion}</TableCell>
                            <TableCell sx={{ color: dataType && dataType.trim() !== "" ? "inherit" : "#f44336" }}>
                              {dataType && dataType.trim() !== "" ? dataType : "Undefined"}
                            </TableCell>
                          </TableRow>
                        ));
                      });
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </GlassPaper>

          </Grid>




        </Grid>


      }
    </GlassPaper >
  );
};