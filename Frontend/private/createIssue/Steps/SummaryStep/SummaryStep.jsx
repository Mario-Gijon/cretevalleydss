import { useEffect, useMemo, useState } from "react";

import { Typography, Stack, Chip, AccordionSummary, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid2 as Grid, Box, TextField, ToggleButton, MenuItem, } from "@mui/material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { CriterionAccordion } from "../../../../src/components/CriterionAccordion/CriterionAccordion";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { getLeafCriteria, getRemainingTime } from "../../../../src/utils/createIssueUtils";
import { GlassAccordion } from "../../../../src/components/StyledComponents/GlassAccordion";
import { GlassPaper } from "../../../../src/components/StyledComponents/GlassPaper";
import 'dayjs/locale/de';
import 'dayjs/locale/en-gb';
import 'dayjs/locale/zh-cn';
import { handleNumberInput } from "../../../../src/utils/handleTwoDecimals";
import { useIssuesDataContext } from "../../../../src/context/issues/issues.context";

dayjs.extend(duration);
dayjs.extend(customParseFormat);

export const SummaryStep = ({ allData, issueName, issueDescription, issueNameError, issueDescriptionError, handleValidateIssueName, handleValidateIssueDescription, closureDate, setClosureDate, closureDateError, handleClosureDateError, consensusMaxPhases, setConsensusMaxPhases, consensusThreshold, setConsensusThreshold, paramValues, setParamValues, defaultModelParams, setDefaultModelParams }) => {

  const { globalDomains, expressionDomains } = useIssuesDataContext()

  const { selectedModel, withConsensus, alternatives, criteria, addedExperts, domainAssignments } = allData;

  const [unlimited, setUnlimited] = useState(consensusMaxPhases === null);

  const handleUnlimitedChange = () => {
    setUnlimited(!unlimited);
    setConsensusMaxPhases(!unlimited ? null : 3);
  };

  // 🔄 Convertimos domainAssignments en un formato tabular más fácil
  const groupedData = useMemo(() => {
    if (!domainAssignments?.experts) return {};

    const data = {};

    Object.entries(domainAssignments.experts).forEach(([expert, expertData]) => {
      data[expert] = {};

      Object.entries(expertData.alternatives).forEach(([alt, altData]) => {
        data[expert][alt] = Object.entries(altData.criteria).map(([criterion, dataType]) => ({
          criterion,
          dataType,
        }));
      });
    });

    return data;
  }, [domainAssignments]);

  // Función para establecer los valores por defecto
  const setDefaults = () => {
    const newValues = {};

    allData.selectedModel.parameters.forEach((param) => {
      const { name, type, restrictions, default: defaultValue } = param;

      if (type === "number") {
        newValues[name] = defaultValue ?? "";
      }

      if (type === "array") {
        const length =
          restrictions?.length === "matchCriteria"
            ? allData.criteria.length
            : restrictions?.length || 2;

        let values;

        if (restrictions?.length === "matchCriteria") {
          const equalWeight = (1 / length);
          values = Array(length).fill(equalWeight);
        } else if (restrictions?.min !== null && restrictions?.max !== null) {
          values = defaultValue ?? [restrictions.min, restrictions.max];
        } else {
          values = defaultValue ?? Array(length).fill("");
        }

        newValues[name] = values;
      }
      if (type === "fuzzyArray") {
        const length =
          restrictions?.length === "matchCriteria"
            ? allData.criteria.length
            : restrictions?.length || 1;

        const delta = 0.05; // tolerancia

        let values;

        if (restrictions?.length === "matchCriteria") {
          const equalWeight = 1 / length;
          values = Array(length).fill(null).map(() => [
            Math.max(0, +(equalWeight - delta).toFixed(2)),
            +equalWeight.toFixed(2),
            Math.min(1, +(equalWeight + delta).toFixed(2))
          ]);
        } else {
          values = defaultValue ?? Array(length).fill([0, 0, 0]);
        }

        newValues[name] = values;
      }

    });

    return newValues;
  };

  // Handler del toggle
  const handleDefaultChange = () => {
    if (!defaultModelParams) {
      // Activar default → poner valores por defecto
      setParamValues(setDefaults());
      setDefaultModelParams(true);
    } else {
      // Desactivar default → mantener valores actuales
      setDefaultModelParams(false);
    }
  };

  useEffect(() => {
    setParamValues((prev) => {
      const newValues = { ...prev };

      allData?.selectedModel?.parameters.forEach((param) => {
        const { name, type, restrictions } = param;

        if (type === "array" && restrictions?.length === "matchCriteria") {
          // recalcular pesos crisp para el número actual de criterios
          const length = allData.criteria.length;
          const equalWeight = 1 / length;

          if (!Array.isArray(newValues[name]) || newValues[name].length !== length) {
            newValues[name] = Array(length).fill(equalWeight);
          }
        }

        if (type === "fuzzyArray" && restrictions?.length === "matchCriteria") {
          // recalcular pesos difusos para el número actual de criterios
          const length = allData.criteria.length;
          const equalWeight = 1 / length;
          const delta = 0.05; // tolerancia

          if (
            !Array.isArray(newValues[name]) ||
            newValues[name].length !== length ||
            newValues[name].some((t) => !Array.isArray(t) || t.length !== 3)
          ) {
            newValues[name] = Array(length).fill(null).map(() => [
              Math.max(0, +(equalWeight - delta).toFixed(2)),
              +equalWeight.toFixed(2),
              Math.min(1, +(equalWeight + delta).toFixed(2)),
            ]);
          }
        }
      });

      return newValues;
    });
  }, [allData.criteria, allData.selectedModel, setParamValues]);

  // 🔗 Construir el mapa id -> nombre de dominio
  const domainNameMap = {};
  [...globalDomains, ...expressionDomains].forEach((d) => {
    domainNameMap[d._id] = d.name;
  });

  console.log(allData)

  const [openCalendar, setOpenCalendar] = useState(false); // Para controlar la apertura del calendario

  return (
    <Stack
      sx={{
        p: { xs: 3, sm: 4, md: 5 },
        flexGrow: 1,
        maxWidth: 1500,
        width: { xs: "95vw", sm: "auto" },
        boxShadow: "0 8px 24px rgba(29, 82, 81, 0.1)",
        borderRadius: 2
      }}>

      {(
        !selectedModel
        || addedExperts.length === 0
        || alternatives.length === 0
        || criteria.length === 0
        || !domainAssignments.experts
        || Object.keys(domainAssignments.experts).length === 0
      ) ? <Typography variant="h5">You must finish previous steps</Typography>

        :
        <Grid container spacing={2}>

          {/* Nombre del problema */}
          <Grid item size={{ xs: 12, md: 5, lg: 4 }}>
            <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexGrow={1} width={"100%"}>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
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
            <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexGrow={1} width={"100%"}>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
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
            <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1}>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  Model:
                </Typography>
                <Typography variant="body2" sx={{ color: "text.primary" }}>
                  {selectedModel.name}
                </Typography>
              </Stack>
            </GlassPaper>
          </Grid>

          {/* Consenso */}
          <Grid item size={{ xs: 12, sm: 6, md: 5 }}>
            <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1}>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  {withConsensus ? "With Consensus" : "Without consensus"}
                </Typography>
              </Stack>
            </GlassPaper>
          </Grid>

          {/* Numeros de expertos en el problema */}
          <Grid item size={{ xs: 12, sm: 12, md: 3 }}>
            <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1}>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
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
            <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: "bold", mb: 1 }}>
                Alternatives:
              </Typography>
              <Stack flexDirection="column" spacing={0} flexWrap={"wrap"}>
                {alternatives.map((alt, index) => (
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
            <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: "bold", mb: 1 }}>
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
            <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: "bold", mb: 1 }}>
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
            <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start" flexGrow={1} width={"100%"}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
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
                <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems={"center"}>
                    <Typography variant="body1" sx={{ fontWeight: "bold" }}>
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
                <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems={"center"}>
                    <Typography variant="body1" sx={{ fontWeight: "bold" }}>
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

          {/* Models params */}
          {selectedModel.parameters.length !== 0 &&
            <Grid item size={{ xs: 12 }}>
              <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction={"row"} spacing={2} sx={{ mb: 2 }} alignItems={"center"}>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    Model parameters:
                  </Typography>

                  <ToggleButton
                    value="unlimited"
                    selected={defaultModelParams}
                    onChange={handleDefaultChange}
                    color="secondary"
                    size="small"
                  >
                    Default
                  </ToggleButton>
                </Stack>

                <Stack gap={3} direction={{ xs: "column", md: "row" }} flexWrap={"wrap"}>
                  {allData.selectedModel.parameters.map((param) => {
                    const { name, type, restrictions, default: defaultValue } = param;

                    // Números con allowed
                    if (type === "number" && restrictions?.allowed) {
                      return (
                        <Stack key={param._id} direction="row" spacing={1} alignItems="center">
                          <Typography variant="body1">{name}:</Typography>
                          <TextField
                            select
                            size="small"
                            value={paramValues[name] ?? defaultValue ?? ""}
                            onChange={(e) => {
                              setParamValues((prev) => ({
                                ...prev,
                                [name]: handleNumberInput(e.target.value),
                              }));
                              if (defaultModelParams) setDefaultModelParams(false);
                            }}
                            inputProps={{ min: 0, max: 1, step: 0.1 }}
                            sx={{ minWidth: 80 }}
                          >
                            {restrictions.allowed.map((val) => (
                              <MenuItem key={val} value={val}>
                                {val}
                              </MenuItem>
                            ))}
                          </TextField>

                        </Stack>
                      );
                    }

                    // Números libres
                    if (type === "number") {
                      return (
                        <Stack key={param._id} direction="row" spacing={1} alignItems="center">
                          <Typography variant="body1">{name}:</Typography>
                          <TextField
                            type="number"
                            size="small"
                            value={paramValues[name] ?? defaultValue ?? ""}
                            onChange={(e) => {
                              setParamValues((prev) => ({
                                ...prev,
                                [name]: handleNumberInput(e.target.value),
                              }));
                              if (defaultModelParams) setDefaultModelParams(false);
                            }}
                            inputProps={{
                              min: restrictions?.min ?? 0,
                              max: restrictions?.max ?? 1,
                              step: 0.1,
                            }}
                            sx={{ maxWidth: 80 }}
                          />
                        </Stack>
                      );
                    }

                    // Array (intervalos o pesos)
                    if (type === "array") {
                      const length =
                        restrictions?.length === "matchCriteria"
                          ? allData.criteria.length
                          : restrictions?.length || 2;

                      const currentValues =
                        paramValues[name] ?? defaultValue ?? Array(length).fill("");

                      const isInterval =
                        restrictions?.min !== null &&
                        restrictions?.max !== null &&
                        !restrictions?.sum &&
                        restrictions?.length !== "matchCriteria";

                      if (isInterval) {
                        return (
                          <Stack key={param._id} spacing={1} direction={"row"} alignItems={"center"}>
                            <Typography variant="body1">{name}:</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="h5">[</Typography>
                              {currentValues.map((val, i) => (
                                <TextField
                                  key={i}
                                  type="number"
                                  size="small"
                                  value={val}
                                  onChange={(e) => {
                                    const newValues = [...currentValues];
                                    newValues[i] = handleNumberInput(e.target.value);
                                    setParamValues((prev) => ({
                                      ...prev,
                                      [name]: newValues,
                                    }));
                                    if (defaultModelParams) setDefaultModelParams(false);
                                  }}
                                  inputProps={{
                                    min: restrictions?.min ?? 0,
                                    max: restrictions?.max ?? 1,
                                    step: 0.1,
                                  }}
                                  sx={{ width: 80 }}
                                />
                              ))}
                              <Typography variant="h5">]</Typography>
                            </Stack>
                          </Stack>
                        );
                      }

                      // Pesos por criterio
                      return (
                        <Stack key={param._id} spacing={1} alignItems={"flex-start"}>
                          <Typography variant="body1" pb={1}>{name}:</Typography>
                          <Stack direction="row" flexWrap="wrap" gap={2}>
                            {currentValues.map((val, i) => (
                              <Stack key={i} spacing={0.5} alignItems="center">
                                <Typography variant="caption">
                                  {allData.criteria[i]?.name ?? `C${i + 1}`}
                                </Typography>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={val}
                                  onChange={(e) => {
                                    const newValues = [...currentValues];
                                    newValues[i] = handleNumberInput(e.target.value);
                                    setParamValues((prev) => ({
                                      ...prev,
                                      [name]: newValues,
                                    }));
                                    if (defaultModelParams) setDefaultModelParams(false);
                                  }}
                                  inputProps={{
                                    min: 0,
                                    max: 1,
                                    step: 0.1,
                                  }}
                                  sx={{ width: 80 }}
                                />
                              </Stack>
                            ))}
                          </Stack>
                          <Typography variant="caption">Must sum 1</Typography>
                        </Stack>
                      );
                    }

                    if (type === "fuzzyArray") {
                      const leafCriteria = getLeafCriteria(allData.criteria);
                      console.log(leafCriteria)
                      const length =
                        restrictions?.length === "matchCriteria"
                          ? leafCriteria.length
                          : restrictions?.length || 1;

                      const currentValues =
                        (paramValues[name] &&
                          Array.isArray(paramValues[name]) &&
                          paramValues[name].length === length
                          ? paramValues[name]
                          : Array.from({ length }, () => ["", "", ""]));

                      const handleFuzzyInput = (value, min = 0, max = 1) => {
                        // Permitir cadenas vacías para que el usuario pueda borrar
                        if (value === "") return "";

                        // Permitir "0." temporalmente
                        if (value === "0." || value === ".") return value;

                        // Convertir a número
                        let num = parseFloat(value);

                        // Si no es número válido, devolver vacío
                        if (isNaN(num)) return "";

                        // Forzar límites
                        if (num < min) num = min;
                        if (num > max) num = max;

                        return num;
                      };

                      return (
                        <Stack key={param._id} spacing={1}>
                          <Typography variant="body1">{name}:</Typography>
                          <Stack direction="row" flexWrap="wrap" gap={2}>
                            {currentValues.map((triple, i) => (
                              <Stack key={i} spacing={0.5} alignItems="center">
                                <Typography variant="caption">
                                  {leafCriteria[i]?.name ?? `C${i + 1}`}
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                  {["l", "m", "u"].map((label, j) => (
                                    <TextField
                                      key={j}
                                      type="number"
                                      size="small"
                                      label={label}
                                      value={triple[j]}
                                      onChange={(e) => {
                                        const newTriples = currentValues.map(t => [...t]); // copia profunda simple
                                        newTriples[i][j] = handleFuzzyInput(
                                          e.target.value,
                                          restrictions?.min ?? 0,
                                          restrictions?.max ?? 1
                                        );
                                        setParamValues((prev) => ({
                                          ...prev,
                                          [name]: newTriples,
                                        }));
                                        if (defaultModelParams) setDefaultModelParams(false);
                                      }}
                                      inputProps={{
                                        min: restrictions?.min ?? 0,
                                        max: restrictions?.max ?? 1,
                                        step: 0.1,
                                      }}
                                      sx={{ width: 80 }}
                                    />
                                  ))}
                                </Stack>
                              </Stack>
                            ))}
                          </Stack>
                        </Stack>
                      );
                    }
                    return null;
                  })}
                </Stack>

              </GlassPaper>
            </Grid>
          }



          {/* Dominios de expresión */}
          <Grid item size={{ xs: 12 }}>
            <GlassPaper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: "bold", mb: 1 }}>
                Data Types:
              </Typography>
              <TableContainer variant="outlined" sx={{ maxHeight: "45vh" }}>
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
                            {altIndex === 0 && critIndex === 0 && <TableCell rowSpan={expertRowSpan}>{expert}</TableCell>}
                            {critIndex === 0 && <TableCell rowSpan={alternativeRowSpan}>{alternative}</TableCell>}
                            <TableCell>{criterion}</TableCell>
                            <TableCell sx={{ color: dataType && dataType.trim() !== "undefined" ? "inherit" : "#f44336", }}>
                              {domainNameMap[dataType] || "undefined"}
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
    </Stack >
  );
};